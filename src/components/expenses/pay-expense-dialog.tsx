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
import { useToast } from "@/hooks/use-toast";
import { registerExpensePayment } from "@/lib/actions/expenseActions";
import { Expense } from "@/types";
import { Loader2 } from "lucide-react";

interface PayExpenseDialogProps {
    expense: Expense | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function PayExpenseDialog({ expense, open, onOpenChange, onSuccess }: PayExpenseDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        amount: "",
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: "Efectivo",
    });

    useEffect(() => {
        if (open && expense) {
            const pendingAmount = expense.amount - (expense.paidAmount || 0);
            setFormData({
                amount: pendingAmount > 0 ? pendingAmount.toFixed(2) : "0.00",
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod: "Efectivo",
            });
        }
    }, [open, expense]);

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expense) return;

        setIsLoading(true);

        try {
            const amountToPay = parseFloat(formData.amount);
            if (isNaN(amountToPay) || amountToPay <= 0) {
                toast({
                    title: "Error",
                    description: "Ingrese un monto válido mayor a 0.",
                    variant: "destructive",
                });
                setIsLoading(false);
                return;
            }

            const result = await registerExpensePayment(
                expense.id,
                amountToPay,
                formData.paymentMethod,
                formData.paymentDate
            );

            if (result.success) {
                toast({
                    title: "Pago registrado",
                    description: "El pago se ha registrado correctamente.",
                });
                onSuccess();
                onOpenChange(false);
            } else {
                toast({
                    title: "Error",
                    description: result.message || "No se pudo registrar el pago.",
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

    if (!expense) return null;

    const paidAmount = expense.paidAmount || 0;
    const pendingAmount = expense.amount - paidAmount;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Registrar Pago de Gasto</DialogTitle>
                    <DialogDescription>
                        Registrar un pago para: <strong>{expense.description}</strong>
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4">
                        <div className="bg-muted p-2 rounded">
                            <div className="text-muted-foreground">Total</div>
                            <div className="font-bold">${expense.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-green-50 text-green-700 p-2 rounded">
                            <div className="opacity-80">Pagado</div>
                            <div className="font-bold">${paidAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-red-50 text-red-700 p-2 rounded">
                            <div className="opacity-80">Pendiente</div>
                            <div className="font-bold">${pendingAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto a Pagar</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                    id="amount"
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={pendingAmount + 0.01} // Allow slight tolerance
                                    className="pl-7 font-bold text-lg"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paymentDate">Fecha de Pago</Label>
                            <Input
                                id="paymentDate"
                                name="paymentDate"
                                type="date"
                                value={formData.paymentDate}
                                onChange={handleChange}
                                required
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
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar Pago
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
