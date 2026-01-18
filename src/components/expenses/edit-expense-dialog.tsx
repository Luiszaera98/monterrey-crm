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
import { updateExpense } from "@/lib/actions/expenseActions";
import { getContacts } from "@/lib/actions/clientActions";
import { uploadFile } from "@/lib/actions/uploadActions";
import { ExpenseCategory, Expense } from "@/types";
import { Loader2, Upload, X, FileText } from "lucide-react";
import Image from "next/image";

interface EditExpenseDialogProps {
    expense: Expense | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditExpenseDialog({ expense, open, onOpenChange, onSuccess }: EditExpenseDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Contacts for supplier selection
    const [contacts, setContacts] = useState<{ id: string; name: string; type: string }[]>([]);

    // File Upload State
    // We handle attachments as an array of strings, but for now we'll mostly focus on adding/viewing
    // If the expense already has attachments, we show them.
    // For simplicity in this iteration, we'll assume replacing or adding new ones?
    // Let's assume we can add one if none, or replace?
    // The previous implementation used strings[] array.
    const [attachment, setAttachment] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        category: "Otros" as ExpenseCategory,
        date: "",
        supplierName: "",
        invoiceNumber: "",
        status: "Pendiente" as "Pagada" | "Pendiente" | "Parcial",
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

    useEffect(() => {
        if (expense) {
            // Extract date part YYYY-MM-DD
            let dateStr = "";
            if (expense.date) {
                const d = new Date(expense.date);
                if (!isNaN(d.getTime())) {
                    dateStr = d.toISOString().split('T')[0];
                }
            }

            setFormData({
                description: expense.description || "",
                amount: expense.amount.toString(),
                category: expense.category,
                date: dateStr,
                supplierName: expense.supplierName || "",
                invoiceNumber: expense.invoiceNumber || "",
                status: expense.status || "Pendiente",
                paymentMethod: expense.paymentMethod || "Efectivo",
                notes: expense.notes || ""
            });

            // Set existing attachment if any
            if (expense.attachments && expense.attachments.length > 0) {
                setAttachment(expense.attachments[0]);
            } else {
                setAttachment(null);
            }
        }
    }, [expense]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleContactSelect = (value: string) => {
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
        if (!expense) return;

        setIsLoading(true);

        try {
            const result = await updateExpense(expense.id, {
                description: formData.description,
                amount: parseFloat(formData.amount),
                category: formData.category,
                date: formData.date,
                supplierName: formData.supplierName,
                invoiceNumber: formData.invoiceNumber,
                status: formData.status as any, // 'Parcial' might be in form data but limited by Select if not careful
                paymentMethod: formData.paymentMethod,
                notes: formData.notes,
                attachments: attachment ? [attachment] : [] // Overwrite/Update attachments
            });

            if (result.success) {
                toast({
                    title: "Gasto actualizado",
                    description: "Los cambios se han guardado correctamente.",
                });
                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else {
                toast({
                    title: "Error",
                    description: result.message || "No se pudo actualizar el gasto.",
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Gasto</DialogTitle>
                    <DialogDescription>
                        Modifique los detalles del gasto.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Input
                                id="description"
                                name="description"
                                placeholder="Ej: Pago de luz..."
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
                                    <SelectItem value="Parcial">Parcial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="supplierName">Proveedor / Beneficiario</Label>
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
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invoiceNumber">No. Factura</Label>
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
                            <Label>Comprobante o Archivo</Label>
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
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading || isUploading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
