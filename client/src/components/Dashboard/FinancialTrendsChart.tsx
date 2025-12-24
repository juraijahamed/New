import { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';

interface ChartProps {
    sales: any[];
    expenses: any[];
    showProfit?: boolean;
}

type TimeRange = '7' | '30' | '90' | '180' | '365';

const FinancialTrendsChart = ({ sales, expenses, showProfit = true }: ChartProps) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('7');

    // Calculate chart data based on selected time range
    const chartData = useMemo(() => {
        const days = parseInt(timeRange);
        const data: { name: string; sales: number; expenses: number; profit: number }[] = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // For longer time ranges, aggregate data by week or month
        if (days === 180) {
            // Aggregate by week for half-yearly view (approximately 26 weeks)
            const weeks: Record<string, { sales: number; expenses: number; startDate: Date }> = {};

            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                // Get week start (Sunday)
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                weekStart.setHours(0, 0, 0, 0);
                const weekKey = weekStart.toISOString().split('T')[0];

                if (!weeks[weekKey]) {
                    weeks[weekKey] = { sales: 0, expenses: 0, startDate: new Date(weekStart) };
                }

                weeks[weekKey].sales += sales
                    .filter(s => s.date === dateStr)
                    .reduce((sum, s) => sum + (s.sales_rate || 0), 0);

                weeks[weekKey].expenses += expenses
                    .filter(e => e.date === dateStr)
                    .reduce((sum, e) => sum + (e.amount || 0), 0);
            }

            // Sort weeks by date and create data points
            Object.entries(weeks)
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([, week]) => {
                    const profit = week.sales - week.expenses;
                    const label = `${week.startDate.getDate()} ${monthNames[week.startDate.getMonth()]}`;
                    data.push({
                        name: label,
                        sales: week.sales,
                        expenses: week.expenses,
                        profit: profit,
                    });
                });
        } else if (days === 365) {
            // Aggregate by month for yearly view
            const months: Record<string, { sales: number; expenses: number; month: number; year: number }> = {};

            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

                if (!months[monthKey]) {
                    months[monthKey] = { sales: 0, expenses: 0, month: date.getMonth(), year: date.getFullYear() };
                }

                months[monthKey].sales += sales
                    .filter(s => s.date === dateStr)
                    .reduce((sum, s) => sum + (s.sales_rate || 0), 0);

                months[monthKey].expenses += expenses
                    .filter(e => e.date === dateStr)
                    .reduce((sum, e) => sum + (e.amount || 0), 0);
            }

            // Sort months by date and create data points
            Object.entries(months)
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([, month]) => {
                    const profit = month.sales - month.expenses;
                    const label = `${monthNames[month.month]} ${month.year}`;
                    data.push({
                        name: label,
                        sales: month.sales,
                        expenses: month.expenses,
                        profit: profit,
                    });
                });
        } else {
            // Daily aggregation for shorter time ranges
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const daySales = sales
                    .filter(s => s.date === dateStr)
                    .reduce((sum, s) => sum + (s.sales_rate || 0), 0);

                const dayExpenses = expenses
                    .filter(e => e.date === dateStr)
                    .reduce((sum, e) => sum + (e.amount || 0), 0);

                const dayProfit = daySales - dayExpenses;

                // Format label based on time range
                let label: string;
                if (days === 7) {
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    label = dayNames[date.getDay()];
                } else if (days === 30) {
                    label = `${date.getDate()}/${date.getMonth() + 1}`;
                } else {
                    // For 90 days, show day and month
                    label = `${date.getDate()} ${monthNames[date.getMonth()]}`;
                }

                data.push({
                    name: label,
                    sales: daySales,
                    expenses: dayExpenses,
                    profit: dayProfit,
                });
            }
        }

        return data;
    }, [timeRange, sales, expenses]);
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl h-96 relative overflow-hidden"
            style={{
                border: '1px solid rgba(218, 165, 32, 0.15)',
                boxShadow: '0 4px 20px -5px rgba(218, 165, 32, 0.1)'
            }}
        >
            {/* Decorative corner accent */}
            <div
                className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10"
                style={{ background: 'linear-gradient(135deg, #DAA520, transparent)' }}
            />

            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-lg font-bold" style={{ color: '#5D4037' }}>Financial Performance</h3>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                    className="text-sm rounded-lg px-3 py-1.5 transition-all focus:outline-none cursor-pointer hover:shadow-sm"
                    style={{
                        border: '1px solid rgba(218, 165, 32, 0.3)',
                        color: '#5D4037',
                        background: '#fdf9f3'
                    }}
                >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="180">Last 6 Months</option>
                    <option value="365">Last Year</option>
                </select>
            </div>

            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2e7d32" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c62828" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#c62828" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1565c0" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#1565c0" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ddd0" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#8D6E63', fontSize: parseInt(timeRange) >= 90 ? 10 : 12 }}
                        dy={10}
                        angle={parseInt(timeRange) >= 90 ? -45 : 0}
                        textAnchor={parseInt(timeRange) >= 90 ? 'end' : 'middle'}
                        height={parseInt(timeRange) >= 90 ? 60 : 30}
                        interval="preserveStartEnd"
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8D6E63', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid rgba(218, 165, 32, 0.3)',
                            boxShadow: '0 10px 30px -10px rgba(93, 64, 55, 0.2)',
                            background: 'white'
                        }}
                        labelStyle={{ color: '#5D4037', fontWeight: 600 }}
                        formatter={(value: number | undefined, name: string | undefined) => {
                            const val = value || 0;
                            const formattedValue = Math.abs(val).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            });
                            return [`AED ${formattedValue}`, name || ''];
                        }}
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                        formatter={(value) => {
                            const colors: Record<string, string> = {
                                'Sales': '#2e7d32',
                                'Expenses': '#c62828',
                                'Profit': '#1565c0'
                            };
                            return <span style={{ color: colors[value] || '#5D4037', fontSize: '12px' }}>{value}</span>;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="#2e7d32"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorSales)"
                        name="Sales"
                    />
                    <Area
                        type="monotone"
                        dataKey="expenses"
                        stroke="#c62828"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorExpenses)"
                        name="Expenses"
                    />
                    {showProfit && (
                        <Area
                            type="monotone"
                            dataKey="profit"
                            stroke="#1565c0"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorProfit)"
                            name="Profit"
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </motion.div>
    );
};

export default FinancialTrendsChart;
