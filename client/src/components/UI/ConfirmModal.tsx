import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
}) => {
    const typeConfig = {
        danger: {
            icon: <AlertTriangle size={24} />,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            buttonBg: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
        },
        warning: {
            icon: <AlertCircle size={24} />,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            buttonBg: 'linear-gradient(135deg, #f57c00 0%, #e65100 100%)',
        },
        info: {
            icon: <Info size={24} />,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            buttonBg: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
        }
    };

    const config = typeConfig[type];

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
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="bg-white rounded-2xl p-6 max-w-sm w-full"
                        style={{
                            border: '1px solid rgba(218, 165, 32, 0.2)',
                            boxShadow: '0 25px 50px -12px rgba(93, 64, 55, 0.25)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4">
                            <motion.div
                                className={`p-3 rounded-xl ${config.iconBg} ${config.iconColor}`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                            >
                                {config.icon}
                            </motion.div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold" style={{ color: '#5D4037' }}>{title}</h3>
                                <p className="text-sm mt-1" style={{ color: '#8D6E63' }}>{message}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <motion.button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
                                style={{
                                    border: '1px solid rgba(218, 165, 32, 0.3)',
                                    color: '#5D4037'
                                }}
                                whileHover={{ backgroundColor: 'rgba(218, 165, 32, 0.1)' }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {cancelText}
                            </motion.button>
                            <motion.button
                                onClick={() => { onConfirm(); onClose(); }}
                                className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium text-sm"
                                style={{ background: config.buttonBg }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {confirmText}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
