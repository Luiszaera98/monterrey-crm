import { Product as ProductModel } from '@/models';
import mongoose from 'mongoose';

export type StockOperation = 'add' | 'subtract';

export interface StockItem {
    productId: string;
    productName?: string; // For logging/error messages
    quantity: number;
}

/**
 * Performs a bulk update of product stock.
 * Uses MongoDB bulkWrite for performance.
 * @param items List of items to update
 * @param operation 'add' to increase stock, 'subtract' to decrease
 * @param session Optional Mongoose session for transactions
 */
export async function bulkUpdateStock(
    items: StockItem[],
    operation: StockOperation,
    session?: mongoose.ClientSession
) {
    if (items.length === 0) return;

    const multiplier = operation === 'add' ? 1 : -1;

    const operations = items.map(item => ({
        updateOne: {
            filter: { _id: item.productId },
            update: { $inc: { stock: item.quantity * multiplier } }
        }
    }));

    await ProductModel.bulkWrite(operations, { session });
}

/**
 * Validates if there is enough stock for the requested items.
 * Throws an error if stock is insufficient.
 * @param items Items to validate
 */
export async function validateStockAvailability(items: StockItem[]) {
    // Group quantities by product ID (in case the same product is listed twice)
    const demandMap = new Map<string, number>();
    const nameMap = new Map<string, string>();

    for (const item of items) {
        const current = demandMap.get(item.productId) || 0;
        demandMap.set(item.productId, current + item.quantity);
        if (item.productName) nameMap.set(item.productId, item.productName);
    }

    const productIds = Array.from(demandMap.keys());
    const products = await ProductModel.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const [id, requiredQty] of Array.from(demandMap.entries())) {
        const product = productMap.get(id);
        const productName = nameMap.get(id) || 'Producto desconocido';

        if (!product) {
            throw new Error(`Producto no encontrado: ${productName} (ID: ${id})`);
        }

        if (product.stock < requiredQty) {
            throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${requiredQty}`);
        }
    }
}
