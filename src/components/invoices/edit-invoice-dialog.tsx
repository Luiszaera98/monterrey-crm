"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateInvoice, getInvoiceById } from '@/lib/actions/invoiceActions';
import { getClients } from '@/lib/actions/clientActions';
import { getProducts } from '@/lib/actions/inventoryActions';
import { Client, Product, NCF_TYPES, Invoice } from '@/types';
import { PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface EditInvoiceDialogProps {
    invoice: Invoice | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface InvoiceItemForm {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    discount: number;
    availableStock: number;
}

export function EditInvoiceDialog({ invoice, open, onOpenChange, onSuccess }: EditInvoiceDialogProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // Form state
    const [clientId, setClientId] = useState('');
    const [ncfType, setNcfType] = useState('B01');
    const [status, setStatus] = useState('Pendiente');
    const [date, setDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState<InvoiceItemForm[]>([]);
    const [generalDiscount, setGeneralDiscount] = useState(0);
    const [taxRate, setTaxRate] = useState(18);
    const [notes, setNotes] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('30 Días');
    const [soldById, setSoldById] = useState('');

    useEffect(() => {
        const init = async () => {
            if (open && invoice) {
                try {
                    // Fetch all needed data including the FULL invoice (to get items)
                    const [clientsData, productsData, fullInvoiceData] = await Promise.all([
                        getClients(),
                        getProducts(),
                        getInvoiceById(invoice.id)
                    ]);

                    setClients(clientsData);
                    setProducts(productsData);

                    if (fullInvoiceData) {
                        populateForm(fullInvoiceData);
                    } else {
                        toast({ title: "Error", description: "No se pudo cargar la información completa de la factura.", variant: "destructive" });
                        onOpenChange(false);
                    }
                } catch (error) {
                    console.error("Error loading invoice data", error);
                }
            }
        };
        init();
    }, [open, invoice]);

    // Removed the secondary useEffect for soldBy/clients logic as retrieving soldById from invoice directly is better

    const populateForm = (inv: Invoice) => {
        setClientId(inv.clientId);
        setNcfType(inv.ncfType || 'B01');
        setStatus(inv.status);
        setDate(new Date(inv.date).toISOString().split('T')[0]);
        setDueDate(new Date(inv.dueDate).toISOString().split('T')[0]);
        setGeneralDiscount(inv.discount || 0);
        setNotes(inv.notes || '');
        setPaymentTerms(inv.paymentTerms || '30 Días');

        // Find seller by name if possible, or leave blank
        // We defer this until clients are set, but since we do it in one go now:
        // We will handle soldById setting in the next useEffect or right here if clients state updates synchronously (it doesn't)
        // Actually, we can just find it in the clientsData we fetched if we refactor, but for now let's rely on the separate matching

        // Populate items
        const formItems = inv.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0,
            availableStock: 0
        }));
        setItems(formItems);

        // Tax rate calculation
        if (inv.subtotal > 0) {
            const calculatedTaxRate = (inv.tax / inv.subtotal) * 100;
            setTaxRate(Math.round(calculatedTaxRate * 100) / 100);
        }
    };

    // Effect to set soldById once clients and invoice are available
    useEffect(() => {
        if (invoice && clients.length > 0) {
            const seller = clients.find(c => c.name === invoice.soldBy);
            if (seller) setSoldById(seller.id);
        }
    }, [clients, invoice]);

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

        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
                newItems[index].productName = product.name;
                newItems[index].price = product.price;
                newItems[index].availableStock = product.stock;
            }
        }

        setItems(newItems);
    };

    const calculateItemSubtotal = (item: InvoiceItemForm) => item.quantity * item.price;
    const calculateItemDiscount = (item: InvoiceItemForm) => (calculateItemSubtotal(item) * item.discount) / 100;
    const calculateItemTotal = (item: InvoiceItemForm) => calculateItemSubtotal(item) - calculateItemDiscount(item);
    const calculateItemsTotal = () => items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const calculateGeneralDiscount = () => (calculateItemsTotal() * generalDiscount) / 100;
    const calculateSubtotal = () => calculateItemsTotal() - calculateGeneralDiscount();
    const calculateTax = () => (calculateSubtotal() * taxRate) / 100;
    const calculateTotal = () => calculateSubtotal() + calculateTax();

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

        if (!invoice) return;

        if (!clientId) {
            toast({
                title: "Error",
                description: "Seleccione un cliente",
                variant: "destructive",
            });
            return;
        }

        if (items.some(item => !item.productId || item.quantity <= 0)) {
            toast({
                title: "Error",
                description: "Complete todos los ítems de la factura",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        const client = getClient();
        const result = await updateInvoice(invoice.id, {
            clientId,
            clientName: client?.name || '',
            clientRnc: client?.rncCedula,
            ncfType,
            status,
            date: new Date(date + 'T12:00:00Z').toISOString(),
            dueDate: new Date(dueDate + 'T12:00:00Z').toISOString(),
            items: items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount
            })),
            discount: generalDiscount,
            tax: calculateTax(),
            notes,
            paymentTerms,
            soldBy: clients.find(c => c.id === soldById)?.name,
            sellerEmail: clients.find(c => c.id === soldById)?.email
        });

        setIsLoading(false);

        if (result.success) {
            toast({
                title: "Éxito",
                description: `Factura ${result.invoice?.number} actualizada correctamente`,
            });
            onOpenChange(false);
            onSuccess();
        } else {
            toast({
                title: "Error",
                description: result.message || "No se pudo actualizar la factura",
                variant: "destructive",
            });
        }
    };

    if (!invoice) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Factura {invoice.number}</DialogTitle>
                    <DialogDescription>
                        Modifique los datos de la factura. NCF: {invoice.ncf}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Client and Status Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="client">Cliente *</Label>
                            <Select value={clientId} onValueChange={setClientId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.filter(c => c.contactType === 'Cliente').map(client => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name} {client.rncCedula && `(${client.rncCedula})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Estado *</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                    <SelectItem value="Pagada">Pagada</SelectItem>
                                    <SelectItem value="Vencida">Vencida</SelectItem>
                                    <SelectItem value="Anulada">Anulada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>NCF (No editable)</Label>
                            <Input value={invoice.ncf || 'N/A'} disabled className="font-mono" />
                        </div>
                    </div>

                    {/* Vendedor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="seller">Vendedor (Empleado)</Label>
                            <Select value={soldById} onValueChange={setSoldById}>
                                <SelectTrigger>
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
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Seleccione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map(product => (
                                                    <SelectItem key={product.id} value={product.id}>
                                                        {product.name} - ${product.price.toLocaleString()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="col-span-2">
                                        <Label className="text-xs">Cantidad</Label>
                                        <Input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <Label className="text-xs">Precio Unit.</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.price}
                                            onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <Label className="text-xs">Desc. %</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={item.discount}
                                            onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
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
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
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
                            placeholder="Información adicional"
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
