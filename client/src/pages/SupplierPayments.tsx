import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/UI/DataTable';
import { PlusCircle, Loader2, CreditCard, LayoutList, FileText, Calendar, CalendarDays } from 'lucide-react';
import { useData } from '../context/DataContext';
import SupplierPaymentModal from '../components/Modals/SupplierPaymentModal';
import FilePreviewModal from '../components/Modals/FilePreviewModal';
import { StatusSelect } from '../components/UI/StatusSelect';
import { EditableCell } from '../components/UI/EditableCell';
import { DocumentCell } from '../components/UI/DocumentCell';
import { useSearchParams } from 'react-router-dom';
import { fileUploadApi, type SupplierPayment } from '../services/api';
import MonthlyStatement from '../components/Reports/MonthlyStatement';
import DailyStatement from '../components/Reports/DailyStatement';

import config from '../config';

const SupplierPayments = () => {
    const { supplierPayments, isLoading, updateSupplierPayment } = useData();
    const [searchParams] = useSearchParams();
    const highlightId = searchParams.get('highlightId');
    const highlightKey = searchParams.get('highlightKey');
    const [activeTab, setActiveTab] = useState<'transactions' | 'statement'>('transactions');
    const [statementView, setStatementView] = useState<'monthly' | 'daily'>('monthly');

    // Strict ID Ascending sort for a cleaner "series" view (1, 2, 3...)
    const sortedPayments = useMemo(() => {
        return [...supplierPayments].sort((a, b) => (a.id || 0) - (b.id || 0));
    }, [supplierPayments]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<SupplierPayment | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; title: string; paymentId?: number } | null>(null);

    const API_BASE_URL = config.API_URL;

    const handleEdit = (payment: SupplierPayment) => {
        setSelectedPayment(payment);
        setIsModalOpen(true);
    };

    const columns = useMemo<ColumnDef<SupplierPayment>[]>(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                cell: ({ row }) => (
                    <div
                        className="absolute inset-0 flex items-center justify-start px-3 py-2 font-mono text-xs text-gray-500 cursor-cell hover:bg-black/[0.02] transition-colors"
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleEdit(row.original);
                        }}
                        title="Double-click to open edit form"
                    >
                        {row.original.id || '-'}
                    </div>
                ),
            },
            {
                accessorKey: 'date',
                header: 'Date',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.date}
                        onSave={async (val) => {
                            await updateSupplierPayment(row.original.id!, { date: val as string });
                        }}
                        type="date"
                        formatDisplay={(val) => new Date(val as string).toLocaleDateString('en-GB')}
                        className="text-xs"
                    />
                ),
            },
            {
                accessorKey: 'supplier_name',
                header: 'Supplier Name',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.supplier_name}
                        onSave={async (val) => {
                            await updateSupplierPayment(row.original.id!, { supplier_name: val as string });
                        }}
                        className="font-semibold text-gray-700 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'amount',
                header: 'Amount',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.amount}
                        onSave={async (val) => {
                            await updateSupplierPayment(row.original.id!, { amount: typeof val === 'number' ? val : parseFloat(String(val)) || 0 });
                        }}
                        type="number"
                        formatDisplay={(val) => `AED ${(val as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        className="font-mono font-bold text-purple-600 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'receipt_url',
                header: 'Receipt',
                cell: ({ row }) => (
                    <DocumentCell
                        value={row.original.receipt_url}
                        onUpdate={async (receipt_url) => {
                            await updateSupplierPayment(row.original.id!, { receipt_url });
                        }}
                        apiBaseUrl={API_BASE_URL}
                        onPreview={(url, title) => {
                            setPreviewFile({ url, title, paymentId: row.original.id });
                        }}
                    />
                ),
            },
            {
                accessorKey: 'remarks',
                header: 'Description',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.remarks}
                        onSave={async (val) => {
                            await updateSupplierPayment(row.original.id!, { remarks: val as string });
                        }}
                        className="text-xs text-gray-600"
                    />
                ),
            },
            {
                accessorKey: 'status',
                header: 'Remarks',
                cell: ({ row, getValue }) => (
                    <StatusSelect
                        value={getValue() as string}
                        onChange={(newStatus) => updateSupplierPayment(row.original.id!, { status: newStatus })}
                    />
                ),
            },
            {
                accessorKey: 'bus_supplier',
                header: 'Bus Supplier',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.bus_supplier}
                        onSave={async (val) => {
                            await updateSupplierPayment(row.original.id!, { bus_supplier: val as string });
                        }}
                        className="text-xs text-gray-600"
                    />
                ),
            },
            {
                accessorKey: 'bus_amount',
                header: 'Bus Amount',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.bus_amount}
                        onSave={async (val) => {
                            await updateSupplierPayment(row.original.id!, { bus_amount: typeof val === 'number' ? val : parseFloat(String(val)) || 0 });
                        }}
                        type="number"
                        formatDisplay={(val) => val ? `AED ${(val as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                        className="font-mono text-green-600 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'visa_supplier',
                header: 'Visa Supplier',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.visa_supplier}
                        onSave={async (val) => {
                            await updateSupplierPayment(row.original.id!, { visa_supplier: val as string });
                        }}
                        className="text-xs text-gray-600"
                    />
                ),
            },
            {
                accessorKey: 'visa_amount',
                header: 'Visa Amount',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.visa_amount}
                        onSave={async (val) => {
                            await updateSupplierPayment(row.original.id!, { visa_amount: typeof val === 'number' ? val : parseFloat(String(val)) || 0 });
                        }}
                        type="number"
                        formatDisplay={(val) => val ? `AED ${(val as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                        className="font-mono text-purple-600 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'ticket_supplier',
                header: 'Ticket Supplier',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.ticket_supplier}
                        onSave={async (val) => {
                            await updateSupplierPayment(row.original.id!, { ticket_supplier: val as string });
                        }}
                        className="text-xs text-gray-600"
                    />
                ),
            },
            {
                accessorKey: 'ticket_amount',
                header: 'Ticket Amount',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.ticket_amount}
                        onSave={async (val) => {
                            await updateSupplierPayment(row.original.id!, { ticket_amount: typeof val === 'number' ? val : parseFloat(String(val)) || 0 });
                        }}
                        type="number"
                        formatDisplay={(val) => val ? `AED ${(val as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                        className="font-mono text-orange-600 text-xs"
                    />
                ),
            },
        ],
        []
    );

    // Calculate totals
    const totalPayments = supplierPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return (
        <div className="p-2.5 h-full flex flex-col">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--dark-brown)] flex items-center gap-3">
                        <CreditCard className="text-purple-600" />
                        Supplier Payments
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Total Payments: <span className="font-mono text-purple-600">AED {totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </p>
                </div>
                
                {/* Tabs */}
                <div className="flex justify-center">
                    <div className="flex p-1 bg-gray-100 rounded-lg">
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                                activeTab === 'transactions' 
                                    ? 'bg-white text-gray-900 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <LayoutList size={16} />
                            Transactions
                        </button>
                        <button
                            onClick={() => setActiveTab('statement')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                                activeTab === 'statement' 
                                    ? 'bg-white text-gray-900 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <FileText size={16} />
                            Statement
                        </button>
                    </div>
                </div>

                <div className="flex justify-end">
                    {activeTab === 'transactions' && (
                        <div className="flex items-center gap-3">
                            <div className="bg-white rounded-lg px-4 py-2.5 border border-purple-200 shadow-sm">
                                <p className="text-xs text-gray-500 mb-0.5">Total Payments</p>
                                <p className="text-lg font-bold text-purple-600 font-mono">
                                    AED {totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <button
                                onClick={() => { setSelectedPayment(null); setIsModalOpen(true); }}
                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-5 py-2.5 rounded-[10px] flex items-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all font-medium"
                            >
                                <PlusCircle size={20} />
                                New Payment
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-purple-600" size={32} />
                    </div>
                ) : activeTab === 'transactions' ? (
                    supplierPayments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-[6px] shadow-sm border border-gray-100">
                            <div className="text-6xl mb-4">💳</div>
                            <p className="text-lg">No supplier payments recorded yet</p>
                            <p className="text-sm">Click "New Payment" to add your first entry</p>
                        </div>
                    ) : (
                        <div className="h-full bg-white rounded-[6px] shadow-sm border border-gray-100 overflow-hidden">
                            <DataTable
                                columns={columns}
                                data={sortedPayments}
                                highlightInfo={highlightId ? { rowId: highlightId, columnKey: highlightKey || undefined } : null}
                            />
                        </div>
                    )
                ) : (
                    <MonthlyStatement data={supplierPayments} type="supplier" />
                )}
            </div>

            {/* Modals */}
            <SupplierPaymentModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedPayment(null); }}
                payment={selectedPayment}
            />

            <FilePreviewModal
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
                fileUrl={previewFile?.url}
                title={previewFile?.title}
                onEdit={() => {
                    if (previewFile?.paymentId) {
                        const payment = supplierPayments.find(p => p.id === previewFile.paymentId);
                        if (payment) {
                            setSelectedPayment(payment);
                            setIsModalOpen(true);
                            setPreviewFile(null);
                        }
                    }
                }}
                onRemove={async () => {
                    if (previewFile?.paymentId) {
                        if (previewFile.url) {
                            await fileUploadApi.deleteFile(previewFile.url);
                        }
                        await updateSupplierPayment(previewFile.paymentId, { receipt_url: '' });
                        setPreviewFile(null);
                    }
                }}
            />
        </div>
    );
};

export default SupplierPayments;
