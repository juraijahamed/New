import { TrendingUp, Activity, Target, Star, Download, Calendar, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import TransactionHistory from '../components/Reports/TransactionHistory';
import { useData } from '../context/DataContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef, useState } from 'react';

const Reports = () => {
    const { sales, isLoading } = useData();
    const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Filter data based on selected view mode
    const filteredSales = viewMode === 'monthly' 
        ? sales.filter((s) => {
            const saleDate = new Date(s.date);
            return saleDate.getMonth() === selectedMonth && saleDate.getFullYear() === selectedYear;
        })
        : sales.filter((s) => {
            const saleDate = new Date(s.date);
            return saleDate.toISOString().split('T')[0] === selectedDate;
        });


    // Calculate KPIs based on filtered data
    const totalSales = filteredSales.reduce((sum, s) => sum + (s.sales_rate || 0), 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : '0.0';
    const avgSaleValue = filteredSales.length > 0 ? (totalSales / filteredSales.length).toFixed(0) : '0';

    // Calculate monthly goal progress (using filtered sales)
    const monthlyTarget = 1000;
    const goalProgress = Math.min((totalSales / monthlyTarget) * 100, 100);

    const [isExporting, setIsExporting] = useState(false);

    // Calculate MoM growth for monthly view, daily growth for daily view
    const getPrevMonthYear = (month: number, year: number) => {
        if (month === 0) return { month: 11, year: year - 1 };
        return { month: month - 1, year };
    };
    
    const getPrevDay = (dateString: string) => {
        const date = new Date(dateString);
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    };

    const { month: prevMonth, year: prevYear } = getPrevMonthYear(selectedMonth, selectedYear);
    const prevDay = getPrevDay(selectedDate);
    
    const prevMonthSales = sales.filter((s) => {
        const d = new Date(s.date);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });
    const prevDaySales = sales.filter((s) => {
        const d = new Date(s.date);
        return d.toISOString().split('T')[0] === prevDay;
    });
    
    const prevTotalSales = viewMode === 'monthly' 
        ? prevMonthSales.reduce((sum, s) => sum + (s.sales_rate || 0), 0)
        : prevDaySales.reduce((sum, s) => sum + (s.sales_rate || 0), 0);
    
    const momGrowth = (() => {
        if (prevTotalSales === 0) {
            return totalSales === 0 ? '0' : '+100';
        }
        const delta = ((totalSales - prevTotalSales) / prevTotalSales) * 100;
        const rounded = Math.round(delta);
        return `${rounded >= 0 ? '+' : ''}${rounded}`;
    })();

    const reportRef = useRef<HTMLDivElement>(null);
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const handleExportPDF = async () => {
        const sourceElement = document.getElementById('report-capture-area');
        if (!sourceElement) return;

        setIsExporting(true);
        try {
            // Wait for any animations to complete
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Create a temporary container for the capture
            const captureContainer = document.createElement('div');
            captureContainer.style.position = 'fixed';
            captureContainer.style.top = '0';
            captureContainer.style.left = '-99999px';
            captureContainer.style.width = '1200px';
            captureContainer.style.zIndex = '-9999';
            captureContainer.style.backgroundColor = '#fdf9f3';

            // Clone the content
            const clonedContent = sourceElement.cloneNode(true) as HTMLElement;

            // Apply specific styles to the clone for better PDF rendering
            clonedContent.style.height = 'auto';
            clonedContent.style.overflow = 'visible';
            clonedContent.style.padding = '40px';
            clonedContent.style.background = '#fdf9f3';
            clonedContent.style.width = '1200px';

            // Disable all animations and transitions in the clone
            const allElements = clonedContent.querySelectorAll('*');
            allElements.forEach(el => {
                const element = el as HTMLElement;
                element.style.animation = 'none';
                element.style.transition = 'none';
                element.style.transform = 'none';
                element.style.opacity = '1';
                element.style.overflow = 'visible';
                element.style.whiteSpace = 'normal';
                element.style.textOverflow = 'clip';

                // Remove truncation and animation classes
                if (element.classList.contains('truncate')) {
                    element.classList.remove('truncate');
                }
                if (element.classList.contains('animate-spin')) {
                    element.classList.remove('animate-spin');
                }
            });

            captureContainer.appendChild(clonedContent);
            document.body.appendChild(captureContainer);

            // Wait for layout to stabilize
            await new Promise(resolve => setTimeout(resolve, 1000));

            const canvas = await html2canvas(clonedContent, {
                scale: 2,
                useCORS: true,
                logging: true,
                backgroundColor: '#fdf9f3',
                width: 1200,
                height: clonedContent.scrollHeight,
                windowWidth: 1200,
                windowHeight: clonedContent.scrollHeight,
                removeContainer: false
            });

            // Remove the temporary container
            document.body.removeChild(captureContainer);

            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            const totalPdfHeight = (imgHeight * pdfWidth) / imgWidth;

            let heightLeft = totalPdfHeight;
            let position = 0;

            // Generate pages
            while (heightLeft > 0) {
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPdfHeight, undefined, 'FAST');
                heightLeft -= pdfHeight;
                position -= pdfHeight;

                if (heightLeft > 0) {
                    pdf.addPage();
                }
            }

            const fileName = viewMode === 'monthly' 
                ? `Monthly_Report_${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })}_${selectedYear}.pdf`
                : `Daily_Report_${selectedDate}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error('Export failed:', error);
            alert('PDF export failed. Please check the console for details.');
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-[10px] flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="p-[10px] pb-4 flex-shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--dark-brown)] flex items-center gap-3">
                        <TrendingUp className="text-indigo-600" />
                        Reports & Analytics
                    </h1>
                    <p className="text-gray-500 mt-1">Detailed breakdown of your financial activities.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                        <button
                            onClick={() => setViewMode('monthly')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'monthly' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Calendar size={16} />
                                Monthly
                            </div>
                        </button>
                        <button
                            onClick={() => setViewMode('daily')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'daily' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                            <div className="flex items-center gap-2">
                                <CalendarDays size={16} />
                                Daily
                            </div>
                        </button>
                    </div>

                    {/* Date Selection */}
                    {viewMode === 'monthly' ? (
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="text-sm font-medium text-gray-700 outline-none bg-transparent"
                            >
                                {months.map((month, index) => (
                                    <option key={month} value={index}>{month}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="text-sm font-medium text-gray-700 outline-none bg-transparent"
                            >
                                {years.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="text-sm font-medium text-gray-700 outline-none bg-transparent"
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    )}

                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Download size={18} />
                        )}
                        {isExporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-[10px] pb-[10px]" ref={reportRef}>
                <div className="space-y-8" id="report-capture-area">
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
                                        : `AED ${(monthlyTarget - totalSales).toLocaleString()} remaining`
                                    }
                                </p>
                            </div>
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-white opacity-5" />
                            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-16 h-16 rounded-full bg-white opacity-5" />
                        </motion.div>
                    </div>

                    {/* Transaction History */}
                    <TransactionHistory 
                        filterMonth={viewMode === 'monthly' ? selectedMonth : undefined}
                        filterYear={viewMode === 'monthly' ? selectedYear : undefined}
                        filterDate={viewMode === 'daily' ? selectedDate : undefined}
                        viewMode={viewMode}
                    />
                </div>
            </div>
        </div>
    );
};

export default Reports;
