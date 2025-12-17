import { DollarSign, Receipt, PieChart, TrendingUp, Loader2 } from 'lucide-react';
import StatsCard from '../components/Dashboard/StatsCard';
import FinancialTrendsChart from '../components/Dashboard/FinancialTrendsChart';
import TransactionDistributionChart from '../components/Dashboard/TransactionDistributionChart';
import { useData } from '../context/DataContext';

const Dashboard = () => {
    const { dashboardStats, isLoading, expenses, sales } = useData();

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
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
                <p className="text-gray-500 mt-1">Track your financial health and performance.</p>
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
                    isPrivileged={true}
                />
                <StatsCard
                    title="Net Profit"
                    value={stats.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    label="After expenses"
                    icon={<TrendingUp size={24} className="text-purple-600" />}
                    colorClass="bg-purple-100 text-purple-600"
                    isPrivileged={true}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-4">
                <div className="lg:col-span-2">
                    <FinancialTrendsChart sales={sales} expenses={expenses} />
                </div>
                <div className="-mt-2">
                    <TransactionDistributionChart />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
