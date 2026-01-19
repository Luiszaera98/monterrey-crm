"use server";

import dbConnect from '@/lib/db';
import { User, Sequence, Configuration, Invoice as InvoiceModel } from '@/models';
import { revalidatePath } from 'next/cache';

// ==================== CONFIGURATION (Product Lists) ====================

const DEFAULT_CHORIZO_TYPES = [
    "Chorizo de Cerdo",
    "Chorizo de Res",
    "Chorizo Mixto",
    "Chorizo Picante",
    "Chorizo Ahumado",
    "Longaniza",
    "Salchicha Parrillera",
    "Butifarra"
];

export async function getChorizoTypes(): Promise<string[]> {
    await dbConnect();
    try {
        let config = await Configuration.findOne({ key: 'chorizo_types' });

        if (!config) {
            // Initialize if not exists
            config = await Configuration.create({
                key: 'chorizo_types',
                value: DEFAULT_CHORIZO_TYPES
            });
        }

        return config.value as string[];
    } catch (error) {
        console.error("Error fetching chorizo types:", error);
        return DEFAULT_CHORIZO_TYPES;
    }
}

export async function addChorizoType(type: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const config = await Configuration.findOne({ key: 'chorizo_types' });
        if (!config) {
            await Configuration.create({ key: 'chorizo_types', value: [...DEFAULT_CHORIZO_TYPES, type] });
        } else {
            const types = config.value as string[];
            if (!types.includes(type)) {
                types.push(type);
                config.value = types;
                // Mark as modified because 'value' is Mixed type
                config.markModified('value');
                await config.save();
            }
        }
        revalidatePath('/settings');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function removeChorizoType(type: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const config = await Configuration.findOne({ key: 'chorizo_types' });
        if (config) {
            const types = config.value as string[];
            const newTypes = types.filter(t => t !== type);
            config.value = newTypes;
            config.markModified('value');
            await config.save();
        }
        revalidatePath('/settings');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

const DEFAULT_UNIT_TYPES = [
    "Unidad",
    "Libras",
    "Kilos",
    "Paquete",
    "Caja"
];

export async function getUnitTypes(): Promise<string[]> {
    await dbConnect();
    try {
        let config = await Configuration.findOne({ key: 'unit_types' });

        if (!config) {
            config = await Configuration.create({
                key: 'unit_types',
                value: DEFAULT_UNIT_TYPES
            });
        }

        return config.value as string[];
    } catch (error) {
        console.error("Error fetching unit types:", error);
        return DEFAULT_UNIT_TYPES;
    }
}

export async function addUnitType(type: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const config = await Configuration.findOne({ key: 'unit_types' });
        if (!config) {
            await Configuration.create({ key: 'unit_types', value: [...DEFAULT_UNIT_TYPES, type] });
        } else {
            const types = config.value as string[];
            if (!types.includes(type)) {
                types.push(type);
                config.value = types;
                config.markModified('value');
                await config.save();
            }
        }
        revalidatePath('/settings');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function removeUnitType(type: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const config = await Configuration.findOne({ key: 'unit_types' });
        if (config) {
            const types = config.value as string[];
            const newTypes = types.filter(t => t !== type);
            config.value = newTypes;
            config.markModified('value');
            await config.save();
        }
        revalidatePath('/settings');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// ==================== PRODUCT TYPES & EXPENSE CATEGORIES ====================

import { DEFAULT_PRODUCT_TYPES, DEFAULT_EXPENSE_CATEGORIES } from '@/types';

export async function getProductTypes(): Promise<string[]> {
    await dbConnect();
    try {
        let config = await Configuration.findOne({ key: 'product_types' });

        if (!config) {
            config = await Configuration.create({ key: 'product_types', value: DEFAULT_PRODUCT_TYPES });
        }

        return config.value as string[];
    } catch (error) {
        console.error("Error fetching product types:", error);
        return DEFAULT_PRODUCT_TYPES;
    }
}

export async function addProductType(type: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const config = await Configuration.findOne({ key: 'product_types' });
        if (!config) {
            await Configuration.create({ key: 'product_types', value: [...DEFAULT_PRODUCT_TYPES, type] });
        } else {
            const types = config.value as string[];
            if (!types.includes(type)) {
                types.push(type);
                config.value = types;
                config.markModified('value');
                await config.save();
            }
        }
        revalidatePath('/settings');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function removeProductType(type: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const config = await Configuration.findOne({ key: 'product_types' });
        if (config) {
            const types = config.value as string[];
            const newTypes = types.filter(t => t !== type);
            config.value = newTypes;
            config.markModified('value');
            await config.save();
        }
        revalidatePath('/settings');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function getExpenseCategories(): Promise<string[]> {
    await dbConnect();
    try {
        let config = await Configuration.findOne({ key: 'expense_categories' });

        if (!config) {
            config = await Configuration.create({ key: 'expense_categories', value: DEFAULT_EXPENSE_CATEGORIES });
        }

        return config.value as string[];
    } catch (error) {
        console.error("Error fetching expense categories:", error);
        return DEFAULT_EXPENSE_CATEGORIES;
    }
}

export async function addExpenseCategory(category: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const config = await Configuration.findOne({ key: 'expense_categories' });
        if (!config) {
            await Configuration.create({ key: 'expense_categories', value: [...DEFAULT_EXPENSE_CATEGORIES, category] });
        } else {
            const categories = config.value as string[];
            if (!categories.includes(category)) {
                categories.push(category);
                config.value = categories;
                config.markModified('value');
                await config.save();
            }
        }
        revalidatePath('/settings');
        revalidatePath('/expenses');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function removeExpenseCategory(category: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const config = await Configuration.findOne({ key: 'expense_categories' });
        if (config) {
            const categories = config.value as string[];
            const newCategories = categories.filter(c => c !== category);
            config.value = newCategories;
            config.markModified('value');
            await config.save();
        }
        revalidatePath('/settings');
        revalidatePath('/expenses');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function getNCFSequences(): Promise<{ type: string; currentValue: number }[]> {
    await dbConnect();
    try {
        // Ensure standard types exist
        const standardTypes = ['B01', 'B02', 'B04', 'B14', 'B15'];

        for (const type of standardTypes) {
            const exists = await Sequence.findOne({ type });
            if (!exists) {
                await Sequence.create({ type, currentValue: 0 });
            }
        }

        const sequences = await Sequence.find({}).sort({ type: 1 }).lean();
        return sequences.map(s => ({ type: s.type, currentValue: s.currentValue }));
    } catch (error) {
        console.error("Error fetching sequences:", error);
        return [];
    }
}

export async function updateNCFSequence(type: string, newValue: number): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        await Sequence.findOneAndUpdate(
            { type },
            { currentValue: newValue },
            { upsert: true, new: true }
        );
        revalidatePath('/settings');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// Helper for other actions to get next NCF
export async function getNextNCF(type: string, session?: object): Promise<string> {
    await dbConnect();
    const sequence = await Sequence.findOneAndUpdate(
        { type },
        { $inc: { currentValue: 1 } },
        { upsert: true, new: true, session: session as any }
    );

    const paddedSequence = String(sequence.currentValue).padStart(8, '0');
    return `${type}${paddedSequence}`;
}

export async function syncNCFSequences(): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const standardTypes = ['B01', 'B02', 'B04', 'B14', 'B15'];
        let updatedCount = 0;

        for (const type of standardTypes) {
            // Find the invoice with the highest NCF for this type
            // We use a regex to match NCFs starting with the type
            const latestInvoice = await InvoiceModel.findOne({
                ncf: { $regex: new RegExp(`^${type}`) }
            }).sort({ ncf: -1 });

            if (latestInvoice && latestInvoice.ncf) {
                // Extract the sequence number (last 8 digits)
                const sequencePart = latestInvoice.ncf.substring(3);
                const maxSequence = parseInt(sequencePart, 10);

                if (!isNaN(maxSequence)) {
                    // Update sequence to match the found max (even if it's lower, to allow rollbacks)
                    await Sequence.findOneAndUpdate(
                        { type },
                        { currentValue: maxSequence },
                        { upsert: true, new: true }
                    );
                    updatedCount++;
                }
            } else {
                // If no invoices found for this type, reset sequence to 0
                const currentSeq = await Sequence.findOne({ type });
                if (currentSeq && currentSeq.currentValue !== 0) {
                    await Sequence.findOneAndUpdate(
                        { type },
                        { currentValue: 0 },
                        { upsert: true, new: true }
                    );
                    updatedCount++;
                }
            }
        }

        if (updatedCount > 0) {
            revalidatePath('/settings');
        }

        return { success: true, message: `Sincronizadas ${updatedCount} secuencias` };
    } catch (error: any) {
        console.error("Error syncing NCF sequences:", error);
        return { success: false, message: error.message };
    }
}

// ==================== USERS ====================

export async function getUsers() {
    await dbConnect();
    try {
        const users = await User.find({}).sort({ createdAt: -1 }).lean();
        return users.map(u => ({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            createdAt: u.createdAt.toISOString()
        }));
    } catch (error) {
        return [];
    }
}

export async function createUser(data: { name: string; email: string; role: string }) {
    await dbConnect();
    try {
        await User.create({
            name: data.name,
            email: data.email,
            role: data.role,
            status: 'Activo'
        });
        revalidatePath('/settings');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteUser(id: string) {
    await dbConnect();
    try {
        await User.findByIdAndDelete(id);
        revalidatePath('/settings');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
