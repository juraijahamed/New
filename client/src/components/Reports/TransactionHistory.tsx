import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, DollarSign, Receipt, Users, Building2, Calendar, UserPlus, UserCheck } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';

interface Transaction {
    id: string;
    type: 'sale' | 'expense' | 'supplier_payment' | 'salary_payment';
    date: Date;
    modifiedDate: Date;
    amount: number;
    description: string;
    status?: string;
    details?: string;
    remarks?: string;
    created_by?: string;
    updated_by?: string;
}

interface TransactionHistoryProps {
    filterMonth?: number;
    filterYear?: number;
}

const TransactionHistory = ({ filterMonth, filterYear }: TransactionHistoryProps) => {
    const { sales, expenses, supplierPayments, salaryPayments } = useData();
    const navigate = useNavigate();

    const formatRemarks = (remark: string) => {
        const remarkMap: Record<string, string> = {
            'pending': 'Pending',
            'credited': 'Credited',
            'transferred': 'Transferred',
            'canceled': 'Canceled',
            'cleared': 'Cleared',
            'on-hold': 'On Hold'
        };
        return remarkMap[remark] || remark;
    };

    // Combine all transactions
    const transactions: Transaction[] = [];

    const isMonthFiltered = filterMonth !== undefined && filterYear !== undefined;

    // Add sales
    sales.forEach((sale) => {
        const saleDate = new Date(sale.date);
        if (isMonthFiltered) {
            if (saleDate.getMonth() !== filterMonth || saleDate.getFullYear() !== filterYear) return;
        }
        const modifiedDate = sale.updated_at ? new Date(sale.updated_at) : (sale.created_at ? new Date(sale.created_at) : saleDate);
        transactions.push({
            id: `sale-${sale.id}`,
            type: 'sale',
            date: saleDate,
            modifiedDate: modifiedDate,
            amount: sale.sales_rate || 0,
            description: `${sale.agency || 'Unknown'} - ${sale.service || 'Service'}`,
            status: sale.status || 'completed',
            details: `Net: AED ${(sale.net_rate || 0).toFixed(2)}, Profit: AED ${(sale.profit || 0).toFixed(2)}`,
            remarks: sale.remarks,
            created_by: sale.created_by || 'Unknown',
            updated_by: sale.updated_by,
        });
    });

    // Add expenses
    expenses.forEach((expense) => {
        const expenseDate = new Date(expense.date);
        if (isMonthFiltered) {
            if (expenseDate.getMonth() !== filterMonth || expenseDate.getFullYear() !== filterYear) return;
        }
        const modifiedDate = expense.updated_at ? new Date(expense.updated_at) : (expense.created_at ? new Date(expense.created_at) : expenseDate);
        transactions.push({
            id: `expense-${expense.id}`,
            type: 'expense',
            date: expenseDate,
            modifiedDate: modifiedDate,
            amount: -(expense.amount || 0),
            description: `${expense.category || 'Expense'}: ${expense.description || 'No description'}`,
            status: expense.status || 'completed',
            details: expense.receipt_url ? 'Receipt available' : 'No receipt',
            remarks: expense.remarks,
            created_by: expense.created_by || 'Unknown',
            updated_by: expense.updated_by,
        });
    });

    // Add supplier payments
    supplierPayments.forEach((payment) => {
        const paymentDate = new Date(payment.date);
        if (isMonthFiltered) {
            if (paymentDate.getMonth() !== filterMonth || paymentDate.getFullYear() !== filterYear) return;
        }
        const modifiedDate = payment.updated_at ? new Date(payment.updated_at) : (payment.created_at ? new Date(payment.created_at) : paymentDate);
        transactions.push({
            id: `supplier-${payment.id}`,
            type: 'supplier_payment',
            date: paymentDate,
            modifiedDate: modifiedDate,
            amount: -(payment.amount || 0),
            description: `Payment to ${payment.supplier_name || 'Supplier'}`,
            status: payment.status || 'completed',
            details: payment.receipt_url ? 'Receipt available' : 'No receipt',
            remarks: payment.remarks,
            created_by: payment.created_by || 'Unknown',
            updated_by: payment.updated_by,
        });
    });

    // Add salary payments
    salaryPayments.forEach((payment) => {
        const paymentDate = new Date(payment.date);
        if (isMonthFiltered) {
            if (paymentDate.getMonth() !== filterMonth || paymentDate.getFullYear() !== filterYear) return;
        }
        const modifiedDate = payment.updated_at ? new Date(payment.updated_at) : (payment.created_at ? new Date(payment.created_at) : paymentDate);
        transactions.push({
            id: `salary-${payment.id}`,
            type: 'salary_payment',
            date: paymentDate,
            modifiedDate: modifiedDate,
            amount: -(payment.amount || 0),
            description: `Salary for ${payment.staff_name || 'Staff'} - ${payment.paid_month || 'Month'}`,
            status: payment.status || 'completed',
            details: `Advance: AED ${(payment.advance || 0).toFixed(2)}`,
            remarks: payment.remarks,
            created_by: payment.created_by || 'Unknown',
            updated_by: payment.updated_by,
        });
    });

    const handleTransactionClick = (transaction: Transaction) => {
        const [type, id] = transaction.id.split('-');
        let path = '';
        let highlightKey = '';

        switch (type) {
            case 'sale':
                path = '/sales';
                highlightKey = 'agency'; // Default highlight for sales
                break;
            case 'expense':
                path = '/expenses';
                highlightKey = 'description';
                break;
            case 'supplier':
                path = '/supplier-payments';
                highlightKey = 'supplier_name';
                break;
            case 'salary':
                path = '/expenses'; // Salaries are on the expenses page
                highlightKey = 'staff_name';
                break;
        }

        if (path) {
            navigate(`${path}?highlightId=${id}&highlightKey=${highlightKey}`);
        }
    };

    // Sort by date modified (updated_at) first, then by created_at, then by date (newest first)
    transactions.sort((a, b) => {
        // First sort by modified date (most recently modified first)
        const modifiedDiff = b.modifiedDate.getTime() - a.modifiedDate.getTime();
        if (modifiedDiff !== 0) return modifiedDiff;
        // If modified dates are equal, sort by transaction date
        return b.date.getTime() - a.date.getTime();
    });

    // Group transactions by modified date (most recent activity first)
    const groupedTransactions: Record<string, Transaction[]> = {};
    transactions.forEach((transaction) => {
        const dateKey = transaction.modifiedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        if (!groupedTransactions[dateKey]) {
            groupedTransactions[dateKey] = [];
        }
        groupedTransactions[dateKey].push(transaction);
    });

    const getTransactionIcon = (type: Transaction['type']) => {
        switch (type) {
            case 'sale':
                return <DollarSign size={20} className="text-green-600" />;
            case 'expense':
                return <Receipt size={20} className="text-red-600" />;
            case 'supplier_payment':
                return <Building2 size={20} className="text-orange-600" />;
            case 'salary_payment':
                return <Users size={20} className="text-blue-600" />;
            default:
                return <DollarSign size={20} />;
        }
    };

    const getTransactionColor = (type: Transaction['type']) => {
        switch (type) {
            case 'sale':
                return 'bg-green-50 border-green-200';
            case 'expense':
                return 'bg-red-50 border-red-200';
            case 'supplier_payment':
                return 'bg-orange-50 border-orange-200';
            case 'salary_payment':
                return 'bg-blue-50 border-blue-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const getStatusColor = (status: string): string => {
        const statusColors: Record<string, string> = {
            'pending': '#FF9800',
            'credited': '#4CAF50',
            'transferred': '#2196F3',
            'canceled': '#F44336',
            'cleared': '#FFD700',
            'on-hold': '#795548',
        };
        return statusColors[status.toLowerCase()] || '#9CA3AF';
    };

    if (transactions.length === 0) {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="text-center">
                    <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Transactions Yet</h3>
                    <p className="text-sm text-gray-500">Transactions will appear here after you save forms.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-[var(--dark-brown)] flex items-center gap-2">
                    <Calendar size={24} className="text-indigo-600" />
                    Transaction History
                </h3>
                <p className="text-sm text-gray-500 mt-1">Recent financial activities</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
                {Object.entries(groupedTransactions).map(([dateKey, dateTransactions], groupIndex) => (
                    <div key={dateKey}>
                        {/* Date Header */}
                        <div className="sticky top-0 bg-gray-50 px-6 py-3 border-b border-gray-100 z-10">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                {dateKey}
                            </p>
                        </div>
                        {/* Transactions for this date */}
                        {dateTransactions.map((transaction, index) => (
                            <motion.div
                                key={transaction.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: (groupIndex * 0.1) + (index * 0.05) }}
                                onClick={() => handleTransactionClick(transaction)}
                                className={`px-6 py-4 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-black/[0.03] transition-all active:scale-[0.99] ${getTransactionColor(transaction.type)}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        {/* Icon */}
                                        <div className={`p-2.5 rounded-xl ${getTransactionColor(transaction.type)}`}>
                                            {getTransactionIcon(transaction.type)}
                                        </div>
                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 truncate mb-1">
                                                {transaction.description}
                                            </p>
                                            {transaction.details && (
                                                <p className="text-xs text-gray-600 mb-1">{transaction.details}</p>
                                            )}
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Calendar size={12} />
                                                {transaction.modifiedDate.toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Center section: Created by and Updated by */}
                                    <div className="flex flex-col items-center justify-center flex-1 px-4 min-w-0">
                                        {transaction.remarks && transaction.remarks.trim() !== '' && (
                                            <p className="text-xs text-gray-600 mb-1" title={transaction.remarks}>
                                                Notes: <span className="text-gray-700 font-medium">{formatRemarks(transaction.remarks)}</span>
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-600 flex items-center gap-1.5 font-medium whitespace-nowrap">
                                            <UserPlus size={11} className="text-blue-500" />
                                            <span className="text-gray-500">Created by:</span>
                                            <span className="text-gray-700 font-semibold">{transaction.created_by}</span>
                                        </p>
                                        {transaction.updated_by && (
                                            <p className="text-xs text-gray-600 flex items-center gap-1.5 font-medium whitespace-nowrap mt-1">
                                                <UserCheck size={11} className="text-green-500" />
                                                <span className="text-gray-500">Updated by:</span>
                                                <span className="text-gray-700 font-semibold">{transaction.updated_by}</span>
                                            </p>
                                        )}
                                    </div>
                                    {/* Right section: Amount and Status */}
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        <div className="flex items-center gap-2">
                                            {transaction.amount >= 0 ? (
                                                <ArrowUpRight size={18} className="text-green-600" />
                                            ) : (
                                                <ArrowDownLeft size={18} className="text-red-600" />
                                            )}
                                            <span
                                                className={`text-lg font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}
                                            >
                                                {transaction.amount >= 0 ? '+' : ''}
                                                AED {Math.abs(transaction.amount).toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>
                                        {transaction.status &&
                                            transaction.status !== 'draft' &&
                                            transaction.status.trim() !== '' &&
                                            transaction.status.toLowerCase() !== 'completed' && (
                                                <span
                                                    className="px-2 py-1 text-xs font-medium rounded-full text-white shadow-sm"
                                                    style={{
                                                        backgroundColor: getStatusColor(transaction.status),
                                                    }}
                                                >
                                                    {transaction.status.split('-').map(word =>
                                                        word.charAt(0).toUpperCase() + word.slice(1)
                                                    ).join(' ')}
                                                </span>
                                            )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TransactionHistory;
