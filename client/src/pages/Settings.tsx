import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/UI/DataTable';
import { UserPlus, Edit2, Trash2, Loader2, Users, Download, Settings as SettingsIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import Modal from '../components/UI/Modal';
import ConfirmModal from '../components/UI/ConfirmModal';
import type { Staff } from '../services/api';

const POSITIONS = [
    'Manager',
    'Travel Agent',
    'Accountant',
    'IT Support',
    'HR',
    'Driver',
    'PRO',
    'Other',
];

const Settings = () => {
    const { staff, isLoading, addStaff, updateStaff, deleteStaff, expenses, sales } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
    const [customPosition, setCustomPosition] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        position: '',
        salary: '',
        phone: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEdit = (member: Staff) => {
        setSelectedStaff(member);

        const positionInList = POSITIONS.includes(member.position || '');

        if (!positionInList && member.position) {
            setCustomPosition(member.position);
        } else {
            setCustomPosition('');
        }

        setFormData({
            name: member.name || '',
            position: positionInList ? (member.position || '') : 'Other',
            salary: String(member.salary || ''),
            phone: member.phone || '',
        });
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setSelectedStaff(null);
        setCustomPosition('');
        setFormData({ name: '', position: '', salary: '', phone: '' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const finalPosition = formData.position === 'Other' ? customPosition : formData.position;

        try {
            const staffData = {
                name: formData.name,
                position: finalPosition,
                salary: parseFloat(formData.salary) || 0,
                phone: formData.phone,
            };

            if (selectedStaff?.id) {
                await updateStaff(selectedStaff.id, staffData);
            } else {
                await addStaff(staffData);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving staff:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (deleteTarget?.id) {
            await deleteStaff(deleteTarget.id);
            setDeleteTarget(null);
        }
    };

    const handleExportCSV = () => {
        // Combine all data
        const rows = [
            ['Type', 'Date', 'Description', 'Amount', 'Category/Service', 'Remarks'],
            ...expenses.map(e => ['Expense', e.date, e.description, e.amount, e.category, e.remarks || '']),
            ...sales.map(s => ['Sale', s.date, s.agency, s.sales_rate, s.service, s.remarks || '']),
        ];

        const csvContent = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hawk-financial-data-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const columns = useMemo<ColumnDef<Staff>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Name',
                cell: (info) => <span className="font-semibold text-gray-700">{info.getValue() as string}</span>,
            },
            {
                accessorKey: 'position',
                header: 'Position',
                cell: (info) => (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-600 border border-indigo-200">
                        {(info.getValue() as string) || '-'}
                    </span>
                ),
            },
            {
                accessorKey: 'salary',
                header: 'Monthly Salary',
                cell: (info) => (
                    <span className="font-mono font-medium text-gray-900">
                        AED {((info.getValue() as number) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                ),
            },
            {
                accessorKey: 'phone',
                header: 'Phone',
                cell: (info) => (
                    <span className="text-gray-600">{(info.getValue() as string) || '-'}</span>
                ),
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleEdit(row.original)}
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => setDeleteTarget(row.original)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    return (
        <div className="p-[13px] space-y-8 overflow-auto h-full">
            <div>
                <h1 className="text-3xl font-bold text-[var(--dark-brown)] flex items-center gap-3">
                    <SettingsIcon className="text-indigo-600" />
                    Settings
                </h1>
                <p className="text-gray-500 mt-1">Manage your account and application settings.</p>
            </div>

            {/* Staff Management Section */}
            <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Users className="text-indigo-600" size={24} />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">Staff Management</h2>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-2 rounded-[10px] flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all font-medium"
                    >
                        <UserPlus size={18} />
                        Add Staff
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : staff.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400 rounded-[2px]">
                        <p className="text-lg">No staff members yet</p>
                        <p className="text-sm">Click "Add Staff" to add team members</p>
                    </div>
                ) : (
                    <div className="overflow-auto">
                        <DataTable columns={columns} data={staff} />
                    </div>
                )}
            </div>

            {/* Data Management Section */}
            <div className="bg-white rounded-[6px] shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p className="font-medium text-gray-900">Export Financial Data</p>
                            <p className="text-sm text-gray-500">Download all data as CSV</p>
                        </div>
                        <button
                            onClick={handleExportCSV}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Download size={18} />
                            Export
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p className="font-medium text-gray-900">Application Info</p>
                            <p className="text-sm text-gray-500">HAWK Travelmate v2.0</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            Active
                        </span>
                    </div>
                </div>
            </div>

            {/* Staff Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedStaff ? 'Edit Staff' : 'Add Staff'} size="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50"
                            placeholder="Enter staff name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                        <select
                            value={formData.position}
                            onChange={(e) => {
                                setFormData({ ...formData, position: e.target.value });
                                if (e.target.value !== 'Other') setCustomPosition('');
                            }}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50"
                        >
                            <option value="">Select position</option>
                            {POSITIONS.map((pos) => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Position Input - shown when "Other" is selected */}
                    {formData.position === 'Other' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <label className="block text-sm font-medium text-gray-700 mb-1">Specify Position</label>
                            <input
                                type="text"
                                required
                                value={customPosition}
                                onChange={(e) => setCustomPosition(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50"
                                placeholder="Enter custom position"
                            />
                        </motion.div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (AED)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.salary}
                                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50"
                                placeholder="+971 XX XXX XXXX"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : selectedStaff ? 'Update' : 'Add Staff'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Remove Staff Member"
                message={`Are you sure you want to remove "${deleteTarget?.name}"? This action cannot be undone.`}
                confirmText="Remove"
                type="danger"
            />
        </div>
    );
};

export default Settings;
