import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(93, 64, 55, 0.6)', backdropFilter: 'blur(8px)' }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className={`w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl overflow-hidden`}
                        style={{
                            border: '1px solid rgba(218, 165, 32, 0.2)',
                            boxShadow: '0 25px 50px -12px rgba(93, 64, 55, 0.25), 0 0 0 1px rgba(218, 165, 32, 0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with gold accent */}
                        <div
                            className="px-6 py-4 flex items-center justify-between"
                            style={{
                                borderBottom: '1px solid rgba(218, 165, 32, 0.15)',
                                background: 'linear-gradient(180deg, #fdf9f3 0%, #ffffff 100%)'
                            }}
                        >
                            <h2 className="text-lg font-semibold" style={{ color: '#5D4037' }}>{title}</h2>
                            <motion.button
                                onClick={onClose}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: '#A1887F' }}
                                whileHover={{ backgroundColor: 'rgba(218, 165, 32, 0.1)', color: '#DAA520' }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X size={20} />
                            </motion.button>
                        </div>

                        {/* Gold accent line */}
                        <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #DAA520, transparent)' }} />

                        {/* Content */}
                        <div className="p-6">
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Modal;
