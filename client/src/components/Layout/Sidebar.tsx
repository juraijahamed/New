import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Receipt, ShoppingCart, CreditCard, BarChart2, Settings } from 'lucide-react';
import { useState } from 'react';

const Sidebar = () => {
    const location = useLocation();
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { id: 'expenses', label: 'Expenses', icon: Receipt, path: '/expenses' },
        { id: 'sales', label: 'Sales', icon: ShoppingCart, path: '/sales' },
        { id: 'supplier-payments', label: 'Supplier Payments', icon: CreditCard, path: '/supplier-payments' },
        { id: 'reports', label: 'Reports', icon: BarChart2, path: '/reports' },
        { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    ];

    return (
        <nav className="h-screen w-16 flex flex-col items-center py-4 z-40 relative"
            style={{
                background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 50%, #5D4037 100%)',
                boxShadow: '4px 0 20px -5px rgba(93, 64, 55, 0.3)'
            }}
        >
            {/* Decorative top accent */}
            <div className="absolute top-0 left-0 right-0 h-1"
                style={{ background: 'linear-gradient(90deg, #DAA520, #FFD700, #DAA520)' }}
            />

            {/* Logo */}
            <motion.div
                className="mb-6 w-10 h-10 rounded-full overflow-hidden cursor-pointer"
                style={{
                    border: '2px solid #DAA520',
                    boxShadow: '0 0 20px rgba(218, 165, 32, 0.4)'
                }}
                whileHover={{ scale: 1.1, boxShadow: '0 0 30px rgba(218, 165, 32, 0.6)' }}
                transition={{ duration: 0.3 }}
            >
                <img src="/img/icon.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </motion.div>

            <div className="flex-1 flex flex-col gap-2 w-full px-2">
                {menuItems.map((item, index) => {
                    const isActive = location.pathname === item.path;
                    const isHovered = hoveredItem === item.id;

                    return (
                        <motion.div
                            key={item.id}
                            className="relative"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onMouseEnter={() => setHoveredItem(item.id)}
                            onMouseLeave={() => setHoveredItem(null)}
                        >
                            <Link
                                to={item.path}
                                className="flex items-center justify-center p-2.5 rounded-xl transition-all duration-300"
                                style={{
                                    background: isActive
                                        ? 'linear-gradient(135deg, #DAA520 0%, #B8860B 100%)'
                                        : 'transparent',
                                    color: isActive ? 'white' : '#A1887F',
                                    boxShadow: isActive ? '0 4px 15px -3px rgba(218, 165, 32, 0.5)' : 'none'
                                }}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <item.icon size={20} />
                                </motion.div>
                            </Link>

                            {/* Drawer-style Label */}
                            <AnimatePresence>
                                {isHovered && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 'auto', opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className="absolute left-full top-0 h-full flex items-center overflow-hidden"
                                        style={{ marginLeft: '8px' }}
                                    >
                                        <motion.div
                                            initial={{ x: -20 }}
                                            animate={{ x: 0 }}
                                            exit={{ x: -20 }}
                                            className="text-white text-sm font-medium py-2 px-4 rounded-r-xl whitespace-nowrap"
                                            style={{
                                                background: 'linear-gradient(135deg, #DAA520 0%, #B8860B 100%)',
                                                boxShadow: '4px 4px 20px -5px rgba(218, 165, 32, 0.5)'
                                            }}
                                        >
                                            {item.label}
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Decorative bottom */}
            <div className="w-8 h-1 rounded-full mb-2"
                style={{ background: 'linear-gradient(90deg, transparent, #DAA520, transparent)' }}
            />
        </nav>
    );
};

export default Sidebar;
