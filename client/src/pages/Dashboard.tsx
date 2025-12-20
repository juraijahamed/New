import { useState, useEffect, useRef } from 'react';
import { DollarSign, Receipt, PieChart, TrendingUp, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import StatsCard from '../components/Dashboard/StatsCard';
import FinancialTrendsChart from '../components/Dashboard/FinancialTrendsChart';
import TransactionDistributionChart from '../components/Dashboard/TransactionDistributionChart';
import { useData } from '../context/DataContext';

const Dashboard = () => {
    const { dashboardStats, isLoading, expenses, sales } = useData();
    const [showProfits, setShowProfits] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-hide profits after 15 seconds when they are shown
    useEffect(() => {
        if (showProfits) {
            // Clear any existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Set new timeout to hide profits after 15 seconds
            timeoutRef.current = setTimeout(() => {
                setShowProfits(false);
            }, 15000);
        }

        // Cleanup timeout on unmount or when showProfits changes
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [showProfits]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    const stats = {
        totalSales: dashboardStats?.totalSales || 0,
        totalExpenses: dashboardStats?.totalExpenses || 0,
        totalProfit: dashboardStats?.totalProfit || 0,
        netProfit: dashboardStats?.netProfit || 0,
        salesCount: dashboardStats?.salesCount || 0,
        expensesCount: dashboardStats?.expensesCount || 0,
    };

    return (
        <div className="p-2.5 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--dark-brown)] flex items-center gap-3">
                        <PieChart className="text-purple-600" />
                        Financial Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1">Track your financial health and performance.</p>
                </div>
                <motion.button
                    onClick={() => {
                        // Clear any existing timeout when manually toggling
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }
                        setShowProfits(!showProfits);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
                    style={{
                        background: showProfits ? 'rgba(218, 165, 32, 0.1)' : 'rgba(161, 136, 127, 0.1)',
                        border: `1px solid ${showProfits ? 'rgba(218, 165, 32, 0.3)' : 'rgba(161, 136, 127, 0.3)'}`,
                        color: showProfits ? '#DAA520' : '#A1887F'
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={showProfits ? 'Hide Profits' : 'Show Profits'}
                >
                    {showProfits ? <EyeOff size={20} /> : <Eye size={20} />}
                    <span className="text-sm font-medium">{showProfits ? 'Hide Profits' : 'Show Profits'}</span>
                </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Sales"
                    value={stats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    label={`${stats.salesCount} transactions`}
                    icon={<DollarSign size={24} className="text-green-600" />}
                    colorClass="bg-green-100 text-green-600"
                />
                <StatsCard
                    title="Total Expenses"
                    value={stats.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    label={`${stats.expensesCount} entries`}
                    icon={<Receipt size={24} className="text-red-600" />}
                    colorClass="bg-red-100 text-red-600"
                />
                <StatsCard
                    title="Total Profit"
                    value={stats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    label="From sales"
                    icon={<PieChart size={24} className="text-blue-600" />}
                    colorClass="bg-blue-100 text-blue-600"
                    isHidden={!showProfits}
                />
                <StatsCard
                    title="Net Profit"
                    value={stats.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    label="After expenses"
                    icon={<TrendingUp size={24} className="text-purple-600" />}
                    colorClass="bg-purple-100 text-purple-600"
                    isHidden={!showProfits}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-4">
                <div className="lg:col-span-2">
                    <FinancialTrendsChart sales={sales} expenses={expenses} showProfit={true} />
                </div>
                <div className="-mt-2">
                    <TransactionDistributionChart />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
