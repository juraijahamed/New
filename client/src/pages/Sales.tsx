import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/UI/DataTable';
import { PlusCircle, Loader2, BarChart3, LayoutList, FileText } from 'lucide-react';
import FilePreviewModal from '../components/Modals/FilePreviewModal';
import { useData } from '../context/DataContext';
import SaleModal from '../components/Modals/SaleModal';
import { StatusSelect } from '../components/UI/StatusSelect';
import { EditableCell } from '../components/UI/EditableCell';
import { DocumentCell } from '../components/UI/DocumentCell';
import { useSearchParams } from 'react-router-dom';
import { fileUploadApi, type Sale } from '../services/api';
import MonthlyStatement from '../components/Reports/MonthlyStatement';

import config from '../config';

const Sales = () => {
    const { sales, isLoading, updateSale } = useData();
    const [searchParams] = useSearchParams();
    const highlightId = searchParams.get('highlightId');
    const highlightKey = searchParams.get('highlightKey');
    const [activeTab, setActiveTab] = useState<'transactions' | 'statement'>('transactions');

    // Strict ID Ascending sort for a cleaner "series" view (1, 2, 3...)
    const sortedSales = useMemo(() => {
        return [...sales].sort((a, b) => (a.id || 0) - (b.id || 0));
    }, [sales]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; title: string; saleId?: number } | null>(null);

    const API_BASE_URL = config.API_URL; // Should preferably come from env or config

    const handleEdit = (sale: Sale) => {
        setSelectedSale(sale);
        setIsModalOpen(true);
    };

    const columns = useMemo<ColumnDef<Sale>[]>(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                size: 60,
                cell: ({ row }) => (
                    <div
                        className="absolute inset-0 flex items-center justify-start px-1.5 py-1 font-mono text-xs text-gray-500 cursor-cell hover:bg-black/[0.02] transition-colors"
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
                size: 100,
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.date}
                        onSave={async (val) => {
                            await updateSale(row.original.id!, { date: val as string });
                        }}
                        type="date"
                        formatDisplay={(val) => new Date(val as string).toLocaleDateString('en-GB')}
                        className="text-xs"
                    />
                ),
            },
            {
                accessorKey: 'agency',
                header: 'Agency',
                size: 100,
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.agency}
                        onSave={async (val) => {
                            await updateSale(row.original.id!, { agency: val as string });
                        }}
                        className="font-semibold text-gray-700 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'client',
                header: 'Client',
                size: 100,
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.client}
                        onSave={async (val) => {
                            await updateSale(row.original.id!, { client: val as string });
                        }}
                        className="font-semibold text-gray-700 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'service',
                header: 'Service',
                size: 100,
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.service}
                        onSave={async (val) => {
                            await updateSale(row.original.id!, { service: val as string });
                        }}
                        className="text-gray-700 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'bus_ticket_supplier',
                header: 'Bus/Ticket Supplier',
                size: 110,
                cell: ({ row }) => {
                    const busSupplier = row.original.bus_supplier || '';
                    const ticketSupplier = row.original.ticket_supplier || '';
                    const displayValue = busSupplier || ticketSupplier || '';
                    
                    return (
                        <EditableCell
                            value={displayValue}
                            onSave={async (val) => {
                                // Determine which field to update based on service type
                                const service = row.original.service;
                                if (service === 'B2B') {
                                    await updateSale(row.original.id!, { bus_supplier: val as string });
                                } else if (service === 'A2A') {
                                    await updateSale(row.original.id!, { ticket_supplier: val as string });
                                }
                            }}
                            className="text-gray-600 text-xs"
                        />
                    );
                },
            },
            {
                accessorKey: 'visa_supplier',
                header: 'Visa Supplier',
                size: 90,
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.visa_supplier || ''}
                        onSave={async (val) => {
                            await updateSale(row.original.id!, { visa_supplier: val as string });
                        }}
                        className="text-gray-600 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'passport_number',
                header: 'Passport No',
                size: 90,
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.passport_number}
                        onSave={async (val) => {
                            await updateSale(row.original.id!, { passport_number: val as string });
                        }}
                        className="font-mono text-xs text-gray-600"
                    />
                ),
            },
            {
                accessorKey: 'national',
                header: 'Nationality',
                size: 100,
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.national}
                        onSave={async (val) => {
                            await updateSale(row.original.id!, { national: val as string });
                        }}
                        className="text-gray-600 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'net_rate',
                header: 'Net Rate',
                size: 100,
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.net_rate}
                        onSave={async (val) => {
                            const netRate = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
                            const salesRate = row.original.sales_rate || 0;
                            const profit = salesRate - netRate;
                            await updateSale(row.original.id!, { net_rate: netRate, profit });
                        }}
                        type="number"
                        formatDisplay={(val) => `AED ${(val as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        className="font-mono text-gray-600 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'sales_rate',
                header: 'Sales Rate',
                size: 100,
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.sales_rate}
                        onSave={async (val) => {
                            const salesRate = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
                            const netRate = row.original.net_rate || 0;
                            const profit = salesRate - netRate;
                            await updateSale(row.original.id!, { sales_rate: salesRate, profit });
                        }}
                        type="number"
                        formatDisplay={(val) => `AED ${(val as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        className="font-mono font-medium text-gray-900 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'profit',
                header: 'Profit',
                size: 100,
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
                header: 'Documents',
                size: 70,
                cell: ({ row }) => (
                    <DocumentCell
                        value={row.original.documents}
                        onUpdate={async (documents) => {
                            await updateSale(row.original.id!, { documents });
                        }}
                        apiBaseUrl={API_BASE_URL}
                        onPreview={(url, title) => {
                            setPreviewFile({ url, title, saleId: row.original.id });
                        }}
                    />
                ),
            },
            {
                accessorKey: 'status',
                header: 'Remarks',
                size: 90,
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
        <div className="p-1 h-full flex flex-col">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-left text-[var(--dark-brown)] flex items-center gap-3">
                        <BarChart3 className="text-green-600" />
                        Sales
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Sales: <span className="font-mono text-green-600">AED {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        {' | '}
                        Profit: <span className="font-mono text-green-600">AED {totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
                            Monthly Statement
                        </button>
                    </div>
                </div>

                <div className="flex justify-end">
                    {activeTab === 'transactions' && (
                        <div className="flex items-center gap-3">
                            <div className="bg-white rounded-lg px-4 py-2.5 border border-green-200 shadow-sm">
                                <p className="text-xs text-gray-500 mb-0.5">Total Sales</p>
                                <p className="text-lg font-bold text-green-600 font-mono">
                                    AED {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <button
                                onClick={() => { setSelectedSale(null); setIsModalOpen(true); }}
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-5 py-2.5 rounded-[10px] flex items-center gap-2 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all font-medium"
                            >
                                <PlusCircle size={20} />
                                New Sale
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-green-600" size={32} />
                    </div>
                ) : activeTab === 'transactions' ? (
                    sales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-md shadow-sm border border-gray-100">
                            <div className="text-6xl mb-4">??</div>
                            <p className="text-lg">No sales recorded yet</p>
                            <p className="text-sm">Click "New Sale" to add your first entry</p>
                        </div>
                    ) : (
                        <div className="h-full bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden">
                            <DataTable
                                columns={columns}
                                data={sortedSales}
                                highlightInfo={highlightId ? { rowId: highlightId, columnKey: highlightKey || undefined } : null}
                            />
                        </div>
                    )
                ) : (
                    <MonthlyStatement data={sales} type="agency" />
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
                onEdit={() => {
                    if (previewFile?.saleId) {
                        const sale = sales.find(s => s.id === previewFile.saleId);
                        if (sale) {
                            setSelectedSale(sale);
                            setIsModalOpen(true);
                            setPreviewFile(null);
                        }
                    }
                }}
                onRemove={async () => {
                    if (previewFile?.saleId) {
                        if (previewFile.url) {
                            await fileUploadApi.deleteFile(previewFile.url);
                        }
                        await updateSale(previewFile.saleId, { documents: '' });
                        setPreviewFile(null);
                    }
                }}
            />
        </div>
    );
};

export default Sales;
