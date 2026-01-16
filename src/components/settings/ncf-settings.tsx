"use client";

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, RefreshCw } from 'lucide-react';
import { updateNCFSequence } from '@/lib/actions/settingsActions';
import { useToast } from '@/hooks/use-toast';
import { NCF_TYPES } from '@/types';

interface NCFSettingsProps {
    initialSequences: { type: string; currentValue: number }[];
}

export function NCFSettings({ initialSequences }: NCFSettingsProps) {
    const [sequences, setSequences] = useState(initialSequences);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [editingValues, setEditingValues] = useState<Record<string, number>>({});

    const handleValueChange = (type: string, value: string) => {
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
            setEditingValues(prev => ({ ...prev, [type]: numValue }));
        }
    };

    const handleSave = (type: string) => {
        const newValue = editingValues[type];
        if (newValue === undefined) return;

        startTransition(async () => {
            const result = await updateNCFSequence(type, newValue);
            if (result.success) {
                setSequences(prev => prev.map(s => s.type === type ? { ...s, currentValue: newValue } : s));
                setEditingValues(prev => {
                    const next = { ...prev };
                    delete next[type];
                    return next;
                });
                toast({ title: "Secuencia actualizada", description: `La secuencia para ${type} se actualizó a ${newValue}.` });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const handleSync = () => {
        startTransition(async () => {
            const { syncNCFSequences } = await import('@/lib/actions/settingsActions');
            const result = await syncNCFSequences();
            if (result.success) {
                toast({ title: "Sincronización Completada", description: result.message });
                window.location.reload();
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Secuencias NCF</CardTitle>
                    <CardDescription>
                        Ajuste el valor actual de las secuencias de Comprobantes Fiscales.
                        El sistema usará el siguiente número (Valor Actual + 1) para la próxima factura.
                    </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleSync} disabled={isPending}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
                    Sincronizar Secuencias
                </Button>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tipo NCF</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right">Último Valor Usado</TableHead>
                                <TableHead className="w-[150px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sequences.map((seq) => (
                                <TableRow key={seq.type}>
                                    <TableCell className="font-medium">{seq.type}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {NCF_TYPES[seq.type as keyof typeof NCF_TYPES] || 'Desconocido'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input
                                            type="number"
                                            className="w-32 ml-auto text-right"
                                            value={editingValues[seq.type] !== undefined ? editingValues[seq.type] : seq.currentValue}
                                            onChange={(e) => handleValueChange(seq.type, e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            onClick={() => handleSave(seq.type)}
                                            disabled={isPending || editingValues[seq.type] === undefined || editingValues[seq.type] === seq.currentValue}
                                        >
                                            <Save className="h-4 w-4 mr-2" /> Guardar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
