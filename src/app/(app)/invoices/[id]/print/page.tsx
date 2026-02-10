"use client";

import React, { useEffect, useState } from 'react';
import { getInvoiceById } from '@/lib/actions/invoiceActions';
import { getCreditNotesByInvoice } from '@/lib/actions/paymentActions';
import { getClientById } from '@/lib/actions/clientActions';
import { Invoice, CreditNote, NCF_TYPES } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function InvoicePrintPage({ params }: { params: { id: string } }) {
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [invoiceData, notesData] = await Promise.all([
                    getInvoiceById(params.id),
                    getCreditNotesByInvoice(params.id)
                ]);

                if (invoiceData && !invoiceData.clientAddress && invoiceData.clientId && invoiceData.clientId !== 'placeholder') {
                    try {
                        const client = await getClientById(invoiceData.clientId);
                        if (client && client.address) {
                            invoiceData.clientAddress = client.address;
                        }
                    } catch (e) {
                        console.error("Error fetching client address fallback:", e);
                    }
                }

                setInvoice(invoiceData);
                setCreditNotes(notesData);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.id]);

    useEffect(() => {
        if (invoice && !loading) {
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [invoice, loading]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen text-gray-500 font-medium">Cargando documento...</div>;
    }

    if (!invoice) {
        return <div className="flex items-center justify-center h-screen text-red-500">Documento no encontrado</div>;
    }

    // Company Info
    const companyInfo = {
        name: "Industrias Monterrey SRL",
        rnc: "132327179",
        address: "calle 1ra, # 8, C. Villas Palmera km 10 ½, Santo Domingo, Dominican Republic",
        phone: "(809) 555-0123",
        email: "ventas@industriasmonterrey.com",
        instagram: "@industriasmonterreysrl"
    };

    const getNcfTitle = () => {
        if (!invoice.ncfType) return 'Factura';
        if ((invoice.ncfType as string) === 'S/C') return 'Factura';
        // @ts-ignore
        const typeName = NCF_TYPES[invoice.ncfType];
        return typeName ? `Factura de ${typeName}` : 'Factura de Crédito Fiscal';
    };

    return (
        <div id="invoice-print-content" className="bg-white text-black p-8 max-w-[216mm] mx-auto min-h-screen font-sans text-xs leading-tight relative selection:bg-gray-200">

            {/* Watermark for Anulada */}
            {invoice.status === 'Anulada' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <div className="border-4 border-red-500/10 text-red-500/10 text-[100px] font-bold uppercase -rotate-45 whitespace-nowrap select-none">
                        ANULADA
                    </div>
                </div>
            )}

            {/* Encabezado Sobrio */}
            <header className="flex justify-between items-start mb-6 border-b-2 border-black pb-4 relative z-10">
                <div className="flex flex-col">
                    {/* Logo Imagen - Ajustado */}
                    <div className="mb-4 h-24 w-auto relative">
                        <img
                            src="/logo.png"
                            alt="Industrias Monterrey"
                            className="h-full w-auto object-contain object-left"
                        />
                    </div>

                    <div className="text-xs space-y-0.5 text-gray-800">
                        <p className="font-semibold">{companyInfo.name}</p>
                        <p>RNC: {companyInfo.rnc}</p>
                        <p>{companyInfo.address}</p>
                        <p>{companyInfo.email} | {companyInfo.instagram}</p>
                    </div>
                </div>

                <div className="text-right pt-2">
                    <h2 className="text-lg font-bold uppercase mb-2">{getNcfTitle()}</h2>
                    <div className="space-y-1 text-sm">
                        {invoice.ncfType !== 'S/C' && (
                            <p><span className="font-bold">NCF:</span> {invoice.ncf || 'S/N'}</p>
                        )}
                        <p><span className="font-bold">Fecha:</span> {format(new Date(invoice.date), 'dd/MM/yyyy')}</p>
                        <p><span className="font-bold text-red-700">Vence:</span> {format(new Date(invoice.dueDate), 'dd/MM/yyyy')}</p>
                    </div>
                </div>
            </header>

            {/* Info Cliente (Compacta y Profesional) */}
            <section className="mb-6 relative z-10">
                <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                    <div className="space-y-1">
                        <h3 className="font-bold uppercase text-[10px] text-gray-500 border-b border-gray-300 mb-1">Cliente</h3>
                        <div className="grid grid-cols-[80px_1fr]">
                            <span className="font-bold text-gray-700">Razón Social:</span>
                            <span className="font-semibold">{invoice.clientName}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr]">
                            <span className="font-bold text-gray-700">RNC/Cédula:</span>
                            <span>{invoice.clientRnc || 'N/A'}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr]">
                            <span className="font-bold text-gray-700">Dirección:</span>
                            <span>{invoice.clientAddress || (invoice.clientId === 'placeholder' ? 'Av. Nuñez de Caceres, #79' : '')}</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h3 className="font-bold uppercase text-[10px] text-gray-500 border-b border-gray-300 mb-1">Detalles</h3>
                        <div className="grid grid-cols-[80px_1fr]">
                            <span className="font-bold text-gray-700">Condición:</span>
                            <span>{invoice.paymentTerms || '30 Días'}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr]">
                            <span className="font-bold text-gray-700">Vendedor:</span>
                            <div>
                                <span className="block">{invoice.soldBy || 'N/A'}</span>
                                {invoice.sellerEmail && <span className="text-[10px] text-gray-500 block">{invoice.sellerEmail}</span>}
                            </div>
                        </div>
                        <div className="grid grid-cols-[80px_1fr]">
                            <span className="font-bold text-gray-700">Estado:</span>
                            <span className="uppercase">{invoice.status}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tabla Items (Minimalista) */}
            <section className="mb-4 relative z-10">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black text-xs">
                            <th className="py-2 text-left font-bold w-10">#</th>
                            <th className="py-2 text-left font-bold">DESCRIPCIÓN</th>
                            <th className="py-2 text-center font-bold w-16">CANT</th>
                            <th className="py-2 text-right font-bold w-24">PRECIO</th>
                            <th className="py-2 text-right font-bold w-24">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {invoice.items.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-100">
                                <td className="py-2 text-gray-500">{index + 1}</td>
                                <td className="py-2">
                                    <span className="font-semibold block">{item.productName}</span>
                                    {item.description && <span className="text-[10px] text-gray-500 block">{item.description}</span>}
                                </td>
                                <td className="py-2 text-center">{item.quantity}</td>
                                <td className="py-2 text-right">{item.price.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                                <td className="py-2 text-right font-medium">{item.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="text-center py-2 text-[10px] font-bold tracking-widest uppercase border-b border-black mb-4 text-gray-400">
                    *** Fin del Documento ***
                </div>
            </section>

            {/* Sección Unificada: Totales y Notas de Crédito */}
            <section className="flex justify-end relative z-10">
                <div className="w-1/2 lg:w-5/12">
                    {/* Subtotales Factura */}
                    <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="font-bold text-gray-700">Subtotal:</span>
                        <span>${invoice.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="font-bold text-gray-700">ITBIS (18%):</span>
                        <span>${invoice.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {invoice.discount > 0 && (
                        <div className="flex justify-between py-1 border-b border-gray-100 text-green-700">
                            <span className="font-bold">Descuento:</span>
                            <span>-${((invoice.subtotal * invoice.discount) / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-black mb-2 bg-gray-50 px-1">
                        <span className="font-bold text-sm">Total Facturado:</span>
                        <span className="font-bold text-sm">${invoice.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {/* Notas de Crédito Integradas */}
                    {creditNotes.length > 0 && (
                        <div className="mb-2 pl-4 border-l-2 border-gray-300">
                            {creditNotes.map(note => (
                                <div key={note.id} className="flex justify-between py-0.5 text-xs">
                                    <span className="text-gray-600">(-) Nota Crédito {note.ncf}:</span>
                                    <span className="font-medium text-red-600">-${note.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Balance Final */}
                    <div className="flex justify-between py-3 border-t-2 border-black mt-2 items-end">
                        <span className="font-bold text-base uppercase">Total a Pagar:</span>
                        <span className="font-black text-lg">
                            ${Math.max(0, invoice.total - (invoice.paidAmount || 0)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </section>

            {/* Footer Legal */}
            <footer className="mt-auto pt-8 border-t border-gray-200 text-center text-[10px] text-gray-400 relative z-10">
                <p>Industrias Monterrey SRL | RNC: 132327179 | Santo Domingo, República Dominicana</p>
            </footer>

            <style jsx global>{`
                @media print {
                    @page { 
                        margin: 0;
                        size: auto;
                    }
                    
                    /* Hide everything by default */
                    body * {
                        visibility: hidden;
                    }

                    /* Only show the invoice content */
                    #invoice-print-content, #invoice-print-content * {
                        visibility: visible;
                    }

                    /* Position the invoice content at top-left */
                    #invoice-print-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 20mm; /* Restore padding visually for the print */
                        background-color: white !important;
                        min-height: auto !important; /* Avoid forcing extra pages */
                    }

                    /* Ensure background graphics are printed (for colors etc) */
                    body { 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                        background: white !important;
                    }
                }
            `}</style>
        </div>
    );
}
