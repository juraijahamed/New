import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

interface ChartProps {
    data: any[];
}

const FinancialTrendsChart = ({ data }: ChartProps) => {
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
                    className="text-sm rounded-lg px-3 py-1.5 transition-all focus:outline-none"
                    style={{
                        border: '1px solid rgba(218, 165, 32, 0.3)',
                        color: '#5D4037',
                        background: '#fdf9f3'
                    }}
                >
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>Last 90 Days</option>
                </select>
            </div>

            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#DAA520" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#DAA520" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c62828" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#c62828" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ddd0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8D6E63', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8D6E63', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid rgba(218, 165, 32, 0.3)',
                            boxShadow: '0 10px 30px -10px rgba(93, 64, 55, 0.2)',
                            background: 'white'
                        }}
                        labelStyle={{ color: '#5D4037', fontWeight: 600 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="#DAA520"
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
                </AreaChart>
            </ResponsiveContainer>
        </motion.div>
    );
};

export default FinancialTrendsChart;
