import { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import { useData } from '../../context/DataContext';
import type { Expense, SalaryPayment } from '../../services/api';
import { Upload, X, Receipt, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    expense?: Expense | SalaryPayment | null;
}

const CATEGORIES = [
    'Office Supplies',
    'Utilities',
    'Travel',
    'Marketing',
    'Software',
    'Equipment',
    'Rent',
    'Other',
];

const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, expense }) => {
    const { addExpense, updateExpense, addSalaryPayment, updateSalaryPayment, staff } = useData();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'salary'>('general');

    const [customCategory, setCustomCategory] = useState('');

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        receipt_url: '',
        remarks: '',
    });

    const [salaryData, setSalaryData] = useState({
        staff_id: '',
        staff_name: '',
        amount: '',
        advance: '',
        paid_month: new Date().toISOString().slice(0, 7),
        date: new Date().toISOString().split('T')[0],
        remarks: '',
    });

    useEffect(() => {
        if (expense) {
            // Check if it's a salary payment (has staff_id/name and NO category usually, but let's check unique fields)
            if ('staff_name' in expense) {
                // It's a salary payment (cast as SalaryPayment)
                const salary = expense as SalaryPayment;
                setSalaryData({
                    staff_id: String(salary.staff_id || ''),
                    staff_name: salary.staff_name || '',
                    amount: String(salary.amount || ''),
                    advance: String(salary.advance || ''),
                    paid_month: salary.paid_month || new Date().toISOString().slice(0, 7),
                    date: salary.date || new Date().toISOString().split('T')[0],
                    remarks: salary.remarks || '',
                });
                setActiveTab('salary');
                // Reset general form
                setFormData({
                    description: '',
                    amount: '',
                    category: '',
                    date: new Date().toISOString().split('T')[0],
                    receipt_url: '',
                    remarks: '',
                });
                setCustomCategory('');
            } else {
                // It's a general expense
                const exp = expense as Expense;
                const categoryInList = CATEGORIES.includes(exp.category || '');

                setFormData({
                    description: exp.description || '',
                    amount: String(exp.amount || ''),
                    category: categoryInList ? (exp.category || '') : 'Other',
                    date: exp.date || new Date().toISOString().split('T')[0],
                    receipt_url: exp.receipt_url || '',
                    remarks: exp.remarks || '',
                });

                if (!categoryInList && exp.category) {
                    setCustomCategory(exp.category);
                } else {
                    setCustomCategory('');
                }
                setActiveTab('general');
                // Reset salary data
                setSalaryData({
                    staff_id: '',
                    staff_name: '',
                    amount: '',
                    advance: '',
                    paid_month: new Date().toISOString().slice(0, 7),
                    date: new Date().toISOString().split('T')[0],
                    remarks: '',
                });
            }
        } else {
            // Reset all
            setFormData({
                description: '',
                amount: '',
                category: '',
                date: new Date().toISOString().split('T')[0],
                receipt_url: '',
                remarks: '',
            });
            setCustomCategory('');
            setSalaryData({
                staff_id: '',
                staff_name: '',
                amount: '',
                advance: '',
                paid_month: new Date().toISOString().slice(0, 7),
                date: new Date().toISOString().split('T')[0],
                remarks: '',
            });
            setActiveTab('general');
        }
        setError(null);
    }, [expense, isOpen]);

    const handleSubmitGeneral = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const finalCategory = formData.category === 'Other' ? customCategory : formData.category;

        try {
            const expenseData = {
                description: formData.description,
                amount: parseFloat(formData.amount),
                category: finalCategory,
                date: formData.date,
                receipt_url: formData.receipt_url,
                remarks: formData.remarks,
            };

            if (expense?.id) {
                await updateExpense(expense.id, expenseData);
            } else {
                await addExpense(expenseData);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitSalary = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const selectedStaff = staff.find(s => s.id === parseInt(salaryData.staff_id));
            const salaryPayment: Omit<SalaryPayment, 'id'> = {
                staff_id: parseInt(salaryData.staff_id),
                staff_name: selectedStaff?.name || salaryData.staff_name,
                amount: parseFloat(salaryData.amount),
                advance: parseFloat(salaryData.advance) || 0,
                paid_month: salaryData.paid_month,
                date: salaryData.date,
                remarks: salaryData.remarks,
            };

            if (expense && 'staff_name' in expense && expense.id) {
                // Update existing salary payment
                await updateSalaryPayment(expense.id, { ...salaryPayment, id: expense.id });
                // Note: We might want to update the linked expense record too, but for now just updating the payment table.
                // The linked expense update is tricky without a direct link ID.
            } else {
                // Add new
                await addSalaryPayment(salaryPayment);

                await addExpense({
                    description: `Salary - ${selectedStaff?.name || salaryData.staff_name} (${salaryData.paid_month})`,
                    amount: parseFloat(salaryData.amount),
                    category: 'Salary',
                    date: salaryData.date,
                    remarks: salaryData.remarks,
                });
            }

            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save salary payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, receipt_url: file.name });
        }
    };

    const handleStaffSelect = (staffId: string) => {
        const selectedStaff = staff.find(s => s.id === parseInt(staffId));
        setSalaryData({
            ...salaryData,
            staff_id: staffId,
            staff_name: selectedStaff?.name || '',
            amount: selectedStaff?.salary ? String(selectedStaff.salary) : salaryData.amount,
        });
    };

    const inputStyle = {
        border: '2px solid #e8ddd0',
        background: '#fdf9f3',
        color: '#5D4037'
    };



    return (
        <Modal isOpen={isOpen} onClose={onClose} title={expense ? (activeTab === 'salary' ? 'Edit Salary' : 'Edit Expense') : 'New Entry'} size="lg">
            {/* Tabs */}
            {!expense && (
                <div className="flex border-b mb-4 -mt-2" style={{ borderColor: 'rgba(218, 165, 32, 0.2)' }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                        style={{
                            borderColor: activeTab === 'general' ? '#DAA520' : 'transparent',
                            color: activeTab === 'general' ? '#DAA520' : '#8D6E63'
                        }}
                    >
                        <Receipt size={16} />
                        General Expense
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('salary')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                        style={{
                            borderColor: activeTab === 'salary' ? '#DAA520' : 'transparent',
                            color: activeTab === 'salary' ? '#DAA520' : '#8D6E63'
                        }}
                    >
                        <Wallet size={16} />
                        Salary Payment
                    </button>
                </div>
            )}

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm mb-4"
                >
                    {error}
                </motion.div>
            )}

            {/* General Expense Form */}
            {activeTab === 'general' && (
                <form onSubmit={handleSubmitGeneral} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Description</label>
                        <input
                            type="text"
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                            placeholder="Enter expense description"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Amount (AED)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                                onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                                placeholder="0.00"
                            />
                        </div>

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
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Category</label>
                        <select
                            required
                            value={formData.category}
                            onChange={(e) => {
                                setFormData({ ...formData, category: e.target.value });
                                if (e.target.value !== 'Other') setCustomCategory('');
                            }}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                        >
                            <option value="">Select category</option>
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Category Input - shown when "Other" is selected */}
                    {formData.category === 'Other' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Specify Category</label>
                            <input
                                type="text"
                                required
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                                onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                                placeholder="Enter custom category..."
                            />
                        </motion.div>
                    )}

                    {/* Receipt Upload */}
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Receipt (Optional)</label>
                        <div className="flex items-center gap-2">
                            <label
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all"
                                style={{ borderColor: '#e8ddd0', background: '#fdf9f3' }}
                            >
                                <Upload size={16} style={{ color: '#A1887F' }} />
                                <span className="text-sm" style={{ color: '#8D6E63' }}>
                                    {formData.receipt_url || 'Click to upload receipt'}
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                />
                            </label>
                            {formData.receipt_url && (
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, receipt_url: '' })}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Notes (Optional)</label>
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
                            {isSubmitting ? 'Saving...' : expense ? 'Update' : 'Add Expense'}
                        </motion.button>
                    </div>
                </form>
            )}

            {/* Salary Payment Form */}
            {activeTab === 'salary' && (
                <form onSubmit={handleSubmitSalary} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Staff Member</label>
                        <select
                            required
                            value={salaryData.staff_id}
                            onChange={(e) => handleStaffSelect(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                            onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                        >
                            <option value="">Select staff member</option>
                            {staff.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} - {s.position}
                                </option>
                            ))}
                        </select>
                        {staff.length === 0 && (
                            <p className="text-xs mt-1" style={{ color: '#A1887F' }}>No staff members. Add staff in Settings first.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Salary Amount (AED)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={salaryData.amount}
                                onChange={(e) => setSalaryData({ ...salaryData, amount: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                                onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Advance (AED)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={salaryData.advance}
                                onChange={(e) => setSalaryData({ ...salaryData, advance: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                                onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Paid Month</label>
                            <input
                                type="month"
                                required
                                value={salaryData.paid_month}
                                onChange={(e) => setSalaryData({ ...salaryData, paid_month: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                                onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Payment Date</label>
                            <input
                                type="date"
                                required
                                value={salaryData.date}
                                onChange={(e) => setSalaryData({ ...salaryData, date: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                                onBlur={(e) => e.target.style.borderColor = '#e8ddd0'}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Description (Optional)</label>
                        <textarea
                            value={salaryData.remarks}
                            onChange={(e) => setSalaryData({ ...salaryData, remarks: e.target.value })}
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
                            disabled={isSubmitting || staff.length === 0}
                            className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium text-sm disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #DAA520 0%, #B8860B 100%)' }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isSubmitting ? 'Saving...' : expense ? 'Update Payment' : 'Pay Salary'}
                        </motion.button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default ExpenseModal;
