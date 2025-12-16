import { DollarSign, Receipt, PieChart, TrendingUp, Loader2 } from 'lucide-react';
import StatsCard from '../components/Dashboard/StatsCard';
import FinancialTrendsChart from '../components/Dashboard/FinancialTrendsChart';
import { useData } from '../context/DataContext';

const Dashboard = () => {
    const { dashboardStats, isLoading, expenses, sales } = useData();

    // Prepare chart data from recent transactions
    const chartData = (() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const last7Days: { name: string; sales: number; expenses: number }[] = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const daySales = sales
                .filter(s => s.date === dateStr)
                .reduce((sum, s) => sum + (s.sales_rate || 0), 0);

            const dayExpenses = expenses
                .filter(e => e.date === dateStr)
                .reduce((sum, e) => sum + (e.amount || 0), 0);

            last7Days.push({
                name: days[date.getDay()],
                sales: daySales,
                expenses: dayExpenses,
            });
        }

        return last7Days;
    })();

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

    // Calculate goal progress (example: target 100k sales)
    const monthlyTarget = 100000;
    const goalProgress = Math.min((stats.totalSales / monthlyTarget) * 100, 100);

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <FinancialTrendsChart data={chartData} />
                </div>
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl p-6 shadow-lg flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-indigo-100 font-medium mb-1">Monthly Goal</h3>
                        <div className="text-4xl font-bold mb-4">{goalProgress.toFixed(0)}%</div>
                        <div className="w-full bg-indigo-900/40 rounded-full h-2 mb-4">
                            <div
                                className="bg-white h-2 rounded-full transition-all duration-500"
                                style={{ width: `${goalProgress}%` }}
                            />
                        </div>
                        <p className="text-sm text-indigo-200">
                            {goalProgress >= 100
                                ? '🎉 Goal achieved! Great work!'
                                : `AED ${(monthlyTarget - stats.totalSales).toLocaleString()} to reach goal`
                            }
                        </p>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-5" />
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-white opacity-5" />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
