import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface StatsCardProps {
    title: string;
    value: string;
    label: string;
    icon: React.ReactNode;
    colorClass?: string;
    isPrivileged?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    label,
    icon,
    colorClass = 'bg-gray-100 text-gray-600',
    isPrivileged = false
}) => {
    const [isHidden, setIsHidden] = useState(isPrivileged);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl p-5 relative overflow-hidden"
            style={{
                border: '1px solid rgba(218, 165, 32, 0.15)',
                boxShadow: '0 4px 20px -5px rgba(218, 165, 32, 0.1)'
            }}
        >
            {/* Decorative corner accent */}
            <div
                className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10"
                style={{ background: 'linear-gradient(135deg, #DAA520, transparent)' }}
            />

            <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                    <p className="text-sm font-medium mb-1" style={{ color: '#8D6E63' }}>{title}</p>
                    <div className="flex items-center gap-2">
                        <motion.h3
                            className="text-2xl font-bold"
                            style={{ color: '#5D4037' }}
                            initial={false}
                            animate={{ opacity: isHidden ? 0.3 : 1 }}
                        >
                            {isHidden ? '••••••' : `AED ${value}`}
                        </motion.h3>
                        {isPrivileged && (
                            <motion.button
                                onClick={() => setIsHidden(!isHidden)}
                                className="p-1 rounded-md transition-colors"
                                style={{ color: '#A1887F' }}
                                whileHover={{ color: '#DAA520' }}
                                whileTap={{ scale: 0.9 }}
                            >
                                {isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                            </motion.button>
                        )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#A1887F' }}>{label}</p>
                </div>

                <motion.div
                    className={`p-3 rounded-xl ${colorClass}`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                >
                    {icon}
                </motion.div>
            </div>

            {/* Bottom accent line on hover */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ background: 'linear-gradient(90deg, #DAA520, #FFD700, #DAA520)' }}
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
            />
        </motion.div>
    );
};

export default StatsCard;
