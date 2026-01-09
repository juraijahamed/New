import { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import { useData } from '../../context/DataContext';
import type { SupplierPayment } from '../../services/api';
import { fileUploadApi } from '../../services/api';
import { Upload, X } from 'lucide-react';
import { useSuggestions } from '../../context/SuggestionContext';
import AutocompleteInput from '../UI/AutocompleteInput';

interface SupplierPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment?: SupplierPayment | null;
}

const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({ isOpen, onClose, payment }) => {
    const { addSupplierPayment, updateSupplierPayment, sales } = useData();
    const suggestions = useSuggestions();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        supplier_name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        receipt_url: '',
        remarks: '',
        bus_supplier: '',
        bus_amount: '',
        visa_supplier: '',
        visa_amount: '',
        ticket_supplier: '',
        ticket_amount: '',
    });

    // Extract unique suppliers from sales by type
    const getBusSuppliers = () => {
        const suppliers = new Set<string>();
        sales.forEach(s => {
            if (s.bus_supplier) suppliers.add(s.bus_supplier.trim());
        });
        return Array.from(suppliers).filter(Boolean).sort();
    };

    const getVisaSuppliers = () => {
        const suppliers = new Set<string>();
        sales.forEach(s => {
            if (s.visa_supplier) suppliers.add(s.visa_supplier.trim());
        });
        return Array.from(suppliers).filter(Boolean).sort();
    };

    const getTicketSuppliers = () => {
        const suppliers = new Set<string>();
        sales.forEach(s => {
            if (s.ticket_supplier) suppliers.add(s.ticket_supplier.trim());
        });
        return Array.from(suppliers).filter(Boolean).sort();
    };

    useEffect(() => {
        if (payment) {
            setFormData({
                supplier_name: payment.supplier_name || '',
                amount: String(payment.amount || ''),
                date: payment.date || new Date().toISOString().split('T')[0],
                receipt_url: payment.receipt_url || '',
                remarks: payment.remarks || '',
                bus_supplier: payment.bus_supplier || '',
                bus_amount: String(payment.bus_amount || ''),
                visa_supplier: payment.visa_supplier || '',
                visa_amount: String(payment.visa_amount || ''),
                ticket_supplier: payment.ticket_supplier || '',
                ticket_amount: String(payment.ticket_amount || ''),
            });
        } else {
            setFormData({
                supplier_name: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                receipt_url: '',
                remarks: '',
                bus_supplier: '',
                bus_amount: '',
                visa_supplier: '',
                visa_amount: '',
                ticket_supplier: '',
                ticket_amount: '',
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
                bus_supplier: formData.bus_supplier || undefined,
                bus_amount: formData.bus_amount ? parseFloat(formData.bus_amount) : undefined,
                visa_supplier: formData.visa_supplier || undefined,
                visa_amount: formData.visa_amount ? parseFloat(formData.visa_amount) : undefined,
                ticket_supplier: formData.ticket_supplier || undefined,
                ticket_amount: formData.ticket_amount ? parseFloat(formData.ticket_amount) : undefined,
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

    const busSuppliers = getBusSuppliers();
    const visaSuppliers = getVisaSuppliers();
    const ticketSuppliers = getTicketSuppliers();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={payment ? 'Edit Supplier Payment' : 'New Supplier Payment'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Main Supplier Section */}
                <div className="bg-blue-50/50 rounded-xl p-4 space-y-3 border border-blue-100">
                    <h3 className="font-semibold text-sm text-blue-900">General Supplier</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                        <AutocompleteInput
                            value={formData.supplier_name}
                            onChange={(value) => setFormData({ ...formData, supplier_name: value })}
                            suggestions={suggestions.suppliers}
                            placeholder="Enter supplier name"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Bus Supplier Section */}
                <div className="bg-green-50/50 rounded-xl p-4 space-y-3 border border-green-100">
                    <h3 className="font-semibold text-sm text-green-900">Bus Supplier (Optional)</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bus Supplier Name</label>
                        {busSuppliers.length > 0 ? (
                            <select
                                value={formData.bus_supplier}
                                onChange={(e) => setFormData({ ...formData, bus_supplier: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
                            >
                                <option value="">-- Select Bus Supplier --</option>
                                {busSuppliers.map((supplier) => (
                                    <option key={supplier} value={supplier}>{supplier}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={formData.bus_supplier}
                                onChange={(e) => setFormData({ ...formData, bus_supplier: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
                                placeholder="No bus suppliers available"
                                disabled
                            />
                        )}
                    </div>

                    {formData.bus_supplier && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.bus_amount}
                                onChange={(e) => setFormData({ ...formData, bus_amount: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
                                placeholder="0.00"
                            />
                        </div>
                    )}
                </div>

                {/* Visa Supplier Section */}
                <div className="bg-purple-50/50 rounded-xl p-4 space-y-3 border border-purple-100">
                    <h3 className="font-semibold text-sm text-purple-900">Visa Supplier (Optional)</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Visa Supplier Name</label>
                        {visaSuppliers.length > 0 ? (
                            <select
                                value={formData.visa_supplier}
                                onChange={(e) => setFormData({ ...formData, visa_supplier: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                            >
                                <option value="">-- Select Visa Supplier --</option>
                                {visaSuppliers.map((supplier) => (
                                    <option key={supplier} value={supplier}>{supplier}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={formData.visa_supplier}
                                onChange={(e) => setFormData({ ...formData, visa_supplier: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                                placeholder="No visa suppliers available"
                                disabled
                            />
                        )}
                    </div>

                    {formData.visa_supplier && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.visa_amount}
                                onChange={(e) => setFormData({ ...formData, visa_amount: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                                placeholder="0.00"
                            />
                        </div>
                    )}
                </div>

                {/* Ticket Supplier Section */}
                <div className="bg-orange-50/50 rounded-xl p-4 space-y-3 border border-orange-100">
                    <h3 className="font-semibold text-sm text-orange-900">Ticket Supplier (Optional)</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Supplier Name</label>
                        {ticketSuppliers.length > 0 ? (
                            <select
                                value={formData.ticket_supplier}
                                onChange={(e) => setFormData({ ...formData, ticket_supplier: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white"
                            >
                                <option value="">-- Select Ticket Supplier --</option>
                                {ticketSuppliers.map((supplier) => (
                                    <option key={supplier} value={supplier}>{supplier}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={formData.ticket_supplier}
                                onChange={(e) => setFormData({ ...formData, ticket_supplier: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white"
                                placeholder="No ticket suppliers available"
                                disabled
                            />
                        )}
                    </div>

                    {formData.ticket_supplier && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.ticket_amount}
                                onChange={(e) => setFormData({ ...formData, ticket_amount: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white"
                                placeholder="0.00"
                            />
                        </div>
                    )}
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
