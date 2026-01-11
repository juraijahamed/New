import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { type Sale, type SupplierPayment } from '../../services/api';

interface DailyStatementProps {
    data: (Sale | SupplierPayment)[];
    type: 'agency' | 'supplier';
}

interface AggregatedData {
    name: string;
    count: number;
    totalAmount: number;
    totalProfit?: number; // Only for agency
    pendingCount?: number;
    pendingAmount?: number;
    pendingProfit?: number;
}

const DailyStatement: React.FC<DailyStatementProps> = ({ data, type }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const aggregatedData = useMemo(() => {
        const filteredData = data.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.toISOString().split('T')[0] === selectedDate;
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
                    pendingCount: 0,
                    pendingAmount: 0,
                    pendingProfit: type === 'agency' ? 0 : undefined,
                };
            }

            const isPending = item.status === 'pending';
            const amount = (item as any).amount || (item as Sale).sales_rate || 0;
            const profit = type === 'agency' ? ((item as Sale).profit || 0) : 0;

            if (isPending) {
                groups[name].pendingCount = (groups[name].pendingCount || 0) + 1;
                groups[name].pendingAmount = (groups[name].pendingAmount || 0) + amount;
                if (type === 'agency') {
                    groups[name].pendingProfit = (groups[name].pendingProfit || 0) + profit;
                }
            } else {
                groups[name].count += 1;
                groups[name].totalAmount += amount;
                if (type === 'agency' && (item as Sale).profit) {
                    groups[name].totalProfit! += profit;
                }
            }
        });

        return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    }, [data, selectedDate, type]);

    const handleDateChange = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const handleExportPDF = () => {
        const pdf = new jsPDF();
        
        // Add title
        pdf.setFontSize(20);
        pdf.text(`${type === 'agency' ? 'Daily Sales' : 'Daily Supplier Payments'} Statement`, 20, 20);
        
        // Add date
        pdf.setFontSize(12);
        pdf.text(`Date: ${new Date(selectedDate).toLocaleDateString('en-GB')}`, 20, 30);
        
        // Add table headers
        pdf.setFontSize(10);
        pdf.text('Name', 20, 45);
        pdf.text('Count', 80, 45);
        pdf.text('Total Amount', 120, 45);
        if (type === 'agency') {
            pdf.text('Total Profit', 160, 45);
        }
        
        // Add data rows
        let yPosition = 55;
        aggregatedData.forEach((item, index) => {
            if (yPosition > 250) {
                pdf.addPage();
                yPosition = 20;
            }
            
            pdf.text(item.name, 20, yPosition);
            pdf.text(item.count.toString(), 80, yPosition);
            pdf.text(`AED ${item.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 120, yPosition);
            
            if (type === 'agency' && item.totalProfit !== undefined) {
                pdf.text(`AED ${item.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 160, yPosition);
            }
            
            yPosition += 10;
        });

        // Add totals
        const totalAmount = aggregatedData.reduce((sum, item) => sum + item.totalAmount, 0);
        const totalProfit = type === 'agency' 
            ? aggregatedData.reduce((sum, item) => sum + (item.totalProfit || 0), 0)
            : 0;
        
        pdf.setFontSize(12);
        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, yPosition + 5, 190, yPosition + 5);
        
        pdf.text('Total:', 20, yPosition + 15);
        pdf.text(`AED ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 120, yPosition + 15);
        
        if (type === 'agency') {
            pdf.text(`AED ${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 160, yPosition + 15);
        }

        pdf.save(`${type === 'agency' ? 'Daily_Sales' : 'Daily_Supplier_Payments'}_Statement_${selectedDate}.pdf`);
    };

    const totalAmount = aggregatedData.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalProfit = type === 'agency' 
        ? aggregatedData.reduce((sum, item) => sum + (item.totalProfit || 0), 0)
        : 0;
    const totalPendingAmount = aggregatedData.reduce((sum, item) => sum + (item.pendingAmount || 0), 0);
    const totalPendingProfit = type === 'agency'
        ? aggregatedData.reduce((sum, item) => sum + (item.pendingProfit || 0), 0)
        : 0;
    const totalPendingCount = aggregatedData.reduce((sum, item) => sum + (item.pendingCount || 0), 0);

    return (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {type === 'agency' ? 'Daily Sales' : 'Daily Supplier Payments'} Statement
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Breakdown by {type === 'agency' ? 'agency' : 'supplier'} for selected date
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                        <button
                            onClick={() => handleDateChange(-1)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            disabled={new Date(selectedDate) <= new Date('2000-01-01')}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-500" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent outline-none text-sm font-medium"
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        
                        <button
                            onClick={() => handleDateChange(1)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            disabled={new Date(selectedDate) >= new Date()}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                        <Download size={16} />
                        Export PDF
                    </button>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Total {type === 'agency' ? 'Sales' : 'Payments'}</p>
                    <p className="text-xl font-bold text-blue-800">
                        AED {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm text-amber-600 font-medium">Pending Amount</p>
                    <p className="text-xl font-bold text-amber-800">
                        AED {totalPendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">{totalPendingCount} items</p>
                </div>
                {type === 'agency' && (
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Total Profit</p>
                        <p className="text-xl font-bold text-green-800">
                            AED {totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                )}
                {type === 'agency' && (
                    <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">Pending Profit</p>
                        <p className="text-xl font-bold text-red-800">
                            AED {totalPendingProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                )}
            </div>

            {aggregatedData.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-lg">No data available for this date</p>
                    <p className="text-sm">Select a different date to view statements</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="text-left p-3 text-sm font-medium text-gray-700 border-b">
                                    {type === 'agency' ? 'Agency' : 'Supplier'}
                                </th>
                                <th className="text-right p-3 text-sm font-medium text-gray-700 border-b">Count</th>
                                <th className="text-right p-3 text-sm font-medium text-gray-700 border-b">
                                    Total Amount
                                </th>
                                <th className="text-right p-3 text-sm font-medium text-gray-700 border-b">Pending</th>
                                <th className="text-right p-3 text-sm font-medium text-gray-700 border-b">
                                    Pending Amount
                                </th>
                                {type === 'agency' && (
                                    <th className="text-right p-3 text-sm font-medium text-gray-700 border-b">
                                        Total Profit
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {aggregatedData.map((item, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                    <td className="p-3 text-sm font-medium text-gray-900">{item.name}</td>
                                    <td className="p-3 text-sm text-gray-600 text-right">{item.count}</td>
                                    <td className="p-3 text-sm font-mono text-gray-900 text-right">
                                        AED {item.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-sm text-amber-600 text-right font-medium">{item.pendingCount || 0}</td>
                                    <td className="p-3 text-sm font-mono text-amber-900 text-right font-bold">
                                        AED {(item.pendingAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    {type === 'agency' && (
                                        <td className="p-3 text-sm font-mono text-green-600 text-right">
                                            AED {item.totalProfit?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 font-semibold">
                                <td className="p-3 text-sm border-t">Total</td>
                                <td className="p-3 text-sm text-right border-t">
                                    {aggregatedData.reduce((sum, item) => sum + item.count, 0)}
                                </td>
                                <td className="p-3 text-sm font-mono text-gray-900 text-right border-t">
                                    AED {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-sm text-amber-600 text-right border-t font-medium">
                                    {totalPendingCount}
                                </td>
                                <td className="p-3 text-sm font-mono text-amber-900 text-right border-t font-bold">
                                    AED {totalPendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                {type === 'agency' && (
                                    <td className="p-3 text-sm font-mono text-green-700 text-right border-t">
                                        AED {totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                )}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DailyStatement;