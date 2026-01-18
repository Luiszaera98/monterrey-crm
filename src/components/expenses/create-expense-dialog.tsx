"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createExpense } from "@/lib/actions/expenseActions";
import { getContacts } from "@/lib/actions/clientActions";
import { uploadFile } from "@/lib/actions/uploadActions";
import { ExpenseCategory } from "@/types";
import { PlusCircle, Loader2, Upload, X, FileText } from "lucide-react";
import Image from "next/image";

interface CreateExpenseDialogProps {
    onSuccess?: () => void;
}

export function CreateExpenseDialog({ onSuccess }: CreateExpenseDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const [contacts, setContacts] = useState<{ id: string; name: string; type: string }[]>([]);

    // File Upload State
    const [attachment, setAttachment] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        category: "Otros" as ExpenseCategory,
        date: new Date().toISOString().split('T')[0],
        supplierName: "",
        invoiceNumber: "",
        status: "Pendiente" as "Pagada" | "Pendiente",
        paymentMethod: "Efectivo",
        notes: ""
    });

    useEffect(() => {
        if (open) {
            loadContacts();
        }
    }, [open]);

    const loadContacts = async () => {
        try {
            const data = await getContacts();
            setContacts(data);
        } catch (error) {
            console.error("Failed to load contacts", error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleContactSelect = (value: string) => {
        // Value is contact ID, allow finding the name
        // However, Select value is usually the ID.
        // We want to fill supplierName with the Name.
        // Or we can store the ID if we wanted, but the backend expects a name string for 'supplier'.

        // Let's assume value passed from SelectItem is the name directly for simplicity in this specific "Fill Input" use case
        // OR we find the contact by ID if value is ID.

        // Implementation: Select value will be the contact NAME.
        setFormData(prev => ({ ...prev, supplierName: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const data = new FormData();
        data.append('file', file);

        try {
            const result = await uploadFile(data);
            if (result.success && result.url) {
                setAttachment(result.url);
                toast({ title: "Archivo adjuntado correctamente" });
            } else {
                toast({ title: "Error al subir archivo", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error inesperado al subir", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAttachment = () => {
        setAttachment(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await createExpense({
                description: formData.description,
                amount: parseFloat(formData.amount),
                category: formData.category,
                date: formData.date,
                supplierName: formData.supplierName,
                invoiceNumber: formData.invoiceNumber,
                status: formData.status,
                paymentMethod: formData.paymentMethod as any,
                notes: formData.notes,
                attachments: attachment ? [attachment] : []
            });

            if (result.success) {
                toast({
                    title: "Gasto registrado",
                    description: "El gasto se ha guardado correctamente.",
                });
                setOpen(false);
                setFormData({
                    description: "",
                    amount: "",
                    category: "Otros",
                    date: new Date().toISOString().split('T')[0],
                    supplierName: "",
                    invoiceNumber: "",
                    status: "Pendiente",
                    paymentMethod: "Efectivo",
                    notes: ""
                });
                setAttachment(null);
                if (onSuccess) onSuccess();
            } else {
                toast({
                    title: "Error",
                    description: result.message || "No se pudo registrar el gasto.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Ocurrió un error inesperado.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <PlusCircle className="mr-2 h-5 w-5" /> Registrar Gasto
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
                    <DialogDescription>
                        Ingrese los detalles del gasto o pago a realizar.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Input
                                id="description"
                                name="description"
                                placeholder="Ej: Pago de luz, Compra de carne..."
                                value={formData.description}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                    id="amount"
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="pl-7"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Fecha</Label>
                            <Input
                                id="date"
                                name="date"
                                type="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Categoría</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => handleSelectChange("category", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Materia Prima">Materia Prima</SelectItem>
                                    <SelectItem value="Servicios">Servicios</SelectItem>
                                    <SelectItem value="Nómina">Nómina</SelectItem>
                                    <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                                    <SelectItem value="Impuestos">Impuestos</SelectItem>
                                    <SelectItem value="Préstamos">Préstamos</SelectItem>
                                    <SelectItem value="Otros">Otros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Estado</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val) => handleSelectChange("status", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pagada">Pagada</SelectItem>
                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="supplierName">Proveedor / Beneficiario (Opcional)</Label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input
                                        id="supplierName"
                                        name="supplierName"
                                        placeholder="Nombre del proveedor o persona"
                                        value={formData.supplierName}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="w-1/3">
                                    <Select onValueChange={handleContactSelect}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Buscar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {contacts.map((contact) => (
                                                <SelectItem key={contact.id} value={contact.name}>
                                                    {contact.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Seleccione un contacto para autocompletar o escriba manualmente.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invoiceNumber">No. Factura (Opcional)</Label>
                            <Input
                                id="invoiceNumber"
                                name="invoiceNumber"
                                placeholder="Ej: B0100000..."
                                value={formData.invoiceNumber}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="paymentMethod">Método de Pago</Label>
                            <Select
                                value={formData.paymentMethod}
                                onValueChange={(val) => handleSelectChange("paymentMethod", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* File Attachment Section */}
                        <div className="space-y-2 col-span-2">
                            <Label>Comprobante o Archivo (Opcional)</Label>
                            {!attachment ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleFileChange}
                                        disabled={isUploading}
                                        className="cursor-pointer"
                                    />
                                    {isUploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-2 border rounded-md bg-slate-50">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="h-10 w-10 relative flex-shrink-0 bg-slate-200 rounded overflow-hidden flex items-center justify-center">
                                            {attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                <Image
                                                    src={attachment}
                                                    alt="Preview"
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <FileText className="h-6 w-6 text-slate-500" />
                                            )}
                                        </div>
                                        <span className="text-sm text-slate-600 truncate max-w-[200px]">
                                            Adjunto cargado
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleRemoveAttachment}
                                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="notes">Notas Adicionales</Label>
                            <Textarea
                                id="notes"
                                name="notes"
                                placeholder="Detalles adicionales..."
                                value={formData.notes}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading || isUploading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Gasto
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
