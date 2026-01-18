"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Receipt, Wallet, MoreHorizontal, DollarSign, Trash2, Edit, Calendar } from 'lucide-react';
import { getExpenses, deleteExpenseAction } from '@/lib/actions/expenseActions';
import { Expense, ExpenseCategory } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateExpenseDialog } from '@/components/expenses/create-expense-dialog';
import { PayExpenseDialog } from '@/components/expenses/pay-expense-dialog';
import { EditExpenseDialog } from '@/components/expenses/edit-expense-dialog';
import { RecurringExpensesList } from '@/components/expenses/recurring-expenses-list';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MonthPicker } from "@/components/ui/month-picker";

export default function ExpensesPage() {
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'Todos'>('Todos');

    // Dialog states
    const [payExpense, setPayExpense] = useState<Expense | null>(null);
    const [editExpense, setEditExpense] = useState<Expense | null>(null);
    const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);

    const { toast } = useToast();

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

    useEffect(() => {
        fetchExpenses();
    }, [selectedMonth, selectedYear]);

    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            const offset = new Date().getTimezoneOffset();
            const data = await getExpenses(selectedMonth, selectedYear, offset);
            setExpenses(data);
        } catch (error) {
            console.error("Failed to fetch expenses", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteExpense) return;

        const result = await deleteExpenseAction(deleteExpense.id);

        if (result.success) {
            toast({
                title: "Éxito",
                description: "Gasto eliminado correctamente",
            });
            fetchExpenses();
        } else {
            toast({
                title: "Error",
                description: result.message || "No se pudo eliminar el gasto",
                variant: "destructive",
            });
        }
        setDeleteExpense(null);
    };

    const filteredExpenses = expenses.filter(expense =>
        (expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (expense.supplierName && expense.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (expense.invoiceNumber && expense.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        (categoryFilter === 'Todos' || expense.category === categoryFilter)
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pagada': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">Pagada</Badge>;
            case 'Parcial': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400">Parcial</Badge>;
            default: return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400">Pendiente</Badge>;
        }
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
            <Tabs defaultValue="list" className="w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Gastos</h1>
                        <p className="text-slate-500 mt-1">Gestione los gastos y salidas de efectivo.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Month/Year Filter */}
                        <MonthPicker
                            currentMonth={selectedMonth}
                            currentYear={selectedYear}
                            onMonthChange={setSelectedMonth}
                            onYearChange={setSelectedYear}
                        />

                        <TabsList className="bg-slate-100">
                            <TabsTrigger value="list" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Listado</TabsTrigger>
                            <TabsTrigger value="recurring" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Recurrentes</TabsTrigger>
                        </TabsList>
                    </div>
                </div>

                <TabsContent value="list" className="space-y-6">
                    <div className="flex justify-end">
                        <CreateExpenseDialog onSuccess={fetchExpenses} />
                    </div>

                    <Card className="border-slate-100 shadow-sm bg-white">
                        <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <div className="relative w-full sm:max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por descripción, proveedor o factura..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 border-slate-200 focus:border-slate-400"
                                    />
                                </div>
                                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as ExpenseCategory | 'Todos')}>
                                    <SelectTrigger className="w-full sm:w-[200px] border-slate-200">
                                        <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder="Categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todas</SelectItem>
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
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow className="border-slate-100">
                                            <TableHead className="text-slate-500 font-medium">Descripción</TableHead>
                                            <TableHead className="text-slate-500 font-medium">Proveedor</TableHead>
                                            <TableHead className="text-slate-500 font-medium">Factura</TableHead>
                                            <TableHead className="text-slate-500 font-medium">Categoría</TableHead>
                                            <TableHead className="text-slate-500 font-medium">Fecha</TableHead>
                                            <TableHead className="text-right text-slate-500 font-medium">Total</TableHead>
                                            <TableHead className="text-right text-slate-500 font-medium">Pagado</TableHead>
                                            <TableHead className="text-right text-slate-500 font-medium">Pendiente</TableHead>
                                            <TableHead className="text-right text-slate-500 font-medium">Estado</TableHead>
                                            <TableHead className="text-right text-slate-500 font-medium">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredExpenses.length > 0 ? (
                                            filteredExpenses.map((expense) => {
                                                const pendingAmount = expense.amount - (expense.paidAmount || 0);
                                                return (
                                                    <TableRow key={expense.id} className="hover:bg-slate-50/50 border-slate-100">
                                                        <TableCell className="font-medium text-slate-700">{expense.description}</TableCell>
                                                        <TableCell className="text-slate-600">{expense.supplierName || '-'}</TableCell>
                                                        <TableCell className="font-mono text-xs text-slate-500">
                                                            {expense.invoiceNumber || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="border-slate-200 text-slate-600">{expense.category}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-slate-500 text-sm">
                                                            {format(new Date(expense.date), 'dd MMM yyyy', { locale: es })}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-slate-700">
                                                            ${expense.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell className="text-right text-slate-500">
                                                            ${(expense.paidAmount || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell className={`text-right font-medium ${pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            ${pendingAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {getStatusBadge(expense.status)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => setEditExpense(expense)}
                                                                    >
                                                                        <Edit className="h-4 w-4 mr-2" />
                                                                        Editar
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => setPayExpense(expense)}
                                                                        disabled={expense.status === 'Pagada'}
                                                                    >
                                                                        <DollarSign className="h-4 w-4 mr-2" />
                                                                        Registrar Pago
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => setDeleteExpense(expense)}
                                                                        className="text-destructive focus:text-destructive"
                                                                    >
                                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                                        Eliminar
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={10} className="h-32 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                                        <Receipt className="h-10 w-10 mb-2 opacity-20" />
                                                        <p>No se encontraron gastos.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="recurring">
                    <RecurringExpensesList />
                </TabsContent>
            </Tabs>

            <PayExpenseDialog
                expense={payExpense}
                open={!!payExpense}
                onOpenChange={(open) => !open && setPayExpense(null)}
                onSuccess={fetchExpenses}
            />

            <EditExpenseDialog
                expense={editExpense}
                open={!!editExpense}
                onOpenChange={(open) => !open && setEditExpense(null)}
                onSuccess={fetchExpenses}
            />

            <AlertDialog open={!!deleteExpense} onOpenChange={(open) => !open && setDeleteExpense(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Gasto?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Está seguro que desea eliminar el gasto <strong>{deleteExpense?.description}</strong>?
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
