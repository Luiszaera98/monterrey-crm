"use client";

import Image from "next/image";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/lib/actions/authActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, LogIn } from "lucide-react";

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-lg hover:shadow-blue-500/30"
            disabled={pending}
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                </>
            ) : (
                <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar Sesión
                </>
            )}
        </Button>
    );
}

export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();

    async function clientAction(formData: FormData) {
        try {
            const result = await loginAction(formData);

            if (result.success) {
                toast({
                    title: "¡Bienvenido de nuevo!",
                    description: "Has iniciado sesión correctamente.",
                    className: "bg-green-50 border-green-200 text-green-900",
                });

                // Force a hard refresh to ensure the cookie is picked up by the browser middleware
                setTimeout(() => {
                    window.location.assign("/dashboard");
                }, 500);
            } else {
                toast({
                    title: "Error de autenticación",
                    description: result.message || "Credenciales inválidas. Por favor intenta de nuevo.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Login client error:", error);
            toast({
                title: "Error de Acción",
                description: "Ocurrió un error inesperado al intentar iniciar sesión.",
                variant: "destructive",
            });
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-950 p-10 rounded-2xl shadow-xl">
                <div className="flex flex-col items-center text-center">
                    <div className="-mb-6">
                        <Image
                            src="/logo.png"
                            alt="Industrias Monterrey"
                            width={240}
                            height={90}
                            className="w-auto h-auto max-w-[240px] object-contain"
                            priority
                        />
                    </div>
                    <h1 className="mt-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Bienvenido</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        Ingresa a Industrias Monterrey CRM
                    </p>
                </div>

                <form action={clientAction} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="usuario@empresa.com"
                                    required
                                    className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Contraseña</Label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <SubmitButton />
                </form>

                <div className="text-center text-sm">
                    <p className="text-muted-foreground">
                        ¿Olvidaste tu contraseña? <span className="text-blue-600 cursor-pointer hover:underline font-medium">Contactar Soporte</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
