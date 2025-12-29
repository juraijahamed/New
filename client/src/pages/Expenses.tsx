import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/UI/DataTable';
import { PlusCircle, Loader2, Receipt, Wallet } from 'lucide-react';
import { useData } from '../context/DataContext';
import ExpenseModal from '../components/Modals/ExpenseModal';
import FilePreviewModal from '../components/Modals/FilePreviewModal';
import { StatusSelect } from '../components/UI/StatusSelect';
import { EditableCell } from '../components/UI/EditableCell';
import { DocumentCell } from '../components/UI/DocumentCell';
import { useSearchParams } from 'react-router-dom';
import { fileUploadApi, type Expense, type SalaryPayment } from '../services/api';

import config from '../config';

const Expenses = () => {
    const { expenses, salaryPayments, isLoading, updateExpense, updateSalaryPayment } = useData();
    const [searchParams] = useSearchParams();
    const highlightId = searchParams.get('highlightId');
    const highlightKey = searchParams.get('highlightKey');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | SalaryPayment | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; title: string; expenseId?: number; isSalary?: boolean } | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'salary'>('general');

    const API_BASE_URL = config.API_URL;

    // Strict ID Ascending sort for a cleaner "series" view (1, 2, 3...)
    const sortedExpenses = useMemo(() => {
        return [...expenses].sort((a, b) => (a.id || 0) - (b.id || 0));
    }, [expenses]);

    const sortedSalaryPayments = useMemo(() => {
        return [...salaryPayments].sort((a, b) => (a.id || 0) - (b.id || 0));
    }, [salaryPayments]);

    // General Expenses are now just all expenses in the table
    const generalExpenses = sortedExpenses;
    // Salary expenses are strictly in sortedSalaryPayments from DataContext

    const handleEdit = (expense: Expense | SalaryPayment) => {
        setSelectedExpense(expense);
        setIsModalOpen(true);
    };

    const expenseColumns = useMemo<ColumnDef<Expense>[]>(
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
                            await updateExpense(row.original.id!, { date: val as string });
                        }}
                        type="date"
                        formatDisplay={(val) => new Date(val as string).toLocaleDateString('en-GB')}
                        className="text-xs"
                    />
                ),
            },
            {
                accessorKey: 'description',
                header: 'Description',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.description}
                        onSave={async (val) => {
                            await updateExpense(row.original.id!, { description: val as string });
                        }}
                        className="text-xs"
                    />
                ),
            },
            {
                accessorKey: 'category',
                header: 'Category',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.category}
                        onSave={async (val) => {
                            await updateExpense(row.original.id!, { category: val as string });
                        }}
                        className="text-xs"
                    />
                ),
            },
            {
                accessorKey: 'amount',
                header: 'Amount (AED)',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.amount}
                        onSave={async (val) => {
                            await updateExpense(row.original.id!, { amount: typeof val === 'number' ? val : parseFloat(String(val)) || 0 });
                        }}
                        type="number"
                        formatDisplay={(val) => (val as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        className="font-mono text-red-600 text-xs"
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
                            await updateExpense(row.original.id!, { receipt_url });
                        }}
                        apiBaseUrl={API_BASE_URL}
                        onPreview={(url, title) => {
                            setPreviewFile({ url, title, expenseId: row.original.id, isSalary: false });
                        }}
                    />
                ),
            },
            {
                accessorKey: 'remarks',
                header: 'Notes',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.remarks}
                        onSave={async (val) => {
                            await updateExpense(row.original.id!, { remarks: val as string });
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
                        onChange={(newStatus) => updateExpense(row.original.id!, { status: newStatus })}
                    />
                ),
            },
        ],
        []
    );

    const salaryColumns = useMemo<ColumnDef<SalaryPayment>[]>(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                cell: ({ row }) => (
                    <div
                        className="absolute inset-0 flex items-center justify-start px-3 py-2 font-mono text-xs text-gray-500 cursor-pointer hover:bg-black/[0.02] transition-colors"
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
                header: 'Payment Date',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.date}
                        onSave={async (val) => {
                            await updateSalaryPayment(row.original.id!, { date: val as string });
                        }}
                        type="date"
                        formatDisplay={(val) => new Date(val as string).toLocaleDateString('en-GB')}
                        className="text-xs"
                    />
                ),
            },
            {
                accessorKey: 'staff_name',
                header: 'Staff Name',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.staff_name}
                        onSave={async (val) => {
                            await updateSalaryPayment(row.original.id!, { staff_name: val as string });
                        }}
                        className="text-xs"
                    />
                ),
            },
            {
                accessorKey: 'paid_month',
                header: 'Month',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.paid_month}
                        onSave={async (val) => {
                            await updateSalaryPayment(row.original.id!, { paid_month: val as string });
                        }}
                        type="date"
                        formatDisplay={(val) => {
                            const date = new Date((val as string) + '-01');
                            return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                        }}
                        parseValue={(val) => {
                            // Convert date input to YYYY-MM format
                            if (val.includes('-')) {
                                return val.substring(0, 7);
                            }
                            return val;
                        }}
                        className="text-xs"
                    />
                ),
            },
            {
                accessorKey: 'amount',
                header: 'Salary (AED)',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.amount}
                        onSave={async (val) => {
                            await updateSalaryPayment(row.original.id!, { amount: typeof val === 'number' ? val : parseFloat(String(val)) || 0 });
                        }}
                        type="number"
                        formatDisplay={(val) => (val as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        className="font-mono text-red-600 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'advance',
                header: 'Advance (AED)',
                cell: ({ row }) => (
                    <EditableCell
                        value={row.original.advance}
                        onSave={async (val) => {
                            await updateSalaryPayment(row.original.id!, { advance: typeof val === 'number' ? val : parseFloat(String(val)) || 0 });
                        }}
                        type="number"
                        formatDisplay={(val) => ((val as number) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        className="font-mono text-orange-600 text-xs"
                    />
                ),
            },
            {
                accessorKey: 'total_salary',
                header: 'Total (AED)',
                cell: ({ row }) => {
                    const total = (row.original.total_amount ?? ((row.original.amount || 0) - ((row.original.advance || 0))));
                    return (
                        <div className="font-mono text-green-700 text-xs">
                            {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'receipt_url',
                header: 'Payment Proof',
                cell: ({ row }) => (
                    <DocumentCell
                        value={row.original.receipt_url}
                        onUpdate={async (receipt_url) => {
                            await updateSalaryPayment(row.original.id!, { receipt_url });
                        }}
                        apiBaseUrl={config.API_URL}
                        onPreview={(url, title) => {
                            setPreviewFile({ url, title, expenseId: row.original.id, isSalary: true });
                        }}
                    />
                ),
            },
            {
                accessorKey: 'status',
                header: 'Remarks',
                cell: ({ row, getValue }) => (
                    <StatusSelect
                        value={getValue() as string}
                        onChange={(newStatus) => updateSalaryPayment(row.original.id!, { status: newStatus })}
                    />
                ),
            },
        ],
        []
    );

    // Calculate totals
    const totalGeneralExpenses = generalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalSalaryExpenses = salaryPayments.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpenses = totalGeneralExpenses + totalSalaryExpenses;

    return (
        <div className="p-2.5 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--dark-brown)] flex items-center gap-3">
                        <Wallet className="text-amber-600" />
                        Expenses
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        General: <span className="font-mono text-red-600">AED {totalGeneralExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        {' | '}
                        Salaries: <span className="font-mono text-red-600">AED {totalSalaryExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white rounded-lg px-4 py-2.5 border border-amber-200 shadow-sm">
                        <p className="text-xs text-gray-500 mb-0.5">Total Expenses</p>
                        <p className="text-lg font-bold text-red-600 font-mono">
                            AED {totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <button
                        onClick={() => { setSelectedExpense(null); setIsModalOpen(true); }}
                        className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-4 py-2 rounded-[10px] flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all text-sm font-medium"
                    >
                        <PlusCircle size={18} />
                        New Entry
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general'
                        ? 'border-amber-600 text-amber-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Receipt size={16} />
                    General Expenses ({generalExpenses.length})
                </button>
                <button
                    onClick={() => setActiveTab('salary')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'salary'
                        ? 'border-amber-600 text-amber-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Wallet size={16} />
                    Salary Payments ({salaryPayments.length})
                </button>
            </div>

            <div className="flex-1 overflow-auto bg-white rounded-[6px] border border-gray-200">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-amber-600" size={32} />
                    </div>
                ) : activeTab === 'general' ? (
                    generalExpenses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <div className="text-5xl mb-3">📋</div>
                            <p>No expenses recorded</p>
                        </div>
                    ) : (
                        <DataTable
                            columns={expenseColumns}
                            data={generalExpenses}
                            highlightInfo={highlightId ? { rowId: highlightId, columnKey: highlightKey || undefined } : null}
                        />
                    )
                ) : (
                    salaryPayments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <div className="text-5xl mb-3">💰</div>
                            <p>No salary payments recorded</p>
                        </div>
                    ) : (
                        <DataTable
                            columns={salaryColumns}
                            data={sortedSalaryPayments}
                            highlightInfo={highlightId ? { rowId: highlightId, columnKey: highlightKey || undefined } : null}
                        />
                    )
                )}
            </div>

            {/* Modals */}
            <ExpenseModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedExpense(null); }}
                expense={selectedExpense}
            />

            <FilePreviewModal
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
                fileUrl={previewFile?.url}
                title={previewFile?.title}
                onEdit={() => {
                    if (previewFile?.expenseId && !previewFile.isSalary) {
                        const expense = expenses.find(e => e.id === previewFile.expenseId);
                        if (expense) {
                            setSelectedExpense(expense);
                            setIsModalOpen(true);
                            setPreviewFile(null);
                        }
                    } else if (previewFile?.expenseId && previewFile.isSalary) {
                        const salaryPayment = salaryPayments.find(sp => sp.id === previewFile.expenseId);
                        if (salaryPayment) {
                            setSelectedExpense(salaryPayment);
                            setIsModalOpen(true);
                            setPreviewFile(null);
                        }
                    }
                }}
                onRemove={async () => {
                    if (previewFile?.expenseId && !previewFile.isSalary) {
                        if (previewFile.url) {
                            await fileUploadApi.deleteFile(previewFile.url);
                        }
                        await updateExpense(previewFile.expenseId, { receipt_url: '' });
                        setPreviewFile(null);
                    } else if (previewFile?.expenseId && previewFile.isSalary) {
                        if (previewFile.url) {
                            await fileUploadApi.deleteFile(previewFile.url);
                        }
                        await updateSalaryPayment(previewFile.expenseId, { receipt_url: '' });
                        setPreviewFile(null);
                    }
                }}
            />
        </div>
    );
};

export default Expenses;
