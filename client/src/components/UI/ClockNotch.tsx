import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, WifiOff } from 'lucide-react';
import { healthApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ClockNotch = () => {
    const [indiaTime, setIndiaTime] = useState<string>('');
    const [uaeTime, setUaeTime] = useState<string>('');
    const [isOnline, setIsOnline] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [indiaAnalog, setIndiaAnalog] = useState({ h: 0, m: 0, s: 0 });
    const [uaeAnalog, setUaeAnalog] = useState({ h: 0, m: 0, s: 0 });
    const [leftPosition, setLeftPosition] = useState<string>('50%');
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const notchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateClocks = () => {
            const now = new Date();

            const indiaOffset = 5.5 * 60;
            const indiaLocal = new Date(now.getTime() + (indiaOffset + now.getTimezoneOffset()) * 60000);
            const indiaHours = indiaLocal.getHours();
            const indiaMinutes = indiaLocal.getMinutes();
            const indiaSeconds = indiaLocal.getSeconds();

            setIndiaTime(`${String(indiaHours).padStart(2, '0')}:${String(indiaMinutes).padStart(2, '0')}`);
            setIndiaAnalog({ h: indiaHours, m: indiaMinutes, s: indiaSeconds });

            const uaeOffset = 4 * 60;
            const uaeLocal = new Date(now.getTime() + (uaeOffset + now.getTimezoneOffset()) * 60000);
            const uaeHours = uaeLocal.getHours();
            const uaeMinutes = uaeLocal.getMinutes();
            const uaeSeconds = uaeLocal.getSeconds();

            setUaeTime(`${String(uaeHours).padStart(2, '0')}:${String(uaeMinutes).padStart(2, '0')}`);
            setUaeAnalog({ h: uaeHours, m: uaeMinutes, s: uaeSeconds });
        };

        updateClocks();
        const interval = setInterval(updateClocks, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const checkOnline = async () => {
            const online = await healthApi.check();
            setIsOnline(online);
        };

        checkOnline();
        const interval = setInterval(checkOnline, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const calculateCenter = () => {
            // Find the main element (the flex-1 main content area)
            const mainElement = document.querySelector('main.flex-1');
            if (mainElement) {
                const mainRect = mainElement.getBoundingClientRect();
                
                // Calculate the center point of the main content area
                // Since we use translateX(-50%), the left position should be the center point
                const centerX = mainRect.left + (mainRect.width / 2);
                const newPosition = `${centerX}px`;
                setLeftPosition(newPosition);
            }
        };

        // Calculate on mount and resize
        calculateCenter();
        window.addEventListener('resize', calculateCenter);
        
        // Also recalculate after a short delay to ensure layout is complete
        const timeoutId = setTimeout(() => {
            calculateCenter();
        }, 100);
        
        // Use ResizeObserver for more accurate updates
        const mainElement = document.querySelector('main.flex-1');
        let resizeObserver: ResizeObserver | null = null;
        
        if (mainElement && 'ResizeObserver' in window) {
            resizeObserver = new ResizeObserver(() => {
                calculateCenter();
            });
            resizeObserver.observe(mainElement);
        }

        return () => {
            window.removeEventListener('resize', calculateCenter);
            clearTimeout(timeoutId);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const MiniAnalogClock = ({ hours, minutes, seconds, label }: { hours: number; minutes: number; seconds: number; label: string }) => {
        const hourDeg = (hours % 12) * 30 + minutes * 0.5;
        const minuteDeg = minutes * 6 + seconds * 0.1;
        const secondDeg = seconds * 6;

        return (
            <div className="flex flex-col items-center">
                <svg viewBox="0 0 50 50" className="w-16 h-16">
                    {/* Clock face */}
                    <defs>
                        <linearGradient id="clockFace" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#5D4037" />
                            <stop offset="100%" stopColor="#3E2723" />
                        </linearGradient>
                        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFD700" />
                            <stop offset="100%" stopColor="#DAA520" />
                        </linearGradient>
                    </defs>
                    <circle cx="25" cy="25" r="23" fill="url(#clockFace)" stroke="url(#goldGradient)" strokeWidth="2" />

                    {/* Hour markers */}
                    {[...Array(12)].map((_, i) => (
                        <line
                            key={i}
                            x1="25"
                            y1="5"
                            x2="25"
                            y2={i % 3 === 0 ? "8" : "6"}
                            stroke="#DAA520"
                            strokeWidth={i % 3 === 0 ? "2" : "1"}
                            transform={`rotate(${i * 30} 25 25)`}
                        />
                    ))}

                    {/* Hour hand */}
                    <line x1="25" y1="25" x2="25" y2="14" stroke="#DAA520" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${hourDeg} 25 25)`} />
                    {/* Minute hand */}
                    <line x1="25" y1="25" x2="25" y2="9" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${minuteDeg} 25 25)`} />
                    {/* Second hand */}
                    <line x1="25" y1="25" x2="25" y2="7" stroke="#ef5350" strokeWidth="0.5" strokeLinecap="round" transform={`rotate(${secondDeg} 25 25)`} />
                    {/* Center dot */}
                    <circle cx="25" cy="25" r="2.5" fill="url(#goldGradient)" />
                </svg>
                <span className="text-xs text-gray-300 mt-1 font-medium">{label}</span>
            </div>
        );
    };

    return (
        <>
            {/* Minimal Top Notch */}
            <motion.div
                ref={notchRef}
                className="fixed top-0 z-50"
                style={{
                    left: leftPosition,
                }}
                initial={{ y: -50, x: '-50%' }}
                animate={{ y: 0, x: '-50%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div
                    className="text-white px-4 py-1.5 rounded-b-2xl flex items-center gap-3 text-xs"
                    style={{
                        background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)',
                        boxShadow: '0 4px 20px -5px rgba(93, 64, 55, 0.5)',
                        borderBottom: '1px solid rgba(218, 165, 32, 0.3)'
                    }}
                >
                    {/* Online Status */}
                    <div className="flex items-center gap-1.5">
                        {isOnline ? (
                            <>
                                <motion.div
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: '#4caf50' }}
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                                <span className="text-[11px] font-medium" style={{ color: '#4caf50' }}>Online</span>
                            </>
                        ) : (
                            <>
                                <WifiOff size={12} className="text-red-400" />
                                <span className="text-[11px] font-medium text-red-400">Offline</span>
                            </>
                        )}
                    </div>

                    {/* India Clock */}
                    <div
                        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    >
                        <span className="text-[11px]">🇮🇳</span>
                        <span className="font-mono font-semibold text-[12px]" style={{ color: '#DAA520' }}>{indiaTime}</span>
                    </div>

                    <div className="w-px h-3" style={{ background: 'rgba(218, 165, 32, 0.4)' }} />

                    {/* UAE Clock */}
                    <div
                        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    >
                        <span className="text-[11px]">🇦🇪</span>
                        <span className="font-mono font-semibold text-[12px]" style={{ color: '#DAA520' }}>{uaeTime}</span>
                    </div>

                    {/* Expand Arrow */}
                    <motion.div
                        animate={{ rotate: isDrawerOpen ? 180 : 0 }}
                        className="cursor-pointer"
                        style={{ color: '#DAA520' }}
                        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    >
                        <ChevronDown size={14} />
                    </motion.div>

                    <div className="w-px h-3" style={{ background: 'rgba(218, 165, 32, 0.4)' }} />

                    {/* User & Logout */}
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium truncate max-w-[80px]" style={{ color: '#DAA520' }} title={user?.name}>
                            {user?.name || 'User'}
                        </span>
                        <motion.button
                            onClick={handleLogout}
                            className="transition-colors flex items-center gap-1"
                            style={{ color: '#A1887F' }}
                            whileHover={{ color: '#ef5350', scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Logout"
                        >
                            <LogOut size={14} />
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Analog Clock Drawer */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setIsDrawerOpen(false)}
                        />

                        <motion.div
                            initial={{ y: -100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -100, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className="fixed top-10 left-1/2 -translate-x-1/2 z-50 rounded-2xl p-5"
                            style={{
                                background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)',
                                boxShadow: '0 20px 40px -10px rgba(93, 64, 55, 0.5)',
                                border: '1px solid rgba(218, 165, 32, 0.3)'
                            }}
                        >
                            <div className="flex gap-8 items-center">
                                <MiniAnalogClock hours={indiaAnalog.h} minutes={indiaAnalog.m} seconds={indiaAnalog.s} label="🇮🇳 India IST" />
                                <MiniAnalogClock hours={uaeAnalog.h} minutes={uaeAnalog.m} seconds={uaeAnalog.s} label="🇦🇪 UAE GST" />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default ClockNotch;
