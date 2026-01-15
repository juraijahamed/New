import { useState, useEffect, useMemo } from 'react';
import Modal from '../UI/Modal';
import { useData } from '../../context/DataContext';
import type { AgencyPayment, Sale } from '../../services/api';
import { fileUploadApi } from '../../services/api';
import { Upload, X } from 'lucide-react';

interface AgencyPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment?: AgencyPayment | null;
    agencyName?: string;
}

const AgencyPaymentModal: React.FC<AgencyPaymentModalProps> = ({ isOpen, onClose, payment, agencyName }) => {
    const { addAgencyPayment, updateAgencyPayment, sales } = useData();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Calculate agencies with pending amounts
    const pendingAgencies = useMemo(() => {
        const agencyGroups: { [key: string]: { pendingAmount: number; pendingCount: number } } = {};

        sales.forEach(sale => {
            if (sale.status === 'pending' && sale.agency) {
                const agencyName = sale.agency.trim();
                if (!agencyGroups[agencyName]) {
                    agencyGroups[agencyName] = { pendingAmount: 0, pendingCount: 0 };
                }
                agencyGroups[agencyName].pendingAmount += sale.sales_rate || 0;
                agencyGroups[agencyName].pendingCount += 1;
            }
        });

        return Object.entries(agencyGroups)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [sales]);

    const [formData, setFormData] = useState({
        agency_name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        receipt_url: '',
        remarks: '',
    });

    useEffect(() => {
        if (payment) {
            setFormData({
                agency_name: payment.agency_name || '',
                amount: String(payment.amount || ''),
                date: payment.date || new Date().toISOString().split('T')[0],
                receipt_url: payment.receipt_url || '',
                remarks: payment.remarks || '',
            });
        } else {
            setFormData({
                agency_name: agencyName || '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                receipt_url: '',
                remarks: '',
            });
        }
        setSelectedFile(null);
    }, [payment, agencyName, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let receiptUrl = formData.receipt_url;

            // Upload file if a new file is selected
            if (selectedFile) {
                const uploadResponse = await fileUploadApi.uploadSingle(selectedFile);
                receiptUrl = uploadResponse.path;
            }

            const paymentData = {
                agency_name: formData.agency_name,
                amount: parseFloat(formData.amount),
                date: formData.date,
                receipt_url: receiptUrl,
                remarks: formData.remarks,
                status: 'completed',
            };

            if (payment?.id) {
                await updateAgencyPayment(payment.id, paymentData);
            } else {
                await addAgencyPayment(paymentData);
            }
            setSelectedFile(null);
            onClose();
        } catch (error) {
            console.error('Error saving agency payment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={payment ? 'Edit Agency Payment' : 'New Agency Payment'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Agency Section */}
                <div className="bg-green-50/50 rounded-xl p-4 space-y-3 border border-green-100">
                    <h3 className="font-semibold text-sm text-green-900">Record Payment</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Agency</label>
                        <select
                            value={formData.agency_name}
                            onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
                            required
                        >
                            <option value="">Select an agency...</option>
                            {pendingAgencies.map((agency) => (
                                <option key={agency.name} value={agency.name}>
                                    {agency.name} - AED {agency.pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} pending
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (AED)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Receipt Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Receipt (Optional)</label>
                    <div className="flex items-center gap-2">
                        <label
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer transition-all bg-gray-50/50 hover:bg-gray-100/50"
                        >
                            <Upload size={16} className="text-gray-500" />
                            <span className="text-sm text-gray-600">
                                {formData.receipt_url || 'Click to upload receipt'}
                            </span>
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setSelectedFile(file);
                                        setFormData({ ...formData, receipt_url: file.name });
                                    }
                                }}
                            />
                        </label>
                        {formData.receipt_url && (
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData({ ...formData, receipt_url: '' });
                                    setSelectedFile(null);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                    <textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-gray-50/50 resize-none"
                        rows={2}
                        placeholder="Additional notes..."
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition-all shadow-lg shadow-green-500/25 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : payment ? 'Update' : 'Record Payment'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AgencyPaymentModal;
