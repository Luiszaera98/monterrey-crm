"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, DollarSign, Download, ArrowDownLeft, ArrowUpRight, FileText, Calendar, Pencil, MoreHorizontal, Trash } from 'lucide-react';
import { getAllPayments, deletePayment } from '@/lib/actions/paymentActions';
import { getExpenses } from '@/lib/actions/expenseActions';
import { Payment, CreditNote, Expense } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonthPicker } from '@/components/ui/month-picker';
import { EditPaymentDialog } from '@/components/payments/edit-payment-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from "@/hooks/use-toast";

type Transaction =
    | (Payment & { type: 'payment' })
    | (CreditNote & { type: 'creditNote' })
    | (Expense & { type: 'expense' });

export default function TransactionsHistoryPage() {
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

    // Edit Dialog State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

    // Delete Confirmation State
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const [paymentsData, expensesData] = await Promise.all([
                getAllPayments(),
                getExpenses()
            ]);

            const combined: Transaction[] = [
                ...paymentsData.map(p => ({ ...p, type: 'payment' as const })),
                // Credit Notes removed from this view
                ...expensesData.map(e => ({
                    ...e,
                    type: 'expense' as const,
                    amount: e.amount // Use full amount regardless of payment status
                }))
            ];

            // Sort by date descending
            combined.sort((a, b) => {
                const dateA = new Date(a.type === 'payment' ? a.paymentDate : a.date);
                const dateB = new Date(b.type === 'payment' ? b.paymentDate : b.date);
                return dateB.getTime() - dateA.getTime();
            });

            setTransactions(combined);
        } catch (error) {
            console.error("Failed to fetch transactions", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditPayment = (payment: Payment) => {
        setSelectedPayment(payment);
        setIsEditDialogOpen(true);
    };

    const confirmDeletePayment = (payment: Payment) => {
        setPaymentToDelete(payment);
    };

    const handleDeletePayment = async () => {
        if (!paymentToDelete) return;

        try {
            const result = await deletePayment(paymentToDelete.id);
            if (result.success) {
                toast({
                    title: "Pago eliminado",
                    description: "El pago se ha eliminado correctamente del sistema.",
                });
                fetchTransactions();
            } else {
                toast({
                    title: "Error",
                    description: result.message || "No se pudo eliminar el pago",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Ocurrió un error inesperado al eliminar el pago",
                variant: "destructive",
            });
        } finally {
            setPaymentToDelete(null);
        }
    };

    const filteredTransactions = transactions.filter(t => {
        // Date Filter
        const tDate = new Date(t.type === 'payment' ? t.paymentDate : t.date);
        const matchesDate = tDate.getMonth() === parseInt(selectedMonth) &&
            tDate.getFullYear() === parseInt(selectedYear);

        if (!matchesDate) return false;

        const searchLower = searchTerm.toLowerCase();
        if (t.type === 'payment') {
            return t.invoiceNumber.toLowerCase().includes(searchLower) ||
                t.paymentMethod.toLowerCase().includes(searchLower) ||
                (t.reference && t.reference.toLowerCase().includes(searchLower));
        } else if (t.type === 'creditNote') {
            return t.ncf.toLowerCase().includes(searchLower) ||
                t.originalInvoiceNumber.toLowerCase().includes(searchLower) ||
                t.clientName.toLowerCase().includes(searchLower);
        } else {
            // Expense
            return t.description.toLowerCase().includes(searchLower) ||
                (t.supplierName && t.supplierName.toLowerCase().includes(searchLower)) ||
                t.category.toLowerCase().includes(searchLower);
        }
    });

    const months = [
        { value: "0", label: "Enero" },
        { value: "1", label: "Febrero" },
        { value: "2", label: "Marzo" },
        { value: "3", label: "Abril" },
        { value: "4", label: "Mayo" },
        { value: "5", label: "Junio" },
        { value: "6", label: "Julio" },
        { value: "7", label: "Agosto" },
        { value: "8", label: "Septiembre" },
        { value: "9", label: "Octubre" },
        { value: "10", label: "Noviembre" },
        { value: "11", label: "Diciembre" },
    ];

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

    const totalRevenue = filteredTransactions
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + (t as Payment).amount, 0);

    const totalExpenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t as Expense).amount, 0);



    const netCashFlow = totalRevenue - totalExpenses;

    const getPaymentMethodBadge = (method: string) => {
        const colors = {
            'Efectivo': 'bg-emerald-100 text-emerald-800 border-emerald-200',
            'Transferencia': 'bg-blue-100 text-blue-800 border-blue-200',
            'Cheque': 'bg-purple-100 text-purple-800 border-purple-200',
            'Tarjeta': 'bg-orange-100 text-orange-800 border-orange-200',
        };

        return (
            <Badge variant="outline" className={colors[method as keyof typeof colors] || 'bg-slate-100 text-slate-800 border-slate-200'}>
                {method}
            </Badge>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 bg-slate-50/50 min-h-screen rounded-xl">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">Historial de Transacciones</h1>
                    <p className="text-slate-500 mt-1">
                        Flujo de caja completo: Ingresos, Gastos y Ajustes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <MonthPicker
                        currentMonth={selectedMonth}
                        currentYear={selectedYear}
                        onMonthChange={setSelectedMonth}
                        onYearChange={setSelectedYear}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-slate-100 shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Flujo de Caja Neto</CardTitle>
                        <DollarSign className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                            ${netCashFlow.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Ingresos - Gastos
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Ingresos</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            ${totalRevenue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {filteredTransactions.filter(t => t.type === 'payment').length} pagos recibidos
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Gastos</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600">
                            ${totalExpenses.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {filteredTransactions.filter(t => t.type === 'expense').length} gastos pagados
                        </p>
                    </CardContent>
                </Card>


            </div>

            {/* Transactions Table */}
            <Card className="border-slate-100 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <CardTitle className="text-lg font-semibold text-slate-800">Movimientos</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    type="search"
                                    placeholder="Buscar..."
                                    className="pl-8 border-slate-200 focus:border-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50">
                                <Download className="h-4 w-4 mr-2" />
                                Exportar
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-none border-0">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-slate-100">
                                    <TableHead className="text-slate-500 font-medium">Fecha</TableHead>
                                    <TableHead className="text-slate-500 font-medium">Tipo</TableHead>
                                    <TableHead className="text-slate-500 font-medium">Descripción / Referencia</TableHead>
                                    <TableHead className="text-slate-500 font-medium">Categoría / Método</TableHead>
                                    <TableHead className="text-right text-slate-500 font-medium">Monto</TableHead>
                                    <TableHead className="text-slate-500 font-medium">Notas</TableHead>
                                    <TableHead className="text-right text-slate-500 font-medium w-[80px]">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((t) => {
                                        let date, amount, badge, description, category;
                                        const isEditable = t.type === 'payment';

                                        if (t.type === 'payment') {
                                            date = t.paymentDate;
                                            amount = t.amount;
                                            badge = <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Ingreso</Badge>;
                                            description = <span className="text-slate-700">Factura {t.invoiceNumber} <span className="text-slate-500">{t.reference ? `(${t.reference})` : ''}</span></span>;
                                            category = getPaymentMethodBadge(t.paymentMethod);
                                        } else if (t.type === 'expense') {
                                            date = t.date;
                                            amount = t.amount;
                                            badge = <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Gasto</Badge>;
                                            description = <span className="text-slate-700">{t.description} <span className="text-slate-500">{t.supplierName ? ` - ${t.supplierName}` : ''}</span></span>;
                                            category = <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">{t.category}</Badge>;
                                        } else {
                                            date = t.date;
                                            amount = t.total;
                                            badge = <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Nota Crédito</Badge>;
                                            description = <span className="text-slate-700">NCF: {t.ncf} <span className="text-slate-500">(Ref: {t.originalInvoiceNumber})</span></span>;
                                            category = <span className="text-sm text-slate-500">{t.reason}</span>;
                                        }

                                        return (
                                            <TableRow key={`${t.type}-${t.id}`} className="hover:bg-slate-50/50 border-slate-100 text-sm">
                                                <TableCell className="text-slate-500">
                                                    {format(new Date(date), 'dd MMM yyyy', { locale: es })}
                                                </TableCell>
                                                <TableCell>{badge}</TableCell>
                                                <TableCell className="font-medium">
                                                    {description}
                                                </TableCell>
                                                <TableCell>
                                                    {category}
                                                </TableCell>
                                                <TableCell className={`text-right font-bold ${t.type === 'payment' ? 'text-emerald-600' :
                                                    t.type === 'expense' ? 'text-rose-600' : 'text-amber-600'
                                                    }`}>
                                                    {t.type === 'payment' ? '+' : '-'}${amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-slate-500 max-w-xs truncate">
                                                    {t.notes || '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {isEditable && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">Abrir menú</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleEditPayment(t as Payment)}>
                                                                    <Pencil className="nr-2 h-4 w-4" />
                                                                    <span>Editar</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => confirmDeletePayment(t as Payment)}
                                                                    className="text-red-600 focus:text-red-600"
                                                                >
                                                                    <Trash className="mr-2 h-4 w-4" />
                                                                    <span>Eliminar</span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                                <FileText className="h-8 w-8 opacity-20" />
                                                <p>No se encontraron movimientos</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <EditPaymentDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                payment={selectedPayment}
                onSuccess={fetchTransactions}
            />

            <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará el pago de ${paymentToDelete?.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })} y se actualizará el saldo de la factura {paymentToDelete?.invoiceNumber}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePayment} className="bg-red-600 hover:bg-red-700">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
