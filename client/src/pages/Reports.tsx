import { Star, AlertTriangle, TrendingUp, Activity, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import CategoryBreakdown from '../components/Reports/CategoryBreakdown';
import { useData } from '../context/DataContext';

const Reports = () => {
    const { dashboardStats, sales, expenses, isLoading } = useData();

    // Calculate real category breakdowns
    const totalSales = sales.reduce((sum, s) => sum + (s.sales_rate || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);

    // Group sales by service
    const salesByService: Record<string, number> = {};
    sales.forEach(s => {
        const service = s.service || 'Other';
        salesByService[service] = (salesByService[service] || 0) + (s.sales_rate || 0);
    });

    const salesCategories = Object.entries(salesByService)
        .map(([name, value]) => ({
            name,
            value: totalSales > 0 ? Math.round((value / totalSales) * 100) : 0,
            displayValue: totalSales > 0 ? `${Math.round((value / totalSales) * 100)}%` : '0%',
            color: name === 'Visa Services' ? 'bg-green-500' : name === 'Ticketing' ? 'bg-blue-500' : 'bg-purple-500',
            icon: name === Object.keys(salesByService).sort((a, b) => salesByService[b] - salesByService[a])[0]
                ? <Star size={14} className="text-yellow-500" /> : undefined,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach(e => {
        const category = e.category || 'Other';
        expensesByCategory[category] = (expensesByCategory[category] || 0) + (e.amount || 0);
    });

    const expenseCategories = Object.entries(expensesByCategory)
        .map(([name, value]) => ({
            name,
            value: totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0,
            displayValue: totalExpenses > 0 ? `${Math.round((value / totalExpenses) * 100)}%` : '0%',
            color: name === 'Salary' ? 'bg-red-500' : name === 'Rent' ? 'bg-orange-500' : name === 'Utilities' ? 'bg-yellow-500' : 'bg-gray-500',
            icon: name === Object.keys(expensesByCategory).sort((a, b) => expensesByCategory[b] - expensesByCategory[a])[0]
                ? <AlertTriangle size={14} className="text-red-500" /> : undefined,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // Calculate KPIs
    const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : '0.0';
    const avgSaleValue = sales.length > 0 ? (totalSales / sales.length).toFixed(0) : '0';

    // Placeholder for MoM growth (would need historical data)
    const momGrowth = '+12';

    // Calculate monthly goal progress
    const monthlyTarget = 100000;
    const currentMonthSales = sales
        .filter((s) => {
            const saleDate = new Date(s.date);
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        })
        .reduce((sum, s) => sum + (s.sales_rate || 0), 0);
    const goalProgress = Math.min((currentMonthSales / monthlyTarget) * 100, 100);

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
                <p className="text-gray-500 mt-1">Detailed breakdown of your financial activities.</p>
            </div>

            {/* Grid for Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <CategoryBreakdown
                    title="Top Sales Categories"
                    items={salesCategories.length > 0 ? salesCategories : [
                        { name: 'No data yet', value: 0, displayValue: '0%', color: 'bg-gray-300' }
                    ]}
                />
                <CategoryBreakdown
                    title="Top Expense Categories"
                    items={expenseCategories.length > 0 ? expenseCategories : [
                        { name: 'No data yet', value: 0, displayValue: '0%', color: 'bg-gray-300' }
                    ]}
                />
            </div>

            {/* KPI Cards with Monthly Goal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Profit Margin</p>
                        <h3 className="text-2xl font-bold text-blue-600 mt-1">{profitMargin}%</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                        <TrendingUp size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">MoM Growth</p>
                        <h3 className="text-2xl font-bold text-green-600 mt-1">{momGrowth}%</h3>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full text-green-600">
                        <Activity size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Avg. Sale Value</p>
                        <h3 className="text-2xl font-bold text-purple-600 mt-1">AED {parseInt(avgSaleValue).toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                        <Star size={24} />
                    </div>
                </div>
                
                {/* Compact Monthly Goal Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Target size={20} className="text-indigo-200" />
                                <h3 className="text-sm font-semibold text-indigo-100">Monthly Goal</h3>
                            </div>
                        </div>
                        <div className="text-3xl font-bold mb-3">{goalProgress.toFixed(0)}%</div>
                        <div className="w-full bg-indigo-900/40 rounded-full h-2 mb-2">
                            <motion.div
                                className="bg-white h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${goalProgress}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                            />
                        </div>
                        <p className="text-xs text-indigo-200">
                            {goalProgress >= 100
                                ? '🎉 Goal achieved!'
                                : `AED ${(monthlyTarget - currentMonthSales).toLocaleString()} remaining`
                            }
                        </p>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-white opacity-5" />
                    <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-16 h-16 rounded-full bg-white opacity-5" />
                </motion.div>
            </div>
        </div>
    );
};

export default Reports;
