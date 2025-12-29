import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { type Sale, type SupplierPayment } from '../../services/api';

interface MonthlyStatementProps {
    data: (Sale | SupplierPayment)[];
    type: 'agency' | 'supplier';
}

interface AggregatedData {
    name: string;
    count: number;
    totalAmount: number;
    totalProfit?: number; // Only for agency
}

const MonthlyStatement: React.FC<MonthlyStatementProps> = ({ data, type }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    const aggregatedData = useMemo(() => {
        const filteredData = data.filter(item => {
            const itemDate = new Date(item.date);
            return (
                itemDate.getMonth() === selectedDate.getMonth() &&
                itemDate.getFullYear() === selectedDate.getFullYear()
            );
        });

        const groups: { [key: string]: AggregatedData } = {};

        filteredData.forEach(item => {
            const name = type === 'agency' 
                ? (item as Sale).agency 
                : (item as SupplierPayment).supplier_name;
            
            // Skip if name is empty
            if (!name) return;

            if (!groups[name]) {
                groups[name] = {
                    name,
                    count: 0,
                    totalAmount: 0,
                    totalProfit: type === 'agency' ? 0 : undefined,
                };
            }

            groups[name].count += 1;
            
            if (type === 'agency') {
                const sale = item as Sale;
                groups[name].totalAmount += sale.sales_rate || 0;
                groups[name].totalProfit = (groups[name].totalProfit || 0) + (sale.profit || 0);
            } else {
                const payment = item as SupplierPayment;
                groups[name].totalAmount += payment.amount || 0;
            }
        });

        return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
    }, [data, selectedDate, type]);

    const totals = useMemo(() => {
        return aggregatedData.reduce((acc, curr) => ({
            amount: acc.amount + curr.totalAmount,
            profit: acc.profit + (curr.totalProfit || 0),
            count: acc.count + curr.count,
        }), { amount: 0, profit: 0, count: 0 });
    }, [aggregatedData]);

    const changeMonth = (increment: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setSelectedDate(newDate);
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const monthYear = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const title = `${type === 'agency' ? 'Agency' : 'Supplier'} Monthly Statement - ${monthYear}`;

        // Header
        doc.setFontSize(20);
        doc.setTextColor(44, 62, 80);
        doc.text(title, 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

        // Table Header
        let y = 45;
        const headers = type === 'agency' 
            ? ['Agency Name', 'Transactions', 'Total Sales (AED)', 'Total Profit (AED)']
            : ['Supplier Name', 'Transactions', 'Total Amount (AED)'];
        
        const colWidths = type === 'agency' 
            ? [70, 30, 45, 45]
            : [90, 40, 60];

        // Draw Header Background
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 5, 190, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        let x = 14;
        headers.forEach((header, i) => {
            doc.text(header, x, y);
            x += colWidths[i];
        });

        y += 8;

        // Rows
        doc.setFont('helvetica', 'normal');
        aggregatedData.forEach((row) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
                // Redraw header on new page
                doc.setFillColor(240, 240, 240);
                doc.rect(14, y - 5, 190, 8, 'F');
                doc.setFont('helvetica', 'bold');
                let headerX = 14;
                headers.forEach((header, i) => {
                    doc.text(header, headerX, y);
                    headerX += colWidths[i];
                });
                y += 8;
                doc.setFont('helvetica', 'normal');
            }

            x = 14;
            // Name
            doc.text(row.name.substring(0, 35), x, y); // Truncate if too long
            x += colWidths[0];
            
            // Count
            doc.text(row.count.toString(), x, y);
            x += colWidths[1];
            
            // Amount
            doc.text(row.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y);
            x += colWidths[2];
            
            // Profit (if agency)
            if (type === 'agency' && row.totalProfit !== undefined) {
                doc.setTextColor(row.totalProfit >= 0 ? 0 : 200, row.totalProfit >= 0 ? 100 : 0, 0); // Greenish or Red
                doc.text(row.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y);
                doc.setTextColor(0); // Reset
            }

            y += 7;
        });

        // Grand Total Line
        y += 2;
        doc.setLineWidth(0.5);
        doc.line(14, y, 204, y);
        y += 6;

        doc.setFont('helvetica', 'bold');
        x = 14;
        doc.text('Grand Total', x, y);
        x += colWidths[0];
        doc.text(totals.count.toString(), x, y);
        x += colWidths[1];
        doc.text(totals.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y);
        
        if (type === 'agency') {
            x += colWidths[2];
            doc.text(totals.profit.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y);
        }

        doc.save(`${type}_statement_${monthYear.replace(/ /g, '_')}.pdf`);
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            {/* Header Controls */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                        <button 
                            onClick={() => changeMonth(-1)}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="px-4 font-semibold text-gray-700 min-w-[140px] text-center flex items-center justify-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <button 
                            onClick={() => changeMonth(1)}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <button
                    onClick={generatePDF}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                >
                    <Download size={18} />
                    Download PDF
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-600 font-medium mb-1">Total {type === 'agency' ? 'Agencies' : 'Suppliers'}</p>
                    <p className="text-2xl font-bold text-blue-900">{aggregatedData.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <p className="text-sm text-green-600 font-medium mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-green-900">AED {totals.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                {type === 'agency' && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                        <p className="text-sm text-purple-600 font-medium mb-1">Total Profit</p>
                        <p className="text-2xl font-bold text-purple-900">AED {totals.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                )}
                 {type === 'supplier' && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                        <p className="text-sm text-orange-600 font-medium mb-1">Total Transactions</p>
                        <p className="text-2xl font-bold text-orange-900">{totals.count}</p>
                    </div>
                )}
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">{type === 'agency' ? 'Agency Name' : 'Supplier Name'}</th>
                            <th className="px-6 py-3 text-center">Transactions</th>
                            <th className="px-6 py-3 text-right">Total Amount</th>
                            {type === 'agency' && <th className="px-6 py-3 text-right">Total Profit</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {aggregatedData.length === 0 ? (
                            <tr>
                                <td colSpan={type === 'agency' ? 4 : 3} className="px-6 py-12 text-center text-gray-400">
                                    No transactions found for this month
                                </td>
                            </tr>
                        ) : (
                            aggregatedData.map((row, index) => (
                                <tr key={index} className="bg-white hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {row.name}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-600">
                                        {row.count}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                                        AED {row.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    {type === 'agency' && (
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${(row.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            AED {(row.totalProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                    {aggregatedData.length > 0 && (
                        <tfoot className="bg-gray-50 font-semibold text-gray-900 sticky bottom-0">
                            <tr>
                                <td className="px-6 py-3">Grand Total</td>
                                <td className="px-6 py-3 text-center">{totals.count}</td>
                                <td className="px-6 py-3 text-right font-mono">
                                    AED {totals.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                {type === 'agency' && (
                                    <td className="px-6 py-3 text-right font-mono text-green-700">
                                        AED {totals.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                )}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default MonthlyStatement;
