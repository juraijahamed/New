import { motion } from 'framer-motion';
import { DollarSign, Receipt, CreditCard, TrendingUp } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface TransactionSegment {
    type: 'sales' | 'expenses' | 'supplier';
    label: string;
    count: number;
    percentage: number;
    color: string;
    gradient: string;
    icon: React.ReactNode;
    description: string;
}

const TransactionDistributionChart = () => {
    const { sales, expenses, supplierPayments } = useData();

    // Calculate transaction counts
    const salesCount = sales.length;
    const expensesCount = expenses.length;
    const supplierCount = supplierPayments.length;
    const totalTransactions = salesCount + expensesCount + supplierCount;

    // Calculate percentages
    const salesPercentage = totalTransactions > 0 ? (salesCount / totalTransactions) * 100 : 0;
    const expensesPercentage = totalTransactions > 0 ? (expensesCount / totalTransactions) * 100 : 0;
    const supplierPercentage = totalTransactions > 0 ? (supplierCount / totalTransactions) * 100 : 0;

    const segments: TransactionSegment[] = [
        {
            type: 'sales',
            label: 'Sales',
            count: salesCount,
            percentage: salesPercentage,
            color: '#2e7d32',
            gradient: 'linear-gradient(90deg, #2e7d32, #4caf50, #66bb6a)',
            icon: <DollarSign size={20} />,
            description: 'Revenue transactions',
        },
        {
            type: 'expenses',
            label: 'Expenses',
            count: expensesCount,
            percentage: expensesPercentage,
            color: '#c62828',
            gradient: 'linear-gradient(90deg, #c62828, #e53935, #ef5350)',
            icon: <Receipt size={20} />,
            description: 'Cost transactions',
        },
        {
            type: 'supplier',
            label: 'Supplier Payments',
            count: supplierCount,
            percentage: supplierPercentage,
            color: '#f57c00',
            gradient: 'linear-gradient(90deg, #f57c00, #ff9800, #ffb74d)',
            icon: <CreditCard size={20} />,
            description: 'Payment transactions',
        },
    ].filter(segment => segment.count > 0); // Only show segments with transactions

    if (totalTransactions === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
                <div className="text-center py-8">
                    <TrendingUp size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No transactions yet</p>
                    <p className="text-gray-400 text-xs mt-1">Start adding sales, expenses, and payments to see the distribution</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden"
        >
            {/* Header */}
            <div className="mb-6">
                <h3 className="text-lg font-bold text-[var(--dark-brown)] mb-1">Transaction Distribution</h3>
                <p className="text-sm text-gray-500">Breakdown of all transaction types</p>
                <div className="mt-2 flex items-center gap-2">
                    <div className="text-2xl font-bold" style={{ color: '#5D4037' }}>
                        {totalTransactions.toLocaleString()}
                    </div>
                    <span className="text-sm text-gray-500">total transactions</span>
                </div>
            </div>

            {/* Horizontal Progress Bar */}
            <div className="relative mb-6">
                <div className="h-12 bg-gray-100 rounded-xl overflow-hidden flex relative">
                    {segments.map((segment, index) => (
                        <motion.div
                            key={segment.type}
                            className="relative group cursor-pointer"
                            style={{ width: `${segment.percentage}%` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${segment.percentage}%` }}
                            transition={{
                                duration: 1,
                                delay: index * 0.1,
                                ease: [0.43, 0.13, 0.23, 0.96],
                            }}
                            whileHover={{ scale: 1.05, zIndex: 10 }}
                        >
                            {/* Progress fill with gradient */}
                            <div
                                className="h-full relative overflow-hidden"
                                style={{ background: segment.gradient }}
                            >
                                {/* Animated shimmer effect */}
                                <motion.div
                                    className="absolute inset-0"
                                    style={{
                                        background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
                                    }}
                                    animate={{
                                        x: ['-100%', '200%'],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: 'linear',
                                        delay: index * 0.3,
                                    }}
                                />

                                {/* Inner glow */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background: `linear-gradient(90deg, ${segment.color}40, ${segment.color}80, ${segment.color}40)`,
                                        filter: 'blur(2px)',
                                    }}
                                />

                                {/* Content overlay */}
                                <div className="absolute inset-0 flex items-center justify-center px-2">
                                    {segment.percentage > 8 && (
                                        <motion.div
                                            className="flex items-center gap-1.5 text-white"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.5 + index * 0.1 }}
                                        >
                                            <div className="drop-shadow-sm">{segment.icon}</div>
                                            <span className="font-bold text-sm drop-shadow-sm whitespace-nowrap">
                                                {segment.percentage.toFixed(1)}%
                                            </span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                                <div
                                    className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl whitespace-nowrap"
                                    style={{ borderLeft: `3px solid ${segment.color}` }}
                                >
                                    <div className="font-bold">{segment.label}</div>
                                    <div className="text-gray-300 mt-0.5">
                                        {segment.count} {segment.count === 1 ? 'transaction' : 'transactions'}
                                    </div>
                                    <div className="text-gray-400 text-[10px] mt-1">{segment.description}</div>
                                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                                        <div
                                            className="border-4 border-transparent border-t-gray-900"
                                            style={{ borderTopColor: segment.color }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Legend with Details */}
            <div className="space-y-3">
                {segments.map((segment, index) => (
                    <motion.div
                        key={segment.type}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                        <div className="flex items-center gap-3 flex-1">
                            <div
                                className="p-2 rounded-lg"
                                style={{
                                    backgroundColor: `${segment.color}15`,
                                    color: segment.color,
                                }}
                            >
                                {segment.icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-900">{segment.label}</h4>
                                    <span
                                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: `${segment.color}15`,
                                            color: segment.color,
                                        }}
                                    >
                                        {segment.percentage.toFixed(1)}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{segment.description}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold" style={{ color: segment.color }}>
                                {segment.count.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">
                                {segment.count === 1 ? 'transaction' : 'transactions'}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Summary Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-4 pt-4 border-t border-gray-100"
            >
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Transaction Activity</span>
                    <div className="flex items-center gap-4">
                        {segments.map((segment) => (
                            <div key={segment.type} className="flex items-center gap-1.5">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: segment.color }}
                                />
                                <span className="text-gray-600 font-medium">{segment.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default TransactionDistributionChart;

