"use server";

import dbConnect from '@/lib/db';
import { Payment as PaymentModel, CreditNote as CreditNoteModel, Invoice as InvoiceModel, Product as ProductModel } from '@/models';
import { Payment, CreditNote } from '@/types';
import { revalidatePath } from 'next/cache';
import { updateInvoicePaymentStatus, addCreditNoteToInvoice, fixInvoiceBalances } from './invoiceActions';

// Helper to convert MongoDB document to Payment type
function mapPayment(doc: any): Payment {
    return {
        id: doc._id.toString(),
        invoiceId: doc.invoiceId,
        invoiceNumber: doc.invoiceNumber,
        amount: doc.amount,
        paymentMethod: doc.paymentMethod,
        paymentDate: doc.paymentDate.toISOString(),
        reference: doc.reference,
        notes: doc.notes,
        createdBy: doc.createdBy,
        createdAt: doc.createdAt.toISOString()
    };
}

// Helper to convert MongoDB document to CreditNote type
function mapCreditNote(doc: any): CreditNote {
    return {
        id: doc._id.toString(),
        number: doc.number,
        ncf: doc.ncf,
        ncfType: doc.ncfType,
        originalInvoiceId: doc.originalInvoiceId,
        originalInvoiceNumber: doc.originalInvoiceNumber,
        originalInvoiceNcf: doc.originalInvoiceNcf,
        clientId: doc.clientId,
        clientName: doc.clientName,
        clientRnc: doc.clientRnc,
        date: doc.date.toISOString(),
        reason: doc.reason,
        subtotal: doc.subtotal,
        discount: doc.discount,
        tax: doc.tax,
        total: doc.total,
        items: (doc.items || []).map((item: any) => ({ ...item, id: item.id || item._id?.toString() })),
        notes: doc.notes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString()
    };
}

// ============= PAYMENTS =============

export async function createPayment(data: {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    reference?: string;
    notes?: string;
    createdBy: string;
}): Promise<{ success: boolean; payment?: Payment; message?: string }> {
    await dbConnect();
    try {
        const invoice = await InvoiceModel.findById(data.invoiceId);

        if (!invoice) {
            return { success: false, message: "Factura no encontrada" };
        }

        if (invoice.status === 'Anulada') {
            return { success: false, message: "No se pueden registrar pagos a facturas anuladas" };
        }

        const remainingBalance = invoice.total - invoice.paidAmount;

        if (data.amount <= 0) {
            return { success: false, message: "El monto del pago debe ser mayor a cero" };
        }

        // Allow small floating point differences
        if (data.amount > remainingBalance + 0.01) {
            return { success: false, message: `El monto excede el saldo pendiente (${remainingBalance.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })})` };
        }

        const newPayment = await PaymentModel.create({
            invoiceId: data.invoiceId,
            invoiceNumber: data.invoiceNumber,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            paymentDate: data.paymentDate,
            reference: data.reference,
            notes: data.notes,
            createdBy: data.createdBy
        });

        // Update invoice paid amount and status
        await updateInvoicePaymentStatus(data.invoiceId, newPayment._id.toString());

        revalidatePath('/invoices');
        revalidatePath('/payments');

        return { success: true, payment: mapPayment(newPayment) };
    } catch (error: any) {
        console.error('Error creating payment:', error);
        return { success: false, message: error.message || "Error al registrar el pago" };
    }
}

export async function getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    await dbConnect();
    try {
        const payments = await PaymentModel.find({ invoiceId }).sort({ paymentDate: -1 }).lean();
        return payments.map(mapPayment);
    } catch (error) {
        console.error("Error fetching payments:", error);
        return [];
    }
}

export async function getAllPayments(month?: string, year?: string, timezoneOffset?: number): Promise<Payment[]> {
    await dbConnect();
    try {
        let query: any = {};
        if (month && year) {
            const offsetMs = (timezoneOffset || 0) * 60 * 1000;
            const startUTC = Date.UTC(parseInt(year), parseInt(month), 1);
            const startDate = new Date(startUTC + offsetMs);
            const endUTC = Date.UTC(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59, 999);
            const endDate = new Date(endUTC + offsetMs);
            query.paymentDate = { $gte: startDate, $lte: endDate };
        }

        const payments = await PaymentModel.find(query).sort({ paymentDate: -1 }).lean();
        return payments.map(mapPayment);
    } catch (error) {
        console.error("Error fetching all payments:", error);
        return [];
    }
}

export async function deletePayment(paymentId: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const payment = await PaymentModel.findById(paymentId);

        if (!payment) {
            return { success: false, message: "Pago no encontrado" };
        }

        // Update invoice first
        await updateInvoicePaymentStatus(payment.invoiceId, paymentId, true); // true = remove payment

        // Then delete payment
        await PaymentModel.findByIdAndDelete(paymentId);

        revalidatePath('/invoices');
        revalidatePath('/payments');

        return { success: true, message: "Pago eliminado correctamente" };
    } catch (error: any) {
        console.error('Error deleting payment:', error);
        return { success: false, message: error.message || "Error al eliminar el pago" };
    }
}

export async function updatePayment(id: string, data: {
    amount?: number;
    paymentMethod?: string;
    paymentDate?: string;
    reference?: string;
    notes?: string;
}): Promise<{ success: boolean; payment?: Payment; message?: string }> {
    await dbConnect();
    try {
        const payment = await PaymentModel.findById(id);
        if (!payment) {
            return { success: false, message: "Pago no encontrado" };
        }

        // Validate amount change logic
        if (data.amount !== undefined && Math.abs(data.amount - payment.amount) > 0.01) {
            const invoice = await InvoiceModel.findById(payment.invoiceId);
            if (!invoice) {
                return { success: false, message: "Factura asociada no encontrada" };
            }

            // Current paid amount without this payment
            const currentPaidWithoutThis = (invoice.paidAmount || 0) - payment.amount;
            const newTotalPaid = currentPaidWithoutThis + data.amount;

            // Check if new total paid exceeds invoice total
            // Allow small margin
            if (newTotalPaid > invoice.total + 0.01) {
                return { success: false, message: `El nuevo monto excede el total de la factura.` };
            }
        }

        const updatedPayment = await PaymentModel.findByIdAndUpdate(id, data, { new: true });

        // Update invoice Payment Status (recalculates totals)
        if (data.amount !== undefined) {
            await updateInvoicePaymentStatus(payment.invoiceId, id);
        }

        revalidatePath('/invoices');
        revalidatePath('/payments');
        revalidatePath('/dashboard');

        return { success: true, payment: mapPayment(updatedPayment) };
    } catch (error: any) {
        console.error("Error updating payment:", error);
        return { success: false, message: error.message || "Error al actualizar el pago" };
    }
}

// ============= CREDIT NOTES =============

import { getNextNCF } from './settingsActions';
import mongoose from 'mongoose';
import { runTransaction } from '@/lib/db';
import { bulkUpdateStock, StockItem } from '@/lib/inventoryUtils';

async function generateCreditNoteNumber(): Promise<string> {
    const count = await CreditNoteModel.countDocuments();
    const year = new Date().getFullYear();
    return `NC-${year}-${String(count + 1).padStart(3, '0')}`;
}

export async function createCreditNote(data: {
    originalInvoiceId: string;
    reason: string;
    items: { productId: string; productName: string; quantity: number; price: number; discount: number; }[];
    discount: number;
    tax: number;
    notes?: string;
}): Promise<{ success: boolean; creditNote?: CreditNote; message?: string }> {
    await dbConnect();

    return runTransaction(async (session) => {
        const invoice = await InvoiceModel.findById(data.originalInvoiceId).session(session || null);
        if (!invoice) {
            throw new Error("Factura no encontrada");
        }

        // 1. Calculate Totals (Verify backend side)
        const creditItems = data.items.map((item, index) => {
            const subtotal = item.quantity * item.price;
            const discountAmount = (subtotal * item.discount) / 100;
            const total = subtotal - discountAmount;

            return {
                id: String(index + 1),
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
                subtotal,
                total
            };
        });

        const itemsTotal = creditItems.reduce((sum, item) => sum + item.total, 0);
        const total = itemsTotal + data.tax;

        // 2. Generate NCF (B04 for Credit Note)
        const ncf = await getNextNCF('B04', session);
        const number = await generateCreditNoteNumber(); // Ideally sequence locking here too, but acceptable risk for now.

        // 3. Create Credit Note
        const [newCreditNote] = await CreditNoteModel.create([{
            number,
            ncf,
            ncfType: 'B04',
            originalInvoiceId: invoice._id,
            originalInvoiceNumber: invoice.number,
            originalInvoiceNcf: invoice.ncf,
            clientId: invoice.clientId,
            clientName: invoice.clientName,
            clientRnc: invoice.clientRnc,
            date: new Date(),
            reason: data.reason,
            subtotal: itemsTotal,
            discount: data.discount,
            tax: data.tax,
            total,
            items: creditItems,
            notes: data.notes
        }], { session });

        // 4. Update Invoice (Add Credit Note reference)
        // We cannot use 'addCreditNoteToInvoice' as it might not accept session or uses a different pattern.
        // It's safer to implement the logic inline here to ensure it uses the Session.
        // Copying logic from addCreditNoteToInvoice but using session:

        const creditAmount = total;
        const newPaidAmount = (invoice.paidAmount || 0) + creditAmount;
        let status = invoice.status;

        if (newPaidAmount >= invoice.total - 0.01) {
            status = "Pagada";
            if (creditAmount >= invoice.total - 0.01) {
                status = "Anulada";
            }
        } else {
            status = "Nota de Crédito Parcial";
        }

        await InvoiceModel.findByIdAndUpdate(invoice._id, {
            $addToSet: { creditNotes: newCreditNote._id },
            $inc: { paidAmount: creditAmount },
            status: status
        }, { session });

        // 5. Return Stock (Bulk)
        const stockItems: StockItem[] = data.items.map(i => ({
            productId: i.productId,
            quantity: i.quantity
        }));
        await bulkUpdateStock(stockItems, 'add', session);

        return { success: true, creditNote: mapCreditNote(newCreditNote.toObject()) };
    }).catch(error => {
        console.error('Error creating credit note:', error);
        return { success: false, message: error.message || "Error al crear nota de crédito" };
    }).then(res => {
        if (res.success) {
            revalidatePath('/invoices');
            revalidatePath('/payments');
        }
        return res;
    });
}

export async function getCreditNotesByInvoice(invoiceId: string): Promise<CreditNote[]> {
    await dbConnect();
    try {
        const creditNotes = await CreditNoteModel.find({ originalInvoiceId: invoiceId }).sort({ createdAt: -1 }).lean();
        return creditNotes.map(mapCreditNote);
    } catch (error) {
        console.error("Error fetching credit notes:", error);
        return [];
    }
}

export async function getAllCreditNotes(month?: string, year?: string, timezoneOffset?: number): Promise<CreditNote[]> {
    await dbConnect();
    try {
        let query: any = {};

        if (month && year) {
            const offsetMs = (timezoneOffset || 0) * 60 * 1000;
            const startUTC = Date.UTC(parseInt(year), parseInt(month), 1);
            const startDate = new Date(startUTC + offsetMs);
            const endUTC = Date.UTC(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59, 999);
            const endDate = new Date(endUTC + offsetMs);

            query.date = { $gte: startDate, $lte: endDate };
        }

        const creditNotes = await CreditNoteModel.find(query).sort({ createdAt: -1 }).lean();
        return creditNotes.map(mapCreditNote);
    } catch (error) {
        console.error("Error fetching all credit notes:", error);
        return [];
    }
}

export async function getCreditNoteById(id: string): Promise<CreditNote | null> {
    await dbConnect();
    try {
        const creditNote = await CreditNoteModel.findById(id).lean();
        return creditNote ? mapCreditNote(creditNote) : null;
    } catch (error) {
        console.error("Error fetching credit note:", error);
        return null;
    }
}

// ... (existing code)

export async function updateCreditNote(id: string, data: {
    reason: string;
    items: { productId: string; productName: string; quantity: number; price: number; discount: number; }[];
    notes?: string;
}): Promise<{ success: boolean; creditNote?: CreditNote; message?: string }> {
    await dbConnect();

    return runTransaction(async (session) => {
        const creditNote = await CreditNoteModel.findById(id).session(session || null);
        if (!creditNote) {
            throw new Error("Nota de crédito no encontrada");
        }

        const invoice = await InvoiceModel.findById(creditNote.originalInvoiceId).session(session || null);
        if (!invoice) {
            throw new Error("Factura original no encontrada");
        }

        // 1. Revert Old Stock (Deduct what was added)
        // Note: Credit Notes ADD stock. So to clean up old state, we SUBTRACT old quantities.
        const oldItems: StockItem[] = creditNote.items.map((i: any) => ({
            productId: i.productId, quantity: i.quantity
        }));
        await bulkUpdateStock(oldItems, 'subtract', session);

        // 2. Revert Old Invoice Balance
        await InvoiceModel.findByIdAndUpdate(invoice._id, {
            $inc: { paidAmount: -creditNote.total }
        }, { session }); // Use updateOne with session

        // 3. Calculate New Totals
        const creditItems = data.items.map((item, index) => {
            const subtotal = item.quantity * item.price;
            const discountAmount = (subtotal * item.discount) / 100;
            const total = subtotal - discountAmount;

            return {
                id: String(index + 1),
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
                subtotal,
                total
            };
        });

        const itemsTotal = creditItems.reduce((sum, item) => sum + item.total, 0);

        let tax = 0;
        if (invoice.subtotal > 0) {
            tax = (itemsTotal / invoice.subtotal) * invoice.tax;
        }

        const total = itemsTotal + tax;

        // 4. Update Credit Note
        const updatedCreditNote = await CreditNoteModel.findByIdAndUpdate(id, {
            reason: data.reason,
            items: creditItems,
            subtotal: itemsTotal,
            tax,
            total,
            notes: data.notes
        }, { new: true, session });

        if (!updatedCreditNote) {
            throw new Error("Error al actualizar la nota de crédito (documento no devuelto)");
        }

        // 5. Apply New Stock (Add quantity back)
        const newItems: StockItem[] = data.items.map(i => ({
            productId: i.productId, quantity: i.quantity
        }));
        await bulkUpdateStock(newItems, 'add', session);

        // 6. Apply New Invoice Balance
        await InvoiceModel.findByIdAndUpdate(invoice._id, {
            $inc: { paidAmount: total }
        }, { session });

        // 7. Update Invoice Status
        const finalInvoice = await InvoiceModel.findById(invoice._id).session(session || null);
        if (finalInvoice) {
            let newStatus = finalInvoice.status;
            const paid = finalInvoice.paidAmount;
            const invTotal = finalInvoice.total;
            const remaining = invTotal - paid;

            // Calculate total credits
            const allCreditNotes = await CreditNoteModel.find({ originalInvoiceId: invoice._id }).session(session || null).lean();
            const totalCredited = allCreditNotes.reduce((sum: any, cn: any) => sum + cn.total, 0);

            if (totalCredited >= invTotal - 0.01) newStatus = 'Anulada';
            else if (remaining <= 0.01) newStatus = 'Pagada';
            else if (remaining >= invTotal - 0.01) newStatus = 'Pendiente';
            else newStatus = 'Nota de Crédito Parcial';

            await InvoiceModel.findByIdAndUpdate(invoice._id, { status: newStatus }, { session });
        }

        return { success: true, creditNote: mapCreditNote(updatedCreditNote.toObject()) };
    }).catch(error => {
        console.error('Error updating credit note:', error);
        return { success: false, message: error.message || "Error al actualizar nota de crédito" };
    }).then(res => {
        if (res.success) {
            revalidatePath('/invoices');
            revalidatePath('/payments');
        }
        return res;
    });
}

export async function deleteCreditNote(id: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();

    return runTransaction(async (session) => {
        const creditNote = await CreditNoteModel.findById(id).session(session || null);
        if (!creditNote) {
            throw new Error("Nota de crédito no encontrada");
        }

        // 1. Revert Stock (Deduct what was added)
        const stockItems: StockItem[] = creditNote.items.map((i: any) => ({
            productId: i.productId, quantity: i.quantity
        }));
        await bulkUpdateStock(stockItems, 'subtract', session);

        // 2. Remove reference from Invoice AND Revert Paid Amount
        const invoice = await InvoiceModel.findById(creditNote.originalInvoiceId).session(session || null);
        if (invoice) {
            await InvoiceModel.findByIdAndUpdate(invoice._id, {
                $pull: { creditNotes: id },
                $inc: { paidAmount: -creditNote.total }
            }, { session });

            // Recalculate invoice status
            const updatedInvoice = await InvoiceModel.findById(invoice._id).session(session || null);
            if (updatedInvoice) {
                let newStatus = updatedInvoice.status;
                const remaining = updatedInvoice.total - updatedInvoice.paidAmount;

                const allCreditNotes = await CreditNoteModel.find({
                    originalInvoiceId: invoice._id,
                    _id: { $ne: id }
                }).session(session || null).lean();
                const totalCredited = allCreditNotes.reduce((sum: any, cn: any) => sum + cn.total, 0);

                if (totalCredited >= updatedInvoice.total - 0.01) newStatus = 'Anulada';
                else if (remaining >= updatedInvoice.total - 0.01) newStatus = 'Pendiente';
                else if (remaining <= 0.01) newStatus = 'Pagada';
                else {
                    if (updatedInvoice.creditNotes && updatedInvoice.creditNotes.length > 0) {
                        newStatus = 'Nota de Crédito Parcial';
                    } else {
                        newStatus = 'Parcial';
                    }
                }

                await InvoiceModel.findByIdAndUpdate(invoice._id, { status: newStatus }, { session });
            }
        }

        await CreditNoteModel.findByIdAndDelete(id).session(session || null);

        return { success: true, message: "Nota de crédito eliminada correctamente" };
    }).catch(error => {
        console.error('Error deleting credit note:', error);
        return { success: false, message: error.message || "Error al eliminar nota de crédito" };
    }).then(res => {
        if (res.success) {
            revalidatePath('/invoices');
            revalidatePath('/payments');
        }
        return res;
    });
}

export async function cleanupAllPayments(): Promise<{ success: boolean; message: string; count: number }> {
    await dbConnect();
    try {
        const result = await PaymentModel.deleteMany({});
        const count = result.deletedCount;

        // Recalculate all invoice balances
        await fixInvoiceBalances();

        revalidatePath('/invoices');
        revalidatePath('/payments');
        revalidatePath('/dashboard');
        return { success: true, message: `Se eliminaron ${count} pagos y se recalcularon los saldos.`, count };
    } catch (error: any) {
        console.error('Error cleaning up payments:', error);
        return { success: false, message: error.message || "Error al limpiar pagos", count: 0 };
    }
}
