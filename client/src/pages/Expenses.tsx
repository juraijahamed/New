import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/UI/DataTable';
import { PlusCircle, Loader2, Receipt, Wallet, FileText } from 'lucide-react';
import { useData } from '../context/DataContext';
import ExpenseModal from '../components/Modals/ExpenseModal';
import FilePreviewModal from '../components/Modals/FilePreviewModal';
import { StatusSelect } from '../components/UI/StatusSelect';
import type { Expense, SalaryPayment } from '../services/api';

const Expenses = () => {
    const { expenses, salaryPayments, isLoading, updateExpense, updateSalaryPayment } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | SalaryPayment | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'salary'>('general');

    const API_BASE_URL = 'http://localhost:3001';

    // Filter out salary expenses from general expenses
    const generalExpenses = expenses.filter(e => e.category !== 'Salary');
    // Salary expenses are now in salaryPayments from DataContext

    const handleEdit = (expense: Expense | SalaryPayment) => {
        setSelectedExpense(expense);
        setIsModalOpen(true);
    };

    const expenseColumns = useMemo<ColumnDef<Expense>[]>(
        () => [
            {
                accessorKey: 'date',
                header: 'Date',
                cell: (info) => new Date(info.getValue() as string).toLocaleDateString('en-GB'),
            },
            {
                accessorKey: 'description',
                header: 'Description',
            },
            {
                accessorKey: 'category',
                header: 'Category',
            },
            {
                accessorKey: 'amount',
                header: 'Amount (AED)',
                cell: (info) => (
                    <span className="font-mono text-red-600">
                        {((info.getValue() as number) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                                    title: 'Expense Receipt'
                                });
                            }}
                            className="p-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors group flex items-center gap-1"
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
                header: 'Notes',
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
                accessorKey: 'date',
                header: 'Payment Date',
                cell: (info) => new Date(info.getValue() as string).toLocaleDateString('en-GB'),
            },
            {
                accessorKey: 'staff_name',
                header: 'Staff Name',
            },
            {
                accessorKey: 'paid_month',
                header: 'Month',
                cell: (info) => {
                    const val = info.getValue() as string;
                    const date = new Date(val + '-01');
                    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                },
            },
            {
                accessorKey: 'amount',
                header: 'Salary (AED)',
                cell: (info) => (
                    <span className="font-mono text-red-600">
                        {(info.getValue() as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                ),
            },
            {
                accessorKey: 'advance',
                header: 'Advance (AED)',
                cell: (info) => (
                    <span className="font-mono text-orange-600">
                        {((info.getValue() as number) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
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
                <button
                    onClick={() => { setSelectedExpense(null); setIsModalOpen(true); }}
                    className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-4 py-2 rounded-[10px] flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all text-sm font-medium"
                >
                    <PlusCircle size={18} />
                    New Entry
                </button>
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
                        <DataTable columns={expenseColumns} data={generalExpenses} onEdit={handleEdit} />
                    )
                ) : (
                    salaryPayments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <div className="text-5xl mb-3">💰</div>
                            <p>No salary payments recorded</p>
                        </div>
                    ) : (
                        <DataTable columns={salaryColumns} data={salaryPayments} onEdit={handleEdit} />
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
            />
        </div>
    );
};

export default Expenses;
