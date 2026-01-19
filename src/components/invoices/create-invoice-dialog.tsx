"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createInvoice } from '@/lib/actions/invoiceActions';
import { getClients } from '@/lib/actions/clientActions';
import { getProducts } from '@/lib/actions/inventoryActions';
import { Client, Product, NCF_TYPES } from '@/types';
import { PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface CreateInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface InvoiceItemForm {
    productId: string;
    productName: string;
    quantity: number | string;
    price: number | string;
    discount: number | string; // Descuento por ítem (%)
    availableStock: number;
}

export function CreateInvoiceDialog({ open, onOpenChange, onSuccess }: CreateInvoiceDialogProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // Form state
    const [clientId, setClientId] = useState('');
    const [ncfType, setNcfType] = useState('B01');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [items, setItems] = useState<InvoiceItemForm[]>([
        { productId: '', productName: '', quantity: 1, price: 0, discount: 0, availableStock: 0 }
    ]);
    const [generalDiscount, setGeneralDiscount] = useState<number | string>(0); // Descuento general (%)
    const [taxRate, setTaxRate] = useState<number | string>(0); // 18% ITBIS default 0 per user request
    const [notes, setNotes] = useState('');
    const [soldById, setSoldById] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('30 Días');

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        // Fetch with large limit to populate dropdowns
        const [clientsResult, productsResult] = await Promise.all([
            getClients(1, 1000),
            getProducts(1, 1000)
        ]);

        // Handle paginated response structure
        setClients(clientsResult.clients || []);
        setProducts(productsResult.products || []);
    };

    const addItem = () => {
        setItems([...items, { productId: '', productName: '', quantity: 1, price: 0, discount: 0, availableStock: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof InvoiceItemForm, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // If product is selected, auto-fill price and stock
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
                newItems[index].productName = product.name;
                newItems[index].price = product.price;
                newItems[index].availableStock = product.stock || 0;
            }
        }

        setItems(newItems);
    };

    // Helper to safely parse numbers
    const parseNum = (val: number | string): number => {
        if (typeof val === 'number') return val;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    // ... (keep existing calculation functions) ...

    const calculateItemSubtotal = (item: InvoiceItemForm) => {
        return parseNum(item.quantity) * parseNum(item.price);
    };

    const calculateItemDiscount = (item: InvoiceItemForm) => {
        return (calculateItemSubtotal(item) * parseNum(item.discount)) / 100;
    };

    const calculateItemTotal = (item: InvoiceItemForm) => {
        return calculateItemSubtotal(item) - calculateItemDiscount(item);
    };

    const calculateItemsTotal = () => {
        return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    };

    const calculateGeneralDiscount = () => {
        return (calculateItemsTotal() * parseNum(generalDiscount)) / 100;
    };

    const calculateSubtotal = () => {
        return calculateItemsTotal() - calculateGeneralDiscount();
    };

    const calculateTax = () => {
        return (calculateSubtotal() * parseNum(taxRate)) / 100;
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax();
    };

    const getClient = () => clients.find(c => c.id === clientId);

    useEffect(() => {
        if (date && dueDate) {
            const d1 = new Date(date);
            const d2 = new Date(dueDate);
            const diffTime = d2.getTime() - d1.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                setPaymentTerms('Contado');
            } else {
                setPaymentTerms(`${diffDays} Días`);
            }
        }
    }, [date, dueDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const client = getClient();
        if (!clientId || !client) {
            toast({
                title: "Error",
                description: "Seleccione un cliente válido",
                variant: "destructive",
            });
            return;
        }

        if (items.length === 0) {
            toast({
                title: "Error",
                description: "Debe agregar al menos un ítem a la factura",
                variant: "destructive",
            });
            return;
        }

        if (items.some(item => !item.productId || parseNum(item.quantity) <= 0)) {
            toast({
                title: "Error",
                description: "Complete todos los ítems de la factura con cantidades válidas",
                variant: "destructive",
            });
            return;
        }

        // Stock validation
        const stockErrors = items.filter(item => parseNum(item.quantity) > (item.availableStock || 0));
        if (stockErrors.length > 0) {
            toast({
                title: "Error de Inventario",
                description: `Stock insuficiente para: ${stockErrors.map(i => i.productName).join(', ')}`,
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const result = await createInvoice({
                clientId,
                clientName: client?.name || '',
                clientRnc: client?.rncCedula,
                ncfType,
                date: new Date(date + 'T12:00:00Z').toISOString(),
                dueDate: new Date(dueDate + 'T12:00:00Z').toISOString(),
                items: items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: parseNum(item.quantity),
                    price: parseNum(item.price),
                    discount: parseNum(item.discount)
                })),
                discount: parseNum(generalDiscount),
                tax: calculateTax(),
                notes,
                soldBy: clients.find(c => c.id === soldById)?.name,
                sellerEmail: clients.find(c => c.id === soldById)?.email,
                paymentTerms
            });

            console.log("Create Invoice Result:", result); // Debug log

            if (result.success) {
                toast({
                    title: "Éxito",
                    description: `Factura ${result.invoice?.number} creada con NCF: ${result.invoice?.ncf}`,
                });
                resetForm();
                onOpenChange(false);
                onSuccess();
            } else {
                console.error("Invoice creation failed:", result.message);
                toast({
                    title: "Error",
                    description: result.message || "No se pudo crear la factura",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Unexpected error in handleSubmit:", error);
            toast({
                title: "Error Inesperado",
                description: "Ocurrió un error al procesar la solicitud.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setClientId('');
        setNcfType('B01');
        setDate(new Date().toISOString().split('T')[0]);
        setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setItems([{ productId: '', productName: '', quantity: 1, price: 0, discount: 0, availableStock: 0 }]);
        setGeneralDiscount(0);
        setTaxRate(0);
        setNotes('');
        setSoldById('');
        setPaymentTerms('30 Días');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nueva Factura (DGII - República Dominicana)</DialogTitle>
                    <DialogDescription>
                        Complete los datos para crear una nueva factura con NCF
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Client and NCF Info */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Cliente *</Label>
                            <Select value={clientId} onValueChange={setClientId}>
                                <SelectTrigger id="client-select">
                                    <SelectValue placeholder="Seleccione cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.filter(c => c.contactType === 'Cliente' || (c.contactType as any) === 'Empresa').map(client => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name} {client.rncCedula && `(${client.rncCedula})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {clientId && getClient()?.rncCedula && (
                                <p className="text-xs text-muted-foreground">
                                    RNC/Cédula: {getClient()?.rncCedula}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo de NCF *</Label>
                            <Select value={ncfType} onValueChange={setNcfType}>
                                <SelectTrigger id="ncf-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(NCF_TYPES).map(([key, value]) => (
                                        <SelectItem key={key} value={key}>
                                            {key} - {value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                NCF se generará automáticamente
                            </p>
                        </div>
                    </div>

                    {/* Vendedor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Vendedor (Empleado)</Label>
                            <Select value={soldById} onValueChange={setSoldById}>
                                <SelectTrigger id="seller-select">
                                    <SelectValue placeholder="Seleccione vendedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.filter(c => c.contactType === 'Empleado').map(client => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Fecha de Emisión *</Label>
                            <Input
                                id="date"
                                name="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dueDate">Fecha de Vencimiento *</Label>
                            <Input
                                id="dueDate"
                                name="dueDate"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="paymentTerms">Condición de Pago</Label>
                            <Input
                                id="paymentTerms"
                                name="paymentTerms"
                                value={paymentTerms}
                                readOnly
                                className="bg-muted"
                            />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Productos/Servicios</Label>
                            <Button type="button" onClick={addItem} size="sm" variant="outline">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Agregar Ítem
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg bg-muted/30">
                                    <div className="col-span-4">
                                        <Label className="text-xs">Producto</Label>
                                        <Select
                                            value={item.productId}
                                            onValueChange={(value) => updateItem(index, 'productId', value)}
                                        >
                                            <SelectTrigger id={`product-select-${index}`} className="mt-1">
                                                <SelectValue placeholder="Seleccione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map(product => (
                                                    <SelectItem key={product.id} value={product.id}>
                                                        {product.name} - ${product.price.toLocaleString()} (Stock: {product.stock})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {item.productId && item.availableStock < parseNum(item.quantity) && (
                                            <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                                                <AlertCircle className="h-3 w-3" />
                                                Stock insuficiente: {item.availableStock}
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-2">
                                        <Label htmlFor={`quantity-${index}`} className="text-xs">Cantidad</Label>
                                        <Input
                                            id={`quantity-${index}`}
                                            name={`quantity-${index}`}
                                            type="number"
                                            min="0"
                                            step="any"
                                            max={item.availableStock}
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <Label htmlFor={`price-${index}`} className="text-xs">Precio Unit.</Label>
                                        <Input
                                            id={`price-${index}`}
                                            name={`price-${index}`}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.price}
                                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <Label htmlFor={`discount-${index}`} className="text-xs">Desc. %</Label>
                                        <Input
                                            id={`discount-${index}`}
                                            name={`discount-${index}`}
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={item.discount}
                                            onChange={(e) => updateItem(index, 'discount', e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <Label className="text-xs">Total</Label>
                                        <div className="mt-1 h-10 flex items-center font-semibold">
                                            ${calculateItemTotal(item).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    <div className="col-span-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeItem(index)}
                                            disabled={items.length === 1}
                                            className="w-full"
                                            aria-label={`Eliminar ítem ${index + 1}`}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals and Tax */}
                    <div className="border-t pt-4">
                        <div className="flex justify-end">
                            <div className="w-full max-w-sm space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal Ítems:</span>
                                    <span className="font-medium">${calculateItemsTotal().toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="flex justify-between items-center text-sm gap-2">
                                    <span>Descuento General:</span>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={generalDiscount}
                                            onChange={(e) => setGeneralDiscount(parseFloat(e.target.value) || 0)}
                                            className="w-16 h-8 text-sm"
                                        />
                                        <span className="text-xs">%</span>
                                        <span className="font-medium w-24 text-right">
                                            -${calculateGeneralDiscount().toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between text-sm font-medium border-t pt-2">
                                    <span>Subtotal:</span>
                                    <span>${calculateSubtotal().toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="flex justify-between items-center text-sm gap-2">
                                    <span>ITBIS:</span>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={taxRate}
                                            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                            className="w-16 h-8 text-sm"
                                        />
                                        <span className="text-xs">%</span>
                                        <span className="font-medium w-24 text-right">
                                            ${calculateTax().toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between text-xl font-bold border-t pt-3">
                                    <span>Total a Pagar:</span>
                                    <span className="text-primary">${calculateTotal().toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas / Observaciones</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Información adicional para la factura"
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Creando..." : "Crear Factura con NCF"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
