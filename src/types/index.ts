export type ContactType = 'Cliente' | 'Proveedor' | 'Empleado' | 'Otro';

export const CONTACT_TYPES: ContactType[] = ['Cliente', 'Proveedor', 'Empleado', 'Otro'];

export type UserRole = 'Administrador' | 'Ventas' | 'Inventario';

export interface Client {
    id: string;
    name: string;
    contactType: ContactType;
    rncCedula?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export type ProductType = string;

export const DEFAULT_PRODUCT_TYPES = ['Chorizo', 'Materia Prima', 'Maquinaria y Equipos'];

export interface Product {
    id: string;
    name: string;
    description?: string;
    type: ProductType;
    sku: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    category?: string;
    unit: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export type InvoiceStatus = 'Pagada' | 'Pendiente' | 'Vencida' | 'Anulada' | 'Parcial' | 'Nota de Crédito Parcial';

// NCF Types for Dominican Republic (DGII)
export type NCFType = 'B01' | 'B02' | 'B04' | 'B14' | 'B15' | 'B16';

export const NCF_TYPES = {
    'B01': 'Crédito Fiscal',
    'B02': 'Consumidor Final',
    'B04': 'Nota de Crédito',
    'B14': 'Regímenes Especiales',
    'B15': 'Gubernamental',
    'B16': 'Exportaciones'
};

export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Cheque' | 'Tarjeta';

export interface Payment {
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: Date | string;
    reference?: string; // Reference number for transfer or check
    notes?: string;
    createdBy: string;
    createdAt: Date | string;
}

export interface CreditNote {
    id: string;
    number: string;
    ncf: string; // B04 NCF
    ncfType: 'B04';
    originalInvoiceId: string;
    originalInvoiceNumber: string;
    originalInvoiceNcf: string;
    clientId: string;
    clientName: string;
    clientRnc?: string;
    date: Date | string;
    reason: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    items: InvoiceItem[];
    notes?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface Invoice {
    id: string;
    number: string;
    ncf?: string; // Número de Comprobante Fiscal (DGII)
    ncfType?: NCFType;
    clientId: string;
    clientName: string;
    clientRnc?: string; // RNC/Cédula del cliente
    clientAddress?: string;
    soldBy?: string;
    sellerEmail?: string;
    paymentTerms?: string;
    date: Date | string;
    dueDate: Date | string;
    status: InvoiceStatus;
    subtotal: number;
    discount: number; // Descuento total
    tax: number; // ITBIS (18%)
    total: number;
    paidAmount: number; // Total paid towards this invoice
    items: InvoiceItem[];
    payments?: string[]; // Payment IDs
    creditNotes?: string[]; // Credit Note IDs that affect this invoice
    notes?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface InvoiceItem {
    id: string;
    productId: string;
    productName: string;
    description?: string;
    quantity: number;
    price: number;
    discount: number; // Descuento por ítem (porcentaje)
    subtotal: number; // Precio * Cantidad
    total: number; // Subtotal - Descuento
}

export type ExpenseCategory = string;

export const DEFAULT_EXPENSE_CATEGORIES = ['Servicios', 'Nómina', 'Materia Prima', 'Mantenimiento', 'Impuestos', 'Préstamos', 'Otros'];

export interface Expense {
    id: string;
    description: string;
    amount: number;
    date: Date | string;
    category: ExpenseCategory;
    supplierId?: string;
    supplierName?: string;
    invoiceNumber?: string;
    paymentMethod?: string;
    reference?: string;
    status: 'Pagada' | 'Pendiente' | 'Parcial';
    paidAmount?: number;
    lastPaymentDate?: string;
    notes?: string;
    attachments?: string[];
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface RecurringExpense {
    id: string;
    description: string;
    category: ExpenseCategory;
    amount: number;
    supplier?: string;
    frequency: 'Semanal' | 'Quincenal' | 'Mensual' | 'Anual';
    dayOfMonth?: number;
    nextRun: Date | string;
    active: boolean;
    lastGenerated?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
}
