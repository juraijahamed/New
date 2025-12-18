import { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import { useData } from '../../context/DataContext';
import type { SupplierPayment } from '../../services/api';
import { fileUploadApi } from '../../services/api';
import { Upload, X } from 'lucide-react';

interface SupplierPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment?: SupplierPayment | null;
}

const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({ isOpen, onClose, payment }) => {
    const { addSupplierPayment, updateSupplierPayment } = useData();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        supplier_name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        receipt_url: '',
        remarks: '',
    });

    useEffect(() => {
        if (payment) {
            setFormData({
                supplier_name: payment.supplier_name || '',
                amount: String(payment.amount || ''),
                date: payment.date || new Date().toISOString().split('T')[0],
                receipt_url: payment.receipt_url || '',
                remarks: payment.remarks || '',
            });
        } else {
            setFormData({
                supplier_name: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                receipt_url: '',
                remarks: '',
            });
        }
        setSelectedFile(null);
    }, [payment, isOpen]);

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
                supplier_name: formData.supplier_name,
                amount: parseFloat(formData.amount),
                date: formData.date,
                receipt_url: receiptUrl,
                remarks: formData.remarks,
                status: 'draft',
            };

            if (payment?.id) {
                await updateSupplierPayment(payment.id, paymentData);
            } else {
                await addSupplierPayment(paymentData);
            }
            setSelectedFile(null);
            onClose();
        } catch (error) {
            console.error('Error saving payment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={payment ? 'Edit Payment' : 'New Supplier Payment'} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                    <input
                        type="text"
                        required
                        value={formData.supplier_name}
                        onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50"
                        placeholder="Enter supplier name"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50"
                        />
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                    <textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50 resize-none"
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
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : payment ? 'Update' : 'Add Payment'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default SupplierPaymentModal;
