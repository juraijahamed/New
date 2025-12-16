import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/UI/DataTable';
import { PlusCircle, Loader2, FileText, Globe, Truck, BookUser } from 'lucide-react';
import FilePreviewModal from '../components/Modals/FilePreviewModal';
import { useData } from '../context/DataContext';
import SaleModal from '../components/Modals/SaleModal';
import { StatusSelect } from '../components/UI/StatusSelect';
import type { Sale } from '../services/api';

const Sales = () => {
    const { sales, isLoading, updateSale } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);

    const API_BASE_URL = 'http://localhost:3001'; // Should preferably come from env or config

    const handleEdit = (sale: Sale) => {
        setSelectedSale(sale);
        setIsModalOpen(true);
    };

    const columns = useMemo<ColumnDef<Sale>[]>(
        () => [
            {
                accessorKey: 'date',
                header: 'Date',
                cell: (info) => new Date(info.getValue() as string).toLocaleDateString('en-GB'),
            },
            {
                accessorKey: 'agency',
                header: 'Client/Agency',
                cell: (info) => <span className="font-semibold text-gray-700">{info.getValue() as string}</span>,
            },
            {
                accessorKey: 'supplier',
                header: 'Supplier',
                cell: (info) => (
                    <div className="flex items-center gap-1.5 text-gray-600">
                        <Truck size={14} className="text-gray-400" />
                        <span>{info.getValue() as string}</span>
                    </div>
                ),
            },
            {
                accessorKey: 'passport_number',
                header: 'Passport No',
                cell: (info) => (
                    <div className="flex items-center gap-1.5 text-gray-600">
                        <BookUser size={14} className="text-gray-400" />
                        <span className="font-mono text-xs">{info.getValue() as string || '-'}</span>
                    </div>
                ),
            },
            {
                accessorKey: 'national',
                header: 'Nationality',
                cell: (info) => (
                    <div className="flex items-center gap-1.5 text-gray-600">
                        <Globe size={14} className="text-gray-400" />
                        <span>{info.getValue() as string}</span>
                    </div>
                ),
            },
            {
                accessorKey: 'service',
                header: 'Service',
                cell: (info) => (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 border border-blue-200">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: 'net_rate',
                header: 'Net Rate',
                cell: (info) => (
                    <span className="font-mono text-gray-600">
                        AED {(info.getValue() as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                ),
            },
            {
                accessorKey: 'sales_rate',
                header: 'Sales Rate',
                cell: (info) => (
                    <span className="font-mono font-medium text-gray-900">
                        AED {(info.getValue() as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                ),
            },
            {
                accessorKey: 'profit',
                header: 'Profit',
                cell: (info) => {
                    const profit = info.getValue() as number;
                    return (
                        <span className={`font-mono font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            AED {profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'documents',
                header: 'Doc',
                cell: (info) => {
                    const docPath = info.getValue() as string;
                    if (!docPath) return <span className="text-gray-300">-</span>;
                    return (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewFile({
                                    url: `${API_BASE_URL}${docPath}`,
                                    title: 'Sale Document'
                                });
                            }}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors group flex items-center gap-1"
                            title="View Document"
                        >
                            <FileText size={16} />
                            <span className="text-xs font-medium">View</span>
                        </button>
                    );
                },
            },
            {
                accessorKey: 'status',
                header: 'Remarks',
                cell: ({ row, getValue }) => (
                    <StatusSelect
                        value={getValue() as string}
                        onChange={(newStatus) => updateSale(row.original.id!, { status: newStatus })}
                    />
                ),
            },
        ],
        []
    );

    // Calculate totals
    const totalSales = sales.reduce((sum, s) => sum + (s.sales_rate || 0), 0);
    const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
                    <p className="text-gray-500 mt-1">
                        Track your revenue and transactions. (Double-click row to edit)
                        <span className="ml-2 font-semibold text-gray-700">
                            Total: AED {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="ml-2 font-semibold text-green-600">
                            Profit: AED {totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </p>
                </div>
                <button
                    onClick={() => { setSelectedSale(null); setIsModalOpen(true); }}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all font-medium"
                >
                    <PlusCircle size={20} />
                    New Sale
                </button>
            </div>

            <div className="flex-1 overflow-auto bg-white rounded-2xl shadow-sm border border-gray-100">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-green-600" size={32} />
                    </div>
                ) : sales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <div className="text-6xl mb-4">💰</div>
                        <p className="text-lg">No sales recorded yet</p>
                        <p className="text-sm">Click "New Sale" to add your first entry</p>
                    </div>
                ) : (
                    <DataTable columns={columns} data={sales} onEdit={handleEdit} />
                )}
            </div>

            {/* Modals */}
            <SaleModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedSale(null); }}
                sale={selectedSale}
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

export default Sales;
