"use server";

import dbConnect from '@/lib/db';
import { Client as ClientModel, Invoice as InvoiceModel } from '@/models';
import { Client } from '@/types';
import { revalidatePath } from 'next/cache';

// Helper to convert MongoDB document to Client type
function mapClient(doc: any): Client {
    return {
        id: doc._id.toString(),
        name: doc.name,
        contactType: doc.contactType || (doc.category === 'Empleado' ? 'Empleado' : (doc.type === 'Persona Física' ? 'Cliente' : 'Empresa')),
        rncCedula: doc.rnc || '',
        email: doc.email,
        phoneNumber: doc.phone,
        address: doc.address,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

export async function getClients(): Promise<Client[]> {
    await dbConnect();
    try {
        const clients = await ClientModel.find({}).sort({ createdAt: -1 }).lean();
        return clients.map(mapClient);
    } catch (error) {
        console.error("Error fetching clients:", error);
        return [];
    }
}

export async function createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; client?: Client; message?: string }> {
    await dbConnect();
    await dbConnect();
    try {
        const newClient = await ClientModel.create({
            name: data.name,
            email: data.email,
            phone: data.phoneNumber,
            address: data.address || 'N/A',
            rnc: data.rncCedula,
            type: data.contactType === 'Cliente' ? 'Persona Física' : 'Persona Jurídica',
            contactType: data.contactType,
            category: data.contactType === 'Empleado' ? 'Empleado' : 'General',
            status: 'Activo'
        });

        revalidatePath('/clients');
        return { success: true, client: mapClient(newClient) };
    } catch (error: any) {
        console.error("Error creating client:", error);
        return { success: false, message: error.message || "Error al crear cliente" };
    }
}

export async function updateClient(id: string, data: Partial<Client>): Promise<{ success: boolean; client?: Client; message?: string }> {
    await dbConnect();
    await dbConnect();
    try {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.email) updateData.email = data.email;
        if (data.phoneNumber) updateData.phone = data.phoneNumber;
        if (data.address) updateData.address = data.address;
        if (data.rncCedula) updateData.rnc = data.rncCedula;
        if (data.contactType) {
            updateData.contactType = data.contactType;
            updateData.type = data.contactType === 'Cliente' ? 'Persona Física' : 'Persona Jurídica';
            updateData.category = data.contactType === 'Empleado' ? 'Empleado' : 'General';
        }

        const updatedClient = await ClientModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).lean();

        if (!updatedClient) {
            return { success: false, message: "Cliente no encontrado" };
        }

        // Update invoices if name or RNC changed
        if (data.name || data.rncCedula) {
            const invoiceUpdate: any = {};
            if (data.name) invoiceUpdate.clientName = data.name;
            if (data.rncCedula) invoiceUpdate.clientRnc = data.rncCedula;

            await InvoiceModel.updateMany({ clientId: id }, invoiceUpdate);
        }

        revalidatePath('/clients');
        revalidatePath('/invoices');
        return { success: true, client: mapClient(updatedClient) };
    } catch (error: any) {
        console.error("Error updating client:", error);
        return { success: false, message: error.message || "Error al actualizar cliente" };
    }
}

export async function deleteClientAction(id: string): Promise<{ success: boolean; message?: string }> {
    await dbConnect();
    try {
        const result = await ClientModel.findByIdAndDelete(id);
        if (!result) {
            return { success: false, message: "Cliente no encontrado" };
        }
        revalidatePath('/clients');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting client:", error);
        return { success: false, message: error.message || "Error al eliminar cliente" };
    }
}

export async function uppercaseAllClientNames() {
    await dbConnect();
    const clients = await ClientModel.find({});
    let count = 0;

    for (const client of clients) {
        if (client.name) {
            // Convert to UPPERCASE: "juan perez" -> "JUAN PEREZ"
            const newName = client.name.toUpperCase();

            if (newName !== client.name) {
                await ClientModel.findByIdAndUpdate(client._id, { name: newName });
                // Update invoices too
                await InvoiceModel.updateMany({ clientId: client._id }, { clientName: newName });
                count++;
            }
        }
    }
    revalidatePath('/clients');
    revalidatePath('/invoices');
    return { success: true, count };
}
