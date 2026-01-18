"use server";

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function uploadFile(formData: FormData): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, message: "No se ha proporcionado ningún archivo." };
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload directory
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'expenses');

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        // Generate unique name
        const uniqueName = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = join(uploadDir, uniqueName);

        // Write file
        await writeFile(filePath, buffer);

        // Return URL relative to public
        const url = `/uploads/expenses/${uniqueName}`;
        return { success: true, url };
    } catch (error: any) {
        console.error("Error uploading file:", error);
        return { success: false, message: "Error al subir el archivo." };
    }
}
