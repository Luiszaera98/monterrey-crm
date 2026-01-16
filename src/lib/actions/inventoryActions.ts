"use server";

import dbConnect from '@/lib/db';
import { Product as ProductModel } from '@/models';
import { Product, ProductType } from '@/types';
import { revalidatePath } from 'next/cache';

// Helper to convert MongoDB document to Product type
function mapProduct(doc: any): Product {
    // Map category back to type for compatibility if needed, or use stored category
    // Assuming 'category' field in DB stores 'Chorizo' or 'Materia Prima' now
    let type: ProductType = 'Materia Prima';
    if (doc.category === 'Chorizo' || doc.category === 'Producto Terminado') {
        type = 'Chorizo';
    }

    return {
        id: doc._id.toString(),
        name: doc.name,
        type: type,
        sku: doc.sku,
        price: doc.price,
        cost: doc.cost,
        stock: doc.stock || 0,
        minStock: doc.minStock,
        unit: doc.unit,
        description: doc.description,
        category: doc.category,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

async function generateSKU(type: ProductType): Promise<string> {
    const prefix = type === 'Chorizo' ? 'CHO' : 'MP';

    // Find latest product with this prefix
    const latestProduct = await ProductModel.findOne({
        sku: { $regex: new RegExp(`^${prefix}-`) }
    }).sort({ sku: -1 });

    let sequence = 1;
    if (latestProduct && latestProduct.sku) {
        const parts = latestProduct.sku.split('-');
        if (parts.length === 2) {
            const lastSeq = parseInt(parts[1]);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }
    }

    return `${prefix}-${String(sequence).padStart(3, '0')}`;
}

export async function getProducts(): Promise<Product[]> {
    await dbConnect();
    try {
        const products = await ProductModel.find({}).sort({ name: 1 }).lean();
        return products.map(mapProduct);
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}

// Modified to make sku and category optional in input, as we handle them
export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'sku' | 'category'> & { sku?: string, category?: string }): Promise<{ success: boolean; product?: Product; message?: string }> {
    await dbConnect();
    try {
        // Auto-generate SKU if not provided
        const sku = data.sku || await generateSKU(data.type);

        // Use Type as Category if not provided
        const category = data.category || data.type;

        const newProduct = await ProductModel.create({
            name: data.name,
            sku: sku,
            category: category,
            price: data.price,
            cost: data.cost,
            stock: data.stock,
            description: data.description,
            minStock: data.minStock || 0, // Default to 0 if not provided
            unit: data.unit,
            status: 'Activo'
        });

        revalidatePath('/inventory');
        return { success: true, product: mapProduct(newProduct) };
    } catch (error: any) {
        console.error("Error creating product:", error);
        // Handle duplicate SKU error specifically if needed, though auto-gen should avoid it mostly
        if (error.code === 11000) {
            return { success: false, message: "Error: El código/SKU ya existe. Intente nuevamente." };
        }
        return { success: false, message: error.message || "Error al crear producto" };
    }
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<{ success: boolean; product?: Product; message?: string }> {
    await dbConnect();
    try {
        const updateData: any = { ...data };
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        // If type changed, we might want to update category too, but let's keep it simple
        if (data.type) {
            updateData.category = data.type;
        }

        const updatedProduct = await ProductModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).lean();

        if (!updatedProduct) {
            return { success: false, message: "Producto no encontrado" };
        }

        revalidatePath('/inventory');
        return { success: true, product: mapProduct(updatedProduct) };
    } catch (error: any) {
        console.error("Error updating product:", error);
        return { success: false, message: error.message || "Error al actualizar producto" };
    }
}

export async function deleteProductAction(id: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const result = await ProductModel.findByIdAndDelete(id);
        if (!result) {
            return { success: false, message: "Producto no encontrado" };
        }
        revalidatePath('/inventory');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting product:", error);
        return { success: false, message: error.message || "Error al eliminar producto" };
    }
}
