"use server";

import dbConnect from '@/lib/db';
import { Expense as ExpenseModel, RecurringExpense as RecurringExpenseModel } from '@/models';
import { Expense, RecurringExpense } from '@/types';
import { revalidatePath } from 'next/cache';
import { addWeeks, addMonths, addYears, isBefore, setDate } from 'date-fns';

// Helper to convert MongoDB document to Expense type
function mapExpense(doc: any): Expense {
    return {
        id: doc._id.toString(),
        description: doc.description,
        amount: doc.amount,
        date: doc.date.toISOString(),
        category: doc.category,
        supplierName: doc.supplier,
        invoiceNumber: doc.invoiceNumber,
        paymentMethod: doc.paymentMethod,
        reference: doc.reference,
        status: doc.status,
        paidAmount: doc.paidAmount || 0,
        lastPaymentDate: doc.lastPaymentDate ? doc.lastPaymentDate.toISOString() : undefined,
        notes: doc.notes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

// Helper to convert MongoDB document to RecurringExpense type
function mapRecurringExpense(doc: any): RecurringExpense {
    return {
        id: doc._id.toString(),
        description: doc.description,
        category: doc.category,
        amount: doc.amount,
        supplier: doc.supplier,
        frequency: doc.frequency,
        dayOfMonth: doc.dayOfMonth,
        nextRun: doc.nextRun.toISOString(),
        active: doc.active,
        lastGenerated: doc.lastGenerated?.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

export async function checkAndGenerateRecurringExpenses(): Promise<void> {
    await dbConnect();
    const now = new Date();

    try {
        // Find active recurring expenses due for generation
        const dueExpenses = await RecurringExpenseModel.find({
            active: true,
            nextRun: { $lte: now }
        });

        for (const recurring of dueExpenses) {
            // Create the expense
            await ExpenseModel.create({
                description: recurring.description,
                category: recurring.category,
                amount: recurring.amount,
                date: now,
                supplier: recurring.supplier,
                paymentMethod: 'Efectivo', // Default
                status: 'Pendiente',
                paidAmount: 0,
                notes: `Generado automáticamente - Recurrente: ${recurring.frequency}`
            });

            // Calculate next run
            let nextDate = new Date(recurring.nextRun);

            // Advance one cycle
            switch (recurring.frequency) {
                case 'Semanal': nextDate = addWeeks(nextDate, 1); break;
                case 'Quincenal': nextDate = addWeeks(nextDate, 2); break;
                case 'Mensual': nextDate = addMonths(nextDate, 1); break;
                case 'Anual': nextDate = addYears(nextDate, 1); break;
            }

            // Catch up logic: if nextDate is still in the past (missed multiple cycles), reset to future
            if (isBefore(nextDate, now)) {
                nextDate = new Date();
                switch (recurring.frequency) {
                    case 'Semanal': nextDate = addWeeks(nextDate, 1); break;
                    case 'Quincenal': nextDate = addWeeks(nextDate, 2); break;
                    case 'Mensual': nextDate = addMonths(nextDate, 1); break;
                    case 'Anual': nextDate = addYears(nextDate, 1); break;
                }
                // If dayOfMonth is set for Monthly, try to respect it
                if (recurring.frequency === 'Mensual' && recurring.dayOfMonth) {
                    const targetDay = recurring.dayOfMonth;
                    nextDate = setDate(nextDate, targetDay);
                    // If setting the day puts us back in the past (e.g. today is 15th, target is 5th), move to next month
                    if (isBefore(nextDate, now)) {
                        nextDate = addMonths(nextDate, 1);
                    }
                }
            }

            await RecurringExpenseModel.findByIdAndUpdate(recurring._id, {
                nextRun: nextDate,
                lastGenerated: now
            });
        }

        if (dueExpenses.length > 0) {
            revalidatePath('/expenses');
        }
    } catch (error) {
        console.error("Error generating recurring expenses:", error);
    }
}

export async function getExpenses(month?: string, year?: string, timezoneOffset?: number): Promise<Expense[]> {
    await dbConnect();
    // Check for recurring expenses generation on load
    await checkAndGenerateRecurringExpenses();

    try {
        let query: any = {};
        if (month && year) {
            const offsetMs = (timezoneOffset || 0) * 60 * 1000;

            // Start of month in UTC
            const startUTC = Date.UTC(parseInt(year), parseInt(month), 1);
            const startDate = new Date(startUTC + offsetMs);

            // End of month in UTC
            const endUTC = Date.UTC(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59, 999);
            const endDate = new Date(endUTC + offsetMs);

            query.date = { $gte: startDate, $lte: endDate };
        }

        const expenses = await ExpenseModel.find(query).sort({ date: -1 }).lean();
        return expenses.map(mapExpense);
    } catch (error) {
        console.error("Error fetching expenses:", error);
        return [];
    }
}

export async function createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; expense?: Expense; message?: string }> {
    await dbConnect();
    try {
        const paidAmount = data.status === 'Pagada' ? data.amount : (data.paidAmount || 0);

        const newExpense = await ExpenseModel.create({
            description: data.description,
            category: data.category,
            amount: data.amount,
            date: data.date,
            supplier: data.supplierName,
            invoiceNumber: data.invoiceNumber,
            paymentMethod: data.paymentMethod || 'Efectivo',
            reference: data.reference,
            status: data.status,
            paidAmount: paidAmount,
            notes: data.notes
        });

        revalidatePath('/expenses');
        return { success: true, expense: mapExpense(newExpense) };
    } catch (error: any) {
        console.error("Error creating expense:", error);
        return { success: false, message: error.message || "Error al crear gasto" };
    }
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<{ success: boolean; expense?: Expense; message?: string }> {
    await dbConnect();
    try {
        const updateData: any = {
            description: data.description,
            category: data.category,
            amount: data.amount,
            date: data.date,
            supplier: data.supplierName,
            invoiceNumber: data.invoiceNumber,
            paymentMethod: data.paymentMethod,
            reference: data.reference,
            status: data.status,
            paidAmount: data.paidAmount,
            notes: data.notes
        };

        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const updatedExpense = await ExpenseModel.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedExpense) {
            return { success: false, message: "Gasto no encontrado" };
        }

        revalidatePath('/expenses');
        return { success: true, expense: mapExpense(updatedExpense) };
    } catch (error: any) {
        console.error("Error updating expense:", error);
        return { success: false, message: error.message || "Error al actualizar gasto" };
    }
}

export async function registerExpensePayment(id: string, amount: number, paymentMethod: string, date: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const expense = await ExpenseModel.findById(id);
        if (!expense) {
            return { success: false, message: "Gasto no encontrado" };
        }

        const newPaidAmount = (expense.paidAmount || 0) + amount;
        let newStatus = expense.status;

        if (newPaidAmount >= expense.amount - 0.01) {
            newStatus = 'Pagada';
        } else if (newPaidAmount > 0) {
            newStatus = 'Parcial';
        }

        await ExpenseModel.findByIdAndUpdate(id, {
            paidAmount: newPaidAmount,
            status: newStatus,
            paymentMethod: paymentMethod,
            lastPaymentDate: new Date(date),
        });

        revalidatePath('/expenses');
        return { success: true };
    } catch (error: any) {
        console.error("Error registering expense payment:", error);
        return { success: false, message: error.message || "Error al registrar pago" };
    }
}

export async function deleteExpenseAction(id: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const result = await ExpenseModel.findByIdAndDelete(id);
        if (!result) {
            return { success: false, message: "Gasto no encontrado" };
        }
        revalidatePath('/expenses');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting expense:", error);
        return { success: false, message: error.message || "Error al eliminar gasto" };
    }
}

// ==================== RECURRING EXPENSE ACTIONS ====================

export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
    await dbConnect();
    try {
        const expenses = await RecurringExpenseModel.find({}).sort({ createdAt: -1 }).lean();
        return expenses.map(mapRecurringExpense);
    } catch (error) {
        console.error("Error fetching recurring expenses:", error);
        return [];
    }
}

export async function createRecurringExpense(data: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt' | 'lastGenerated'>): Promise<{ success: boolean; expense?: RecurringExpense; message?: string }> {
    await dbConnect();
    try {
        const newExpense = await RecurringExpenseModel.create({
            description: data.description,
            category: data.category,
            amount: data.amount,
            supplier: data.supplier,
            frequency: data.frequency,
            dayOfMonth: data.dayOfMonth,
            nextRun: data.nextRun,
            active: data.active
        });

        revalidatePath('/expenses');
        return { success: true, expense: mapRecurringExpense(newExpense) };
    } catch (error: any) {
        console.error("Error creating recurring expense:", error);
        return { success: false, message: error.message || "Error al crear gasto recurrente" };
    }
}

export async function toggleRecurringExpense(id: string, active: boolean): Promise<{ success: boolean }> {
    await dbConnect();
    try {
        await RecurringExpenseModel.findByIdAndUpdate(id, { active });
        revalidatePath('/expenses');
        return { success: true };
    } catch (error) {
        console.error("Error toggling recurring expense:", error);
        return { success: false };
    }
}

export async function deleteRecurringExpense(id: string): Promise<{ success: boolean }> {
    await dbConnect();
    try {
        await RecurringExpenseModel.findByIdAndDelete(id);
        revalidatePath('/expenses');
        return { success: true };
    } catch (error) {
        console.error("Error deleting recurring expense:", error);
        return { success: false };
    }
}
