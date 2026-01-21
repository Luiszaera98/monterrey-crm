import mongoose, { Schema, Document, Model } from 'mongoose';

// ==================== CLIENT ====================
export interface IClient extends Document {
    name: string;
    email: string;
    phone: string;
    address: string;
    rnc?: string;
    type: 'Persona Física' | 'Persona Jurídica';
    contactType: 'Cliente' | 'Proveedor' | 'Empleado' | 'Otro';
    category: string;
    creditLimit: number;
    balance: number;
    status: 'Activo' | 'Inactivo';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ClientSchema = new Schema<IClient>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    rnc: { type: String },
    type: { type: String, enum: ['Persona Física', 'Persona Jurídica'], required: true },
    contactType: { type: String, enum: ['Cliente', 'Proveedor', 'Empleado', 'Otro'], default: 'Cliente' },
    category: { type: String, required: true },
    creditLimit: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ['Activo', 'Inactivo'], default: 'Activo' },
    notes: { type: String },
}, { timestamps: true });

// Indexes for performance
ClientSchema.index({ status: 1 });
ClientSchema.index({ type: 1 });
ClientSchema.index({ contactType: 1 });

export const Client: Model<IClient> = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);

// ==================== PRODUCT ====================
export interface IProduct extends Document {
    name: string;
    sku: string;
    category: string;
    description?: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    unit: string;
    status: 'Activo' | 'Inactivo';
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    cost: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    unit: { type: String, required: true },
    status: { type: String, enum: ['Activo', 'Inactivo'], default: 'Activo' },
}, { timestamps: true });

// Indexes for performance
ProductSchema.index({ status: 1 });
ProductSchema.index({ name: 'text', sku: 'text' }); // Text search support

// Text search support

// Force model recompilation in development
if (process.env.NODE_ENV === 'development' && mongoose.models.Product) {
    delete mongoose.models.Product;
}

export const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

// ==================== INVOICE ====================
export interface IInvoiceItem {
    id: string;
    productId: string;
    productName: string;
    description?: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    total: number;
}

export interface IInvoice extends Document {
    number: string;
    ncf?: string;
    ncfType?: string;
    clientId: string;
    clientName: string;
    clientRnc?: string;
    clientAddress?: string;
    soldBy?: string;
    sellerEmail?: string;
    paymentTerms?: string;
    date: Date;
    dueDate: Date;
    status: 'Pagada' | 'Pendiente' | 'Vencida' | 'Anulada' | 'Parcial' | 'Nota de Crédito Parcial';
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paidAmount: number;
    items: IInvoiceItem[];
    payments?: string[];
    creditNotes?: string[];
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
    id: { type: String, required: true },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
}, { _id: false });

const InvoiceSchema = new Schema<IInvoice>({
    number: { type: String, required: true, unique: true },
    ncf: { type: String, unique: true, sparse: true },
    ncfType: { type: String },
    clientId: { type: String, required: true },
    clientName: { type: String, required: true },
    clientRnc: { type: String },
    clientAddress: { type: String },
    soldBy: { type: String },
    sellerEmail: { type: String },
    paymentTerms: { type: String }, // 'Contado', '15 Días', etc.
    date: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['Pagada', 'Pendiente', 'Vencida', 'Anulada', 'Parcial', 'Nota de Crédito Parcial'], default: 'Pendiente' },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    items: [InvoiceItemSchema],
    payments: [{ type: String }],
    creditNotes: [{ type: String }],
    notes: { type: String },
}, { timestamps: true });

// Indexes for performance
InvoiceSchema.index({ date: -1 });
InvoiceSchema.index({ clientId: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ createdAt: -1 });

// Force model recompilation in development to apply schema changes
if (process.env.NODE_ENV === 'development' && mongoose.models.Invoice) {
    delete mongoose.models.Invoice;
}

export const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

// ==================== PAYMENT ====================
export interface IPayment extends Document {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    paymentMethod: 'Efectivo' | 'Transferencia' | 'Cheque' | 'Tarjeta';
    paymentDate: Date;
    reference?: string;
    notes?: string;
    createdBy: string;
    createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
    invoiceId: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta'], required: true },
    paymentDate: { type: Date, required: true },
    reference: { type: String },
    notes: { type: String },
    createdBy: { type: String, required: true },
}, { timestamps: true });

// Indexes for performance
PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ invoiceId: 1 });
PaymentSchema.index({ invoiceNumber: 1 });


export const Payment: Model<IPayment> = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

// ==================== CREDIT NOTE ====================
export interface ICreditNote extends Document {
    number: string;
    ncf: string;
    ncfType: 'B04';
    originalInvoiceId: string;
    originalInvoiceNumber: string;
    originalInvoiceNcf: string;
    clientId: string;
    clientName: string;
    clientRnc?: string;
    date: Date;
    reason: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    items: IInvoiceItem[];
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CreditNoteSchema = new Schema<ICreditNote>({
    number: { type: String, required: true, unique: true },
    ncf: { type: String, required: true, unique: true },
    ncfType: { type: String, default: 'B04' },
    originalInvoiceId: { type: String, required: true },
    originalInvoiceNumber: { type: String, required: true },
    originalInvoiceNcf: { type: String, required: true },
    clientId: { type: String, required: true },
    clientName: { type: String, required: true },
    clientRnc: { type: String },
    date: { type: Date, required: true },
    reason: { type: String, required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    items: [InvoiceItemSchema],
    notes: { type: String },
}, { timestamps: true });

// Indexes for performance
CreditNoteSchema.index({ originalInvoiceId: 1 });
CreditNoteSchema.index({ date: -1 });

export const CreditNote: Model<ICreditNote> = mongoose.models.CreditNote || mongoose.model<ICreditNote>('CreditNote', CreditNoteSchema);

// ==================== EXPENSE ====================
export interface IExpense extends Document {
    description: string;
    category: string;
    amount: number;
    date: Date;
    supplier?: string;
    invoiceNumber?: string;
    paymentMethod: string;
    reference?: string;
    status: 'Pagada' | 'Pendiente' | 'Parcial';
    paidAmount: number;
    lastPaymentDate?: Date;
    notes?: string;
    attachments?: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
    description: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    supplier: { type: String },
    invoiceNumber: { type: String },
    paymentMethod: { type: String, required: true },
    reference: { type: String },
    status: { type: String, enum: ['Pagada', 'Pendiente', 'Parcial'], default: 'Pendiente' },
    paidAmount: { type: Number, default: 0 },
    lastPaymentDate: { type: Date },
    notes: { type: String },
    attachments: [{ type: String }],
}, { timestamps: true });

// Indexes for performance
ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ category: 1 });

export const Expense: Model<IExpense> = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

// ==================== EXPENSE TRANSACTION ====================
export interface IExpenseTransaction extends Document {
    expenseId: string;
    amount: number;
    paymentMethod: string;
    date: Date;
    notes?: string;
    attachments?: string[];
    createdAt: Date;
}

const ExpenseTransactionSchema = new Schema<IExpenseTransaction>({
    expenseId: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    date: { type: Date, required: true },
    notes: { type: String },
    attachments: [{ type: String }],
}, { timestamps: true });

ExpenseTransactionSchema.index({ expenseId: 1 });
ExpenseTransactionSchema.index({ date: -1 });

export const ExpenseTransaction: Model<IExpenseTransaction> = mongoose.models.ExpenseTransaction || mongoose.model<IExpenseTransaction>('ExpenseTransaction', ExpenseTransactionSchema);

// ==================== RECURRING EXPENSE ====================
export interface IRecurringExpense extends Document {
    description: string;
    category: string;
    amount: number;
    supplier?: string;
    frequency: 'Semanal' | 'Quincenal' | 'Mensual' | 'Anual';
    dayOfMonth?: number;
    nextRun: Date;
    active: boolean;
    lastGenerated?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const RecurringExpenseSchema = new Schema<IRecurringExpense>({
    description: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    supplier: { type: String },
    frequency: { type: String, enum: ['Semanal', 'Quincenal', 'Mensual', 'Anual'], required: true },
    dayOfMonth: { type: Number },
    nextRun: { type: Date, required: true },
    active: { type: Boolean, default: true },
    lastGenerated: { type: Date },
}, { timestamps: true });

export const RecurringExpense: Model<IRecurringExpense> = mongoose.models.RecurringExpense || mongoose.model<IRecurringExpense>('RecurringExpense', RecurringExpenseSchema);

// ==================== USER ====================
export interface IUser extends Document {
    name: string;
    email: string;
    password?: string; // In a real app, this should be hashed
    role: 'Admin' | 'Vendedor' | 'Almacén';
    status: 'Activo' | 'Inactivo';
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, enum: ['Admin', 'Vendedor', 'Almacén'], default: 'Vendedor' },
    status: { type: String, enum: ['Activo', 'Inactivo'], default: 'Activo' },
}, { timestamps: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// ==================== SEQUENCE (NCF) ====================
export interface ISequence extends Document {
    type: string; // B01, B02, B04, etc.
    currentValue: number;
    updatedAt: Date;
}

const SequenceSchema = new Schema<ISequence>({
    type: { type: String, required: true, unique: true },
    currentValue: { type: Number, required: true, default: 0 },
}, { timestamps: true });

export const Sequence: Model<ISequence> = mongoose.models.Sequence || mongoose.model<ISequence>('Sequence', SequenceSchema);

// ==================== CONFIGURATION ====================
export interface IConfiguration extends Document {
    key: string; // e.g., 'chorizo_types'
    value: any; // Array of strings, object, etc.
}

const ConfigurationSchema = new Schema<IConfiguration>({
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

export const Configuration: Model<IConfiguration> = mongoose.models.Configuration || mongoose.model<IConfiguration>('Configuration', ConfigurationSchema);

// ==================== INVENTORY MOVEMENT ====================
export interface IInventoryMovement extends Document {
    productId: string;
    productName: string;
    type: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
    quantity: number;
    reference?: string;
    notes?: string;
    date: Date;
    createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>({
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    type: { type: String, enum: ['ENTRADA', 'SALIDA', 'AJUSTE'], required: true },
    quantity: { type: Number, required: true },
    reference: { type: String },
    notes: { type: String },
    date: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

// Indexes for performance
InventoryMovementSchema.index({ productId: 1 });
InventoryMovementSchema.index({ date: -1 });
InventoryMovementSchema.index({ type: 1 });

export const InventoryMovement: Model<IInventoryMovement> = mongoose.models.InventoryMovement || mongoose.model<IInventoryMovement>('InventoryMovement', InventoryMovementSchema);
