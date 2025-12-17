import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, ShoppingCart, Users, CreditCard } from 'lucide-react';
import { useData } from '../../context/DataContext';
import type { Expense, Sale, Staff, SupplierPayment } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SearchResult {
    type: 'expense' | 'sale' | 'staff' | 'supplier_payment';
    id: number;
    title: string;
    subtitle: string;
    data: Expense | Sale | Staff | SupplierPayment;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
    const { expenses, sales, staff, supplierPayments } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Search function
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase().trim();
        const results: SearchResult[] = [];

        // Search Expenses
        expenses.forEach((expense) => {
            const matches = 
                expense.description?.toLowerCase().includes(query) ||
                expense.category?.toLowerCase().includes(query) ||
                expense.remarks?.toLowerCase().includes(query) ||
                expense.amount?.toString().includes(query);

            if (matches) {
                results.push({
                    type: 'expense',
                    id: expense.id!,
                    title: expense.description || 'Expense',
                    subtitle: `${expense.category || 'Uncategorized'} • ${expense.amount?.toFixed(2) || '0.00'}`,
                    data: expense,
                });
            }
        });

        // Search Sales
        sales.forEach((sale) => {
            const matches =
                sale.agency?.toLowerCase().includes(query) ||
                sale.supplier?.toLowerCase().includes(query) ||
                sale.national?.toLowerCase().includes(query) ||
                sale.service?.toLowerCase().includes(query) ||
                sale.passport_number?.toLowerCase().includes(query) ||
                sale.remarks?.toLowerCase().includes(query) ||
                sale.sales_rate?.toString().includes(query);

            if (matches) {
                results.push({
                    type: 'sale',
                    id: sale.id!,
                    title: `${sale.agency || 'Agency'} - ${sale.service || 'Service'}`,
                    subtitle: `${sale.supplier || 'Supplier'} • ${sale.national || 'National'} • ${sale.sales_rate?.toFixed(2) || '0.00'}`,
                    data: sale,
                });
            }
        });

        // Search Staff
        staff.forEach((member) => {
            const matches =
                member.name?.toLowerCase().includes(query) ||
                member.position?.toLowerCase().includes(query) ||
                member.phone?.toLowerCase().includes(query) ||
                member.salary?.toString().includes(query);

            if (matches) {
                results.push({
                    type: 'staff',
                    id: member.id!,
                    title: member.name || 'Staff Member',
                    subtitle: `${member.position || 'Position'} • ${member.phone || 'No Phone'}`,
                    data: member,
                });
            }
        });

        // Search Supplier Payments
        supplierPayments.forEach((payment) => {
            const matches =
                payment.supplier_name?.toLowerCase().includes(query) ||
                payment.remarks?.toLowerCase().includes(query) ||
                payment.amount?.toString().includes(query);

            if (matches) {
                results.push({
                    type: 'supplier_payment',
                    id: payment.id!,
                    title: payment.supplier_name || 'Supplier Payment',
                    subtitle: `${payment.amount?.toFixed(2) || '0.00'} • ${payment.date || 'Date'}`,
                    data: payment,
                });
            }
        });

        return results;
    }, [searchQuery, expenses, sales, staff, supplierPayments]);

    const handleResultClick = (result: SearchResult) => {
        // Navigate to the appropriate page based on type
        switch (result.type) {
            case 'expense':
                navigate('/expenses');
                break;
            case 'sale':
                navigate('/sales');
                break;
            case 'staff':
                navigate('/settings');
                break;
            case 'supplier_payment':
                navigate('/supplier-payments');
                break;
        }
        onClose();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'expense':
                return <FileText size={18} className="text-blue-500" />;
            case 'sale':
                return <ShoppingCart size={18} className="text-green-500" />;
            case 'staff':
                return <Users size={18} className="text-purple-500" />;
            case 'supplier_payment':
                return <CreditCard size={18} className="text-orange-500" />;
            default:
                return <Search size={18} />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'expense':
                return 'Expense';
            case 'sale':
                return 'Sale';
            case 'staff':
                return 'Staff';
            case 'supplier_payment':
                return 'Supplier Payment';
            default:
                return '';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
                    style={{ background: 'rgba(93, 64, 55, 0.6)', backdropFilter: 'blur(8px)' }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: -20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
                        style={{
                            border: '1px solid rgba(218, 165, 32, 0.2)',
                            boxShadow: '0 25px 50px -12px rgba(93, 64, 55, 0.25), 0 0 0 1px rgba(218, 165, 32, 0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Search Input */}
                        <div
                            className="px-6 py-4"
                            style={{
                                borderBottom: '1px solid rgba(218, 165, 32, 0.15)',
                                background: 'linear-gradient(180deg, #fdf9f3 0%, #ffffff 100%)'
                            }}
                        >
                            <div className="relative">
                                <Search
                                    size={20}
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2"
                                    style={{ color: '#A1887F' }}
                                />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search across expenses, sales, staff, and supplier payments..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 rounded-xl border transition-all"
                                    style={{
                                        borderColor: searchQuery ? 'rgba(218, 165, 32, 0.3)' : 'rgba(161, 136, 127, 0.2)',
                                        background: 'white',
                                        color: '#5D4037',
                                        fontSize: '15px'
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            onClose();
                                        }
                                    }}
                                />
                                {searchQuery && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors"
                                        style={{ color: '#A1887F' }}
                                        whileHover={{ backgroundColor: 'rgba(218, 165, 32, 0.1)', color: '#DAA520' }}
                                    >
                                        <X size={18} />
                                    </motion.button>
                                )}
                            </div>
                        </div>

                        {/* Gold accent line */}
                        <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #DAA520, transparent)' }} />

                        {/* Results */}
                        <div className="max-h-96 overflow-y-auto">
                            {searchQuery.trim() ? (
                                searchResults.length > 0 ? (
                                    <div className="p-2">
                                        {searchResults.map((result, index) => (
                                            <motion.div
                                                key={`${result.type}-${result.id}`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                onClick={() => handleResultClick(result)}
                                                className="px-4 py-3 rounded-xl cursor-pointer transition-all mb-1"
                                                style={{
                                                    background: selectedResult?.id === result.id 
                                                        ? 'rgba(218, 165, 32, 0.1)' 
                                                        : 'transparent'
                                                }}
                                                onMouseEnter={() => setSelectedResult(result)}
                                                onMouseLeave={() => setSelectedResult(null)}
                                                whileHover={{ backgroundColor: 'rgba(218, 165, 32, 0.1)' }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5">{getIcon(result.type)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-medium" style={{ color: '#5D4037' }}>
                                                                {result.title}
                                                            </p>
                                                            <span
                                                                className="px-2 py-0.5 rounded text-xs font-medium"
                                                                style={{
                                                                    background: 'rgba(218, 165, 32, 0.15)',
                                                                    color: '#B8860B'
                                                                }}
                                                            >
                                                                {getTypeLabel(result.type)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm" style={{ color: '#A1887F' }}>
                                                            {result.subtitle}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center">
                                        <Search size={48} className="mx-auto mb-4" style={{ color: '#A1887F', opacity: 0.5 }} />
                                        <p className="text-lg font-medium mb-2" style={{ color: '#5D4037' }}>
                                            No results found
                                        </p>
                                        <p className="text-sm" style={{ color: '#A1887F' }}>
                                            Try searching with different keywords
                                        </p>
                                    </div>
                                )
                            ) : (
                                <div className="p-12 text-center">
                                    <Search size={48} className="mx-auto mb-4" style={{ color: '#A1887F', opacity: 0.5 }} />
                                    <p className="text-lg font-medium mb-2" style={{ color: '#5D4037' }}>
                                        Global Search
                                    </p>
                                    <p className="text-sm" style={{ color: '#A1887F' }}>
                                        Start typing to search across expenses, sales, staff, and supplier payments
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {searchQuery.trim() && searchResults.length > 0 && (
                            <div
                                className="px-6 py-3 text-center text-sm"
                                style={{
                                    borderTop: '1px solid rgba(218, 165, 32, 0.15)',
                                    background: 'rgba(253, 249, 243, 0.5)',
                                    color: '#A1887F'
                                }}
                            >
                                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalSearchModal;
