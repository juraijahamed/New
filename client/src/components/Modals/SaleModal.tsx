import { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import { useData } from '../../context/DataContext';
import type { Sale } from '../../services/api';
import { Upload, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface SaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale?: Sale | null;
}

const SERVICES = [
    'Visa Services',
    'Ticketing',
    'Hotel Booking',
    'Tour Package',
    'Insurance',
    'Other',
];

const NATIONALITIES = [
    'Indian',
    'Pakistani',
    'Filipino',
    'Bangladeshi',
    'Egyptian',
    'British',
    'American',
    'Emirati',
    'Saudi',
    'Jordanian',
    'Lebanese',
    'Syrian',
    'Sudanese',
    'Nepali',
    'Sri Lankan',
    'Chinese',
    'Other',
];

const SaleModal: React.FC<SaleModalProps> = ({ isOpen, onClose, sale }) => {
    const { addSale, updateSale } = useData();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customService, setCustomService] = useState('');
    const [customNationality, setCustomNationality] = useState('');

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        agency: '',
        supplier: '',
        national: '',
        passport_number: '',
        service: '',
        net_rate: '',
        sales_rate: '',
        documents: '',
        remarks: '',
    });

    const profit = (parseFloat(formData.sales_rate) || 0) - (parseFloat(formData.net_rate) || 0);

    useEffect(() => {
        if (sale) {
            // Check if the stored service is in the list, if not it's a custom value
            const serviceInList = SERVICES.includes(sale.service || '');
            const nationalityInList = NATIONALITIES.includes(sale.national || '');

            setFormData({
                date: sale.date || new Date().toISOString().split('T')[0],
                agency: sale.agency || '',
                supplier: sale.supplier || '',
                national: nationalityInList ? (sale.national || '') : 'Other',
                passport_number: sale.passport_number || '',
                service: serviceInList ? (sale.service || '') : 'Other',
                net_rate: String(sale.net_rate || ''),
                sales_rate: String(sale.sales_rate || ''),
                documents: sale.documents || '',
                remarks: sale.remarks || '',
            });

            // Set custom values if not in list
            if (!serviceInList && sale.service) {
                setCustomService(sale.service);
            } else {
                setCustomService('');
            }
            if (!nationalityInList && sale.national) {
                setCustomNationality(sale.national);
            } else {
                setCustomNationality('');
            }
        } else {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                agency: '',
                supplier: '',
                national: '',
                passport_number: '',
                service: '',
                net_rate: '',
                sales_rate: '',
                documents: '',
                remarks: '',
            });
            setCustomService('');
            setCustomNationality('');
        }
        setError(null);
    }, [sale, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        // Use custom values if "Other" is selected
        const finalService = formData.service === 'Other' ? customService : formData.service;
        const finalNationality = formData.national === 'Other' ? customNationality : formData.national;

        try {
            const saleData = {
                date: formData.date,
                agency: formData.agency,
                supplier: formData.supplier,
                national: finalNationality,
                passport_number: formData.passport_number,
                service: finalService,
                net_rate: parseFloat(formData.net_rate) || 0,
                sales_rate: parseFloat(formData.sales_rate) || 0,
                profit,
                documents: formData.documents,
                remarks: formData.remarks,
            };

            if (sale?.id) {
                await updateSale(sale.id, saleData);
            } else {
                await addSale(saleData);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save sale');
            console.error('Error saving sale:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, documents: file.name });
        }
    };

    const inputStyle = {
        border: '2px solid #e8ddd0',
        background: '#fdf9f3',
        color: '#5D4037'
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={sale ? 'Edit Sale' : 'New Sale'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm"
                    >
                        {error}
                    </motion.div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Date</label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Service Type</label>
                        <select
                            required
                            value={formData.service}
                            onChange={(e) => {
                                setFormData({ ...formData, service: e.target.value });
                                if (e.target.value !== 'Other') setCustomService('');
                            }}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                        >
                            <option value="">Select service</option>
                            {SERVICES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Custom Service Input - shown when "Other" is selected */}
                {formData.service === 'Other' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Specify Service Type</label>
                        <input
                            type="text"
                            required
                            value={customService}
                            onChange={(e) => setCustomService(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                            placeholder="Enter custom service type..."
                        />
                    </motion.div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Agency/Client</label>
                        <input
                            type="text"
                            required
                            value={formData.agency}
                            onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                            placeholder="Client or Agency name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Supplier</label>
                        <input
                            type="text"
                            value={formData.supplier}
                            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                            placeholder="Supplier name"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Passport Number</label>
                        <input
                            type="text"
                            value={formData.passport_number}
                            onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                            placeholder="Passport No."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Nationality</label>
                        <select
                            value={formData.national}
                            onChange={(e) => {
                                setFormData({ ...formData, national: e.target.value });
                                if (e.target.value !== 'Other') setCustomNationality('');
                            }}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                        >
                            <option value="">Select nationality</option>
                            {NATIONALITIES.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Custom Nationality Input - shown when "Other" is selected */}
                {formData.national === 'Other' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Specify Nationality</label>
                        <input
                            type="text"
                            required
                            value={customNationality}
                            onChange={(e) => setCustomNationality(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                            placeholder="Enter nationality..."
                        />
                    </motion.div>
                )}

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Net Rate (AED)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formData.net_rate}
                            onChange={(e) => setFormData({ ...formData, net_rate: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Sales Rate (AED)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formData.sales_rate}
                            onChange={(e) => setFormData({ ...formData, sales_rate: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Profit (AED)</label>
                        <div
                            className="px-3 py-2.5 rounded-xl font-mono font-bold text-sm"
                            style={{
                                background: profit >= 0 ? 'rgba(46, 125, 50, 0.1)' : 'rgba(198, 40, 40, 0.1)',
                                border: `2px solid ${profit >= 0 ? '#2e7d32' : '#c62828'}`,
                                color: profit >= 0 ? '#2e7d32' : '#c62828'
                            }}
                        >
                            {profit.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Document Upload */}
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Document (Optional)</label>
                    <div className="flex items-center gap-2">
                        <label
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-amber-500"
                            style={{ borderColor: '#e8ddd0', background: '#fdf9f3' }}
                        >
                            <Upload size={16} style={{ color: '#A1887F' }} />
                            <span className="text-sm" style={{ color: '#8D6E63' }}>
                                {formData.documents || 'Click to upload receipt/document'}
                            </span>
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                            />
                        </label>
                        {formData.documents && (
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, documents: '' })}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Description (Optional)</label>
                    <textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none resize-none"
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                        onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                        rows={2}
                        placeholder="Additional notes..."
                    />
                </div>

                <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid rgba(218, 165, 32, 0.15)' }}>
                    <motion.button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm"
                        style={{ border: '1px solid rgba(218, 165, 32, 0.3)', color: '#5D4037' }}
                        whileHover={{ backgroundColor: 'rgba(218, 165, 32, 0.1)' }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Cancel
                    </motion.button>
                    <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium text-sm disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #DAA520 0%, #B8860B 100%)' }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {isSubmitting ? 'Saving...' : sale ? 'Update Sale' : 'Add Sale'}
                    </motion.button>
                </div>
            </form>
        </Modal>
    );
};

export default SaleModal;
