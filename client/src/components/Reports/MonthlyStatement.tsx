import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { Download, ChevronLeft, ChevronRight, Calendar, Receipt } from 'lucide-react';
import { type Sale, type SupplierPayment } from '../../services/api';
import AgencyPaymentModal from '../Modals/AgencyPaymentModal';

interface MonthlyStatementProps {
    data: (Sale | SupplierPayment)[] | Sale[] | SupplierPayment[];
    type: 'agency' | 'supplier';
}

interface AggregatedData {
    name: string;
    count: number;
    totalAmount: number;
    totalProfit?: number;
    pendingCount?: number;
    pendingAmount?: number;
    pendingProfit?: number;
}

const MonthlyStatement: React.FC<MonthlyStatementProps> = ({ data, type }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedAgency, setSelectedAgency] = useState<string>('');

    const aggregatedData = useMemo(() => {
        const sales: Sale[] = [];
        const supplierPayments: SupplierPayment[] = [];

        data.forEach(item => {
            if ((item as any).supplier_name !== undefined) {
                supplierPayments.push(item as SupplierPayment);
            } else if ((item as any).agency !== undefined) {
                sales.push(item as Sale);
            }
        });

        const month = selectedDate.getMonth();
        const year = selectedDate.getFullYear();

        if (type === 'agency') {
            const filteredSales = sales.filter(s => {
                const d = new Date(s.date);
                return d.getMonth() === month && d.getFullYear() === year;
            });

            const agencyGroups: { [key: string]: AggregatedData } = {};

            filteredSales.forEach(s => {
                const agencyName = s.agency?.trim();
                if (!agencyName) return;

                if (!agencyGroups[agencyName]) {
                    agencyGroups[agencyName] = {
                        name: agencyName,
                        count: 0,
                        totalAmount: 0,
                        totalProfit: 0,
                        pendingCount: 0,
                        pendingAmount: 0,
                        pendingProfit: 0,
                    };
                }

                const isPending = s.status === 'pending';
                const group = agencyGroups[agencyName];
                const receivedAmount = s.received_amount || 0;
                const outstandingAmount = (s.sales_rate || 0) - receivedAmount;

                if (isPending && outstandingAmount > 0) {
                    group.pendingCount = (group.pendingCount || 0) + 1;
                    group.pendingAmount = (group.pendingAmount || 0) + outstandingAmount;
                    group.pendingProfit = (group.pendingProfit || 0) + (s.profit || 0);
                } else {
                    group.count += 1;
                    group.totalAmount += s.sales_rate || 0;
                    group.totalProfit = (group.totalProfit || 0) + (s.profit || 0);
                }
            });

            return Object.values(agencyGroups).sort((a, b) => a.name.localeCompare(b.name));
        } else {
            const filteredPayments = supplierPayments.filter(p => {
                const d = new Date(p.date);
                return d.getMonth() === month && d.getFullYear() === year;
            });
            const filteredSales = sales.filter(s => {
                const d = new Date(s.date);
                return d.getMonth() === month && d.getFullYear() === year;
            });

            const supplierSet = new Set<string>();

            filteredPayments.forEach(p => {
                if (p.supplier_name && p.supplier_name.trim()) supplierSet.add(p.supplier_name.trim());
            });

            filteredSales.forEach(s => {
                if (s.supplier && s.supplier.trim()) supplierSet.add(s.supplier.trim());
                if (s.bus_supplier && s.bus_supplier.trim()) supplierSet.add(s.bus_supplier.trim());
                if (s.visa_supplier && s.visa_supplier.trim()) supplierSet.add(s.visa_supplier.trim());
                if (s.ticket_supplier && s.ticket_supplier.trim()) supplierSet.add(s.ticket_supplier.trim());
            });

            const groups: { [key: string]: AggregatedData } = {};
            supplierSet.forEach(name => {
                groups[name] = {
                    name,
                    count: 0,
                    totalAmount: 0,
                    pendingCount: 0,
                    pendingAmount: 0,
                };
            });

            filteredPayments.forEach(p => {
                const name = p.supplier_name?.trim();
                if (!name || !groups[name]) return;
                const isPending = p.status === 'pending';
                const group = groups[name];
                if (isPending) {
                    group.pendingCount = (group.pendingCount || 0) + 1;
                    group.pendingAmount = (group.pendingAmount || 0) + (p.amount || 0);
                } else {
                    group.count += 1;
                    group.totalAmount += p.amount || 0;
                }
            });

            filteredSales.forEach(s => {
                const isPending = s.status === 'pending';

                const suppliers = [
                    s.supplier,
                    s.bus_supplier,
                    s.visa_supplier,
                    s.ticket_supplier,
                ];

                suppliers.forEach(supplierName => {
                    if (supplierName && supplierName.trim() && groups[supplierName.trim()]) {
                        const group = groups[supplierName.trim()];
                        if (isPending) {
                            group.pendingCount = (group.pendingCount || 0) + 1;
                            group.pendingAmount = (group.pendingAmount || 0) + (s.net_rate || 0);
                        } else {
                            group.count += 1;
                            group.totalAmount += s.net_rate || 0;
                        }
                    }
                });
            });

            return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
        }
    }, [data, selectedDate, type]);

    const totals = useMemo(() => {
        return aggregatedData.reduce((acc, curr) => ({
            amount: acc.amount + curr.totalAmount,
            profit: acc.profit + (curr.totalProfit || 0),
            count: acc.count + curr.count,
            pendingAmount: acc.pendingAmount + (curr.pendingAmount || 0),
            pendingProfit: acc.pendingProfit + (curr.pendingProfit || 0),
            pendingCount: acc.pendingCount + (curr.pendingCount || 0),
        }), { amount: 0, profit: 0, count: 0, pendingAmount: 0, pendingProfit: 0, pendingCount: 0 });
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

        doc.setFontSize(20);
        doc.setTextColor(44, 62, 80);
        doc.text(title, 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

        let y = 45;
        const headers = type === 'agency'
            ? ['Agency Name', 'Transactions', 'Total Sales (AED)', 'Total Profit (AED)']
            : ['Supplier Name', 'Transactions', 'Total Amount (AED)'];

        const colWidths = type === 'agency'
            ? [70, 30, 45, 45]
            : [90, 40, 60];

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

        doc.setFont('helvetica', 'normal');
        aggregatedData.forEach((row) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
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
            doc.text(row.name.substring(0, 35), x, y);
            x += colWidths[0];

            doc.text(row.count.toString(), x, y);
            x += colWidths[1];

            doc.text(row.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y);
            x += colWidths[2];

            if (type === 'agency' && row.totalProfit !== undefined) {
                doc.setTextColor(row.totalProfit >= 0 ? 0 : 200, row.totalProfit >= 0 ? 100 : 0, 0);
                doc.text(row.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y);
                doc.setTextColor(0);
            }

            y += 7;
        });

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

                <div className="flex gap-3">
                    {type === 'agency' && totals.pendingAmount > 0 && (
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <Receipt size={18} />
                            Enter Received Amount
                        </button>
                    )}
                    <button
                        onClick={generatePDF}
                        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        <Download size={18} />
                        Download PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-600 font-medium mb-1">Total {type === 'agency' ? 'Agencies' : 'Suppliers'}</p>
                    <p className="text-2xl font-bold text-blue-900">{aggregatedData.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <p className="text-sm text-green-600 font-medium mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-green-900">AED {totals.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <p className="text-sm text-amber-600 font-medium mb-1">Pending Amount</p>
                    <p className="text-2xl font-bold text-amber-900">AED {totals.pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-amber-600 mt-1">{totals.pendingCount} items</p>
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

            <div className="flex-1 overflow-auto border border-gray-200 rounded-lg mb-6">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">{type === 'agency' ? 'Agency Name' : 'Supplier Name'}</th>
                            <th className="px-6 py-3 text-center">Transactions</th>
                            <th className="px-6 py-3 text-right">Total Amount</th>
                            <th className="px-6 py-3 text-center">Pending</th>
                            <th className="px-6 py-3 text-right">Pending Amount</th>
                            {type === 'agency' && <th className="px-6 py-3 text-right">Total Profit</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {aggregatedData.length === 0 ? (
                            <tr>
                                <td colSpan={type === 'agency' ? 6 : 5} className="px-6 py-12 text-center">
                                    <div className="text-gray-400">
                                        <p className="text-base mb-2">No transactions found for this month</p>
                                        <p className="text-sm text-gray-500 mt-3">
                                            {type === 'agency'
                                                ? 'Agency statements show sales grouped by agency with profit calculations.'
                                                : 'Supplier statements show only auto-generated payments from sales forms.'}
                                        </p>
                                    </div>
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
                                    <td className="px-6 py-4 text-center text-amber-600 font-medium">
                                        {row.pendingCount || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-amber-900">
                                        AED {(row.pendingAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                                <td className="px-6 py-3 text-center text-amber-600">{totals.pendingCount}</td>
                                <td className="px-6 py-3 text-right font-mono text-amber-900">
                                    AED {totals.pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

            <AgencyPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                agencyName={selectedAgency}
            />
        </div>
    );
};

export default MonthlyStatement;
