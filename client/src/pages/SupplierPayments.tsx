import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/UI/DataTable';
import { PlusCircle, Loader2, CreditCard, FileText } from 'lucide-react';
import { useData } from '../context/DataContext';
import SupplierPaymentModal from '../components/Modals/SupplierPaymentModal';
import FilePreviewModal from '../components/Modals/FilePreviewModal';
import { StatusSelect } from '../components/UI/StatusSelect';
import type { SupplierPayment } from '../services/api';

const SupplierPayments = () => {
    const { supplierPayments, isLoading, updateSupplierPayment } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<SupplierPayment | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);

    const API_BASE_URL = 'http://localhost:3001';

    const handleEdit = (payment: SupplierPayment) => {
        setSelectedPayment(payment);
        setIsModalOpen(true);
    };

    const columns = useMemo<ColumnDef<SupplierPayment>[]>(
        () => [
            {
                accessorKey: 'date',
                header: 'Date',
                cell: (info) => new Date(info.getValue() as string).toLocaleDateString('en-GB'),
            },
            {
                accessorKey: 'supplier_name',
                header: 'Supplier Name',
                cell: (info) => <span className="font-semibold text-gray-700">{info.getValue() as string}</span>,
            },
            {
                accessorKey: 'amount',
                header: 'Amount',
                cell: (info) => (
                    <span className="font-mono font-bold text-purple-600">
                        AED {(info.getValue() as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                ),
            },
            {
                accessorKey: 'receipt_url',
                header: 'Receipt',
                cell: (info) => {
                    const docPath = info.getValue() as string;
                    if (!docPath) return <span className="text-gray-300">-</span>;
                    return (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewFile({
                                    url: `${API_BASE_URL}${docPath}`,
                                    title: 'Payment Receipt'
                                });
                            }}
                            className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors group flex items-center gap-1"
                            title="View Receipt"
                        >
                            <FileText size={16} />
                            <span className="text-xs font-medium">View</span>
                        </button>
                    );
                },
            },
            {
                accessorKey: 'remarks',
                header: 'Description',
                cell: (info) => {
                    const notes = info.getValue() as string;
                    if (!notes) return <span className="text-gray-300">-</span>;
                    return (
                        <span className="text-sm text-gray-600 max-w-xs truncate block" title={notes}>
                            {notes}
                        </span>
                    );
                },
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
        ],
        []
    );

    // Calculate totals
    const totalPayments = supplierPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return (
        <div className="p-2.5 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--dark-brown)] flex items-center gap-3">
                        <CreditCard className="text-purple-600" />
                        Supplier Payments
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Manage payments to your suppliers. (Double-click row to edit)
                        <span className="ml-2 font-semibold text-purple-600">
                            Total: AED {totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
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

            <div className="flex-1 overflow-auto bg-white rounded-[6px] shadow-sm border border-gray-100">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-purple-600" size={32} />
                    </div>
                ) : supplierPayments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <div className="text-6xl mb-4">💳</div>
                        <p className="text-lg">No supplier payments recorded yet</p>
                        <p className="text-sm">Click "New Payment" to add your first entry</p>
                    </div>
                ) : (
                    <DataTable columns={columns} data={supplierPayments} onEdit={handleEdit} />
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
            />
        </div>
    );
};

export default SupplierPayments;
