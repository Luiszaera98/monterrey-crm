"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify, decodeJwt } from "jose";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { User, IUser } from "@/models";

const secret = process.env.JWT_SECRET || "default_local_secret_do_not_use_in_production";

if (!process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET not defined, using default insecure secret. Do not use in production.");
}

const JWT_SECRET = new TextEncoder().encode(secret);

const ALG = "HS256";

export type UserSession = {
    id: string;
    email: string;
    name: string;
    role: "Admin" | "Vendedor" | "Almacén";
};

// Map role string from UI/Legacy to DB Enum
const mapRoleToDb = (role: string): "Admin" | "Vendedor" | "Almacén" => {
    switch (role) {
        case "Administrador": return "Admin";
        case "Ventas": return "Vendedor";
        case "Inventario": return "Almacén";
        case "Admin": return "Admin";
        case "Vendedor": return "Vendedor";
        case "Almacén": return "Almacén";
        default: return "Vendedor";
    }
};

const mapRoleFromDb = (role: string): "Administrador" | "Ventas" | "Inventario" => {
    switch (role) {
        case "Admin": return "Administrador";
        case "Vendedor": return "Ventas";
        case "Almacén": return "Inventario";
        default: return "Ventas";
    }
};

async function seedUsers() {
    await dbConnect();
    const count = await User.countDocuments();
    if (count === 0) {
        const adminPwd = process.env.ADMIN_PASSWORD || "123456";
        const salesPwd = process.env.SALES_PASSWORD || "ventas123";
        const inventoryPwd = process.env.INVENTORY_PASSWORD || "inventario123";

        if (!process.env.ADMIN_PASSWORD) console.warn("WARNING: Using default insecure password for Admin.");

        const hashedPasswordAdmin = await bcrypt.hash(adminPwd, 10);
        const hashedPasswordSales = await bcrypt.hash(salesPwd, 10);
        const hashedPasswordInventory = await bcrypt.hash(inventoryPwd, 10);

        await User.create([
            {
                name: "Administrador",
                email: "admin@monterrey.com",
                password: hashedPasswordAdmin,
                role: "Admin",
                status: "Activo"
            },
            {
                name: "Vendedor",
                email: "ventas@monterrey.com",
                password: hashedPasswordSales,
                role: "Vendedor",
                status: "Activo"
            },
            {
                name: "Encargado de Inventario",
                email: "inventario@monterrey.com",
                password: hashedPasswordInventory,
                role: "Almacén",
                status: "Activo"
            }
        ]);
        console.log("Users seeded successfully");
    }
}

export async function loginAction(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { success: false, message: "Email y contraseña son requeridos" };
    }

    try {
        await dbConnect();

        // Auto-seed if empty (Safety mechanism for first run)
        // await seedUsers();

        const user = await User.findOne({ email }).select("+password");

        if (!user || !user.password) {
            return { success: false, message: "Credenciales inválidas" };
        }

        if (user.status !== "Activo") {
            return { success: false, message: "Usuario inactivo. Contacte al administrador." };
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return { success: false, message: "Credenciales inválidas" };
        }

        // Create JWT
        const token = await new SignJWT({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            name: user.name
        })
            .setProtectedHeader({ alg: ALG })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(JWT_SECRET);

        cookies().set("session", token, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/",
        });

        const mappedRole = mapRoleFromDb(user.role);

        return {
            success: true,
            token: token,
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: mappedRole
            }
        };

    } catch (error) {
        console.error("Login error:", error);
        return { success: false, message: "Error al iniciar sesión" };
    }
}

export async function logoutAction() {
    cookies().delete("session");
    redirect("/login");
}

export async function getSession() {
    const sessionCookie = cookies().get("session");

    if (!sessionCookie) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);

        const mappedRole = mapRoleFromDb(payload.role as string);

        return {
            id: payload.id as string,
            email: payload.email as string,
            name: payload.name as string,
            role: mappedRole
        };
    } catch (error) {
        return null;
    }
}

export async function isAuthenticated(): Promise<boolean> {
    const session = await getSession();
    return !!session;
}

