import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/UI/DataTable';
import { UserPlus, Edit2, Trash2, Loader2, Users, Download, Settings as SettingsIcon, Plus, List } from 'lucide-react';
import { useData } from '../context/DataContext';
import Modal from '../components/UI/Modal';
import ConfirmModal from '../components/UI/ConfirmModal';
import type { Staff, DropdownOption } from '../services/api';
import { dropdownOptionsApi } from '../services/api';

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
    const [positions, setPositions] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        position: '',
        salary: '',
        phone: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load positions from database
    useEffect(() => {
        loadPositions();
    }, []);

    const loadPositions = async () => {
        try {
            const positionOptions = await dropdownOptionsApi.getAll('position');
            setPositions(positionOptions.map(opt => opt.value).concat('Other'));
        } catch (error) {
            console.error('Error loading positions:', error);
            setPositions(POSITIONS); // Fallback to hardcoded
        }
    };

    // Dropdown management state
    const [dropdownOptions, setDropdownOptions] = useState<DropdownOption[]>([]);
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);
    const [activeDropdownType, setActiveDropdownType] = useState<'service' | 'nationality' | 'category' | 'position'>('service');
    const [isDropdownModalOpen, setIsDropdownModalOpen] = useState(false);
    const [selectedDropdownOption, setSelectedDropdownOption] = useState<DropdownOption | null>(null);
    const [deleteDropdownTarget, setDeleteDropdownTarget] = useState<DropdownOption | null>(null);
    const [dropdownFormData, setDropdownFormData] = useState({ value: '', color: '' });
    const [isSubmittingDropdown, setIsSubmittingDropdown] = useState(false);

    // Load dropdown options
    useEffect(() => {
        loadDropdownOptions();
    }, [activeDropdownType]);

    const loadDropdownOptions = async () => {
        setIsLoadingDropdowns(true);
        try {
            const typeMap = { 
                service: 'service', 
                nationality: 'nationality', 
                category: 'category',
                position: 'position'
            };
            const options = await dropdownOptionsApi.getAll(typeMap[activeDropdownType]);
            setDropdownOptions(options);
        } catch (error) {
            console.error('Error loading dropdown options:', error);
        } finally {
            setIsLoadingDropdowns(false);
        }
    };

    const handleEdit = (member: Staff) => {
        setSelectedStaff(member);

        const positionInList = positions.includes(member.position || '');

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

    // Dropdown management handlers
    const handleAddDropdownOption = () => {
        setSelectedDropdownOption(null);
        setDropdownFormData({ value: '', color: '' });
        setIsDropdownModalOpen(true);
    };

    const handleEditDropdownOption = (option: DropdownOption) => {
        setSelectedDropdownOption(option);
        setDropdownFormData({ value: option.value, color: option.color || '' });
        setIsDropdownModalOpen(true);
    };

    const handleSubmitDropdownOption = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingDropdown(true);
        try {
            const typeMap = { 
                service: 'service', 
                nationality: 'nationality', 
                category: 'category',
                position: 'position'
            };
            
            if (selectedDropdownOption?.id) {
                await dropdownOptionsApi.update(selectedDropdownOption.id, {
                    value: dropdownFormData.value,
                    type: typeMap[activeDropdownType],
                });
            } else {
                await dropdownOptionsApi.create({
                    type: typeMap[activeDropdownType],
                    value: dropdownFormData.value,
                    display_order: 0,
                });
            }
            setIsDropdownModalOpen(false);
            await loadDropdownOptions();
        } catch (error: any) {
            console.error('Error saving dropdown option:', error);
            alert(error?.response?.data?.error || 'Failed to save dropdown option. Please try again.');
        } finally {
            setIsSubmittingDropdown(false);
        }
    };

    const handleDeleteDropdownOption = async () => {
        if (deleteDropdownTarget?.id) {
            try {
                await dropdownOptionsApi.delete(deleteDropdownTarget.id);
                setDeleteDropdownTarget(null);
                await loadDropdownOptions();
            } catch (error) {
                console.error('Error deleting dropdown option:', error);
            }
        }
    };

    const dropdownColumns = useMemo<ColumnDef<DropdownOption>[]>(
        () => [
            {
                accessorKey: 'value',
                header: 'Value',
                size: 200,
                cell: (info) => {
                    const option = info.row.original;
                    return (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700 text-sm">{info.getValue() as string}</span>
                            {option.color && (
                                <div 
                                    className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
                                    style={{ backgroundColor: option.color }}
                                    title={`Color: ${option.color}`}
                                />
                            )}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: 'Actions',
                size: 100,
                cell: ({ row }) => (
                    <div className="flex gap-1 items-center justify-center">
                        <button
                            onClick={() => handleEditDropdownOption(row.original)}
                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                            title="Edit"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={() => setDeleteDropdownTarget(row.original)}
                            className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    const columns = useMemo<ColumnDef<Staff>[]>(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                cell: (info) => (
                    <span className="font-mono text-xs text-gray-500">
                        {info.getValue() as number || '-'}
                    </span>
                ),
            },
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
                        <h2 className="text-xl font-semibold text-[var(--dark-brown)]">Staff Management</h2>
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
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400 rounded-[6px]">
                        <p className="text-lg">No staff members yet</p>
                        <p className="text-sm">Click "Add Staff" to add team members</p>
                    </div>
                ) : (
                    <div className="overflow-auto">
                        <DataTable columns={columns} data={staff} />
                    </div>
                )}
            </div>

            {/* Dropdown Options Management Section */}
            <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-xl">
                            <List className="text-purple-600" size={24} />
                        </div>
                        <h2 className="text-xl font-semibold text-[var(--dark-brown)]">Dropdown Options</h2>
                    </div>
                </div>

                {/* Dropdown Type Tabs with Add Button */}
                <div className="flex items-center justify-between border-b border-gray-200 mb-4 pb-2">
                    <div className="flex overflow-x-auto">
                    <button
                        onClick={() => setActiveDropdownType('service')}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeDropdownType === 'service'
                                ? 'border-green-600 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Service Types
                    </button>
                    <button
                        onClick={() => setActiveDropdownType('nationality')}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeDropdownType === 'nationality'
                                ? 'border-green-600 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Nationalities
                    </button>
                    <button
                        onClick={() => setActiveDropdownType('category')}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeDropdownType === 'category'
                                ? 'border-green-600 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Categories
                    </button>
                    <button
                        onClick={() => setActiveDropdownType('position')}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeDropdownType === 'position'
                                ? 'border-green-600 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Positions
                    </button>
                    </div>
                    <button
                        onClick={handleAddDropdownOption}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-md shadow-purple-500/20 transition-all font-medium text-sm ml-4 flex-shrink-0"
                    >
                        <Plus size={16} />
                        Add Option
                    </button>
                </div>

                {isLoadingDropdowns ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="animate-spin text-purple-600" size={32} />
                    </div>
                ) : dropdownOptions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400 rounded-[6px]">
                        <p className="text-lg">
                            No {activeDropdownType} options yet
                        </p>
                        <p className="text-sm">Click "Add Option" to add values</p>
                    </div>
                ) : (
                    <div 
                        className="overflow-auto"
                        style={{ 
                            maxHeight: dropdownOptions.length > 5 ? '300px' : 'auto',
                            overflowY: dropdownOptions.length > 5 ? 'auto' : 'visible'
                        }}
                    >
                        <div className="inline-block" style={{ width: '320px' }}>
                            <DataTable columns={dropdownColumns} data={dropdownOptions} compact={true} />
                        </div>
                    </div>
                )}
            </div>

            {/* Data Management Section */}
            <div className="bg-white rounded-[6px] shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-[var(--dark-brown)] mb-6">Data Management</h2>
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
                            {positions.map((pos) => (
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

            {/* Dropdown Option Modal */}
            <Modal
                isOpen={isDropdownModalOpen}
                onClose={() => setIsDropdownModalOpen(false)}
                title={selectedDropdownOption ? 'Edit Option' : 'Add Option'}
                size="md"
            >
                <form onSubmit={handleSubmitDropdownOption} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {activeDropdownType === 'service' && 'Service Type'}
                            {activeDropdownType === 'nationality' && 'Nationality'}
                            {activeDropdownType === 'category' && 'Category'}
                            {activeDropdownType === 'position' && 'Position'}
                        </label>
                        <input
                            type="text"
                            required
                            value={dropdownFormData.value}
                            onChange={(e) => setDropdownFormData({ ...dropdownFormData, value: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gray-50/50"
                            placeholder={`Enter ${activeDropdownType} value`}
                        />
                    </div>


                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsDropdownModalOpen(false)}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingDropdown}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
                        >
                            {isSubmittingDropdown ? 'Saving...' : selectedDropdownOption ? 'Update' : 'Add Option'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Dropdown Option Confirmation */}
            <ConfirmModal
                isOpen={!!deleteDropdownTarget}
                onClose={() => setDeleteDropdownTarget(null)}
                onConfirm={handleDeleteDropdownOption}
                title="Remove Option"
                message={`Are you sure you want to remove "${deleteDropdownTarget?.value}"? This action cannot be undone.`}
                confirmText="Remove"
                type="danger"
            />
        </div>
    );
};

export default Settings;
