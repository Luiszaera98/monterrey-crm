"use client";

import React, { useState, useMemo, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search, Edit, Trash2, Eye, Filter, UsersRound } from 'lucide-react';
import type { Client, ContactType } from '@/types';
import { CONTACT_TYPES } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getClients, deleteClientAction } from '@/lib/actions/clientActions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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

import { CreateClientDialog } from '@/components/clients/create-client-dialog';
import { EditClientDialog } from '@/components/clients/edit-client-dialog';

export default function ClientsPage() {
    console.log('--- CLIENTS PAGE JS LOADED - VERSION 8 - PREMIUM UI ---', new Date().toISOString());

    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<ContactType | 'Todos'>('Todos');
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const fetchClientsData = async () => {
        setIsLoading(true);
        try {
            const fetchedClients = await getClients();
            setClients(fetchedClients.map(c => ({
                ...c,
                createdAt: new Date(c.createdAt),
                updatedAt: new Date(c.updatedAt),
            })));
        } catch (error) {
            console.error("Failed to fetch clients", error);
            toast({ title: "Error", description: "No se pudieron cargar los contactos.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClientsData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            (client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (client.rncCedula && client.rncCedula.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))) &&
            (typeFilter === 'Todos' || client.contactType === typeFilter)
        );
    }, [clients, searchTerm, typeFilter]);

    const handleDeleteConfirmation = () => {
        if (!clientToDelete) return;
        startTransition(async () => {
            const result = await deleteClientAction(clientToDelete.id);
            if (result.success) {
                toast({
                    title: "Contacto Eliminado",
                    description: "El contacto \"" + clientToDelete.name + "\" ha sido eliminado.",
                });
                await fetchClientsData();
            } else {
                toast({
                    title: "Error al Eliminar",
                    description: result.message || "No se pudo eliminar el contacto. Verifique si tiene facturas asociadas.",
                    variant: "destructive",
                });
            }
            setClientToDelete(null);
        });
    };

    const getBadgeVariant = (type: ContactType) => {
        switch (type) {
            case 'Cliente': return 'default';
            case 'Proveedor': return 'secondary';
            case 'Empleado': return 'outline';
            default: return 'outline';
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-lg text-muted-foreground animate-pulse">Cargando contactos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">Contactos</h1>
                    <p className="text-muted-foreground mt-1">Gestione sus clientes, proveedores y empleados.</p>
                </div>
                <CreateClientDialog onClientCreated={fetchClientsData} />
            </div>

            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm ring-1 ring-black/5">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por nombre, RNC o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 w-full bg-background/50 border-muted focus:border-primary transition-colors"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ContactType | 'Todos')}>
                            <SelectTrigger className="w-full sm:w-[200px] bg-background/50 border-muted">
                                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="Filtrar por tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todos">Todos los Tipos</SelectItem>
                                {CONTACT_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-muted overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-semibold">Nombre / Razón Social</TableHead>
                                    <TableHead className="font-semibold">Tipo</TableHead>
                                    <TableHead className="font-semibold">RNC / Cédula</TableHead>
                                    <TableHead className="font-semibold">Contacto</TableHead>
                                    <TableHead className="text-right font-semibold">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredClients.length > 0 ? (
                                    filteredClients.map((client) => (
                                        <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium text-foreground">
                                                <div className="flex flex-col">
                                                    <span className="text-base">{client.name}</span>
                                                    <span className="text-xs text-muted-foreground sm:hidden">{client.rncCedula}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getBadgeVariant(client.contactType)} className="shadow-sm">
                                                    {client.contactType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-mono text-sm">{client.rncCedula}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col space-y-1 text-sm text-muted-foreground">
                                                    {client.email && <span>{client.email}</span>}
                                                    {client.phoneNumber && <span>{client.phoneNumber}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted" disabled={isPending}>
                                                            <span className="sr-only">Abrir menú</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        {/* View Details - For now, we can use Edit dialog or implement a View dialog. Let's use Edit for simplicity or disable View */}
                                                        {/* <DropdownMenuItem asChild>
                                                            <Link href={`/clients/${client.id}/view`} className="cursor-pointer">
                                                                <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                                                            </Link>
                                                        </DropdownMenuItem> */}
                                                        <DropdownMenuItem onClick={() => setClientToEdit(client)} className="cursor-pointer">
                                                            <Edit className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => setClientToDelete(client)} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer" disabled={isPending}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <UsersRound className="h-10 w-10 mb-2 opacity-20" />
                                                <p>No se encontraron contactos.</p>
                                                <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2">
                                                    Limpiar filtros
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {clientToDelete && (
                <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar contacto?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará permanentemente a <strong>{clientToDelete.name}</strong> y todos sus datos asociados.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setClientToDelete(null)} disabled={isPending}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirmation} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isPending}>
                                {isPending ? "Eliminando..." : "Sí, eliminar"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {clientToEdit && (
                <EditClientDialog
                    client={clientToEdit}
                    open={!!clientToEdit}
                    onOpenChange={(open) => !open && setClientToEdit(null)}
                    onClientUpdated={fetchClientsData}
                />
            )}
        </div>
    );
}
