import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, WifiOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';

const ClockNotch = () => {
    const [indiaTime, setIndiaTime] = useState<string>('');
    const [uaeTime, setUaeTime] = useState<string>('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [indiaAnalog, setIndiaAnalog] = useState({ h: 0, m: 0, s: 0 });
    const [uaeAnalog, setUaeAnalog] = useState({ h: 0, m: 0, s: 0 });
    const { logout, user } = useAuth();
    const { isServerOnline } = useData();
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



    // Layout effect removed as centering is now handled by TitleBar flex container

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleRefresh = () => {
        // Hard refresh the page (bypasses cache)
        window.location.reload();
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
        <div className="relative h-full flex items-center justify-center">
            {/* Minimal Top Notch - Now relative to its parent (TitleBar) */}
            <motion.div
                ref={notchRef}
                className="pointer-events-auto h-full flex items-center"
                style={{
                    WebkitAppRegion: 'no-drag',
                } as any}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div
                    className="text-white px-4 h-[30px] rounded-b-2xl flex items-center gap-3 text-xs shadow-xl"
                    style={{
                        background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)',
                        boxShadow: '0 4px 15px -5px rgba(0, 0, 0, 0.4)',
                        borderBottom: '1px solid rgba(218, 165, 32, 0.3)',
                        borderLeft: '1px solid rgba(218, 165, 32, 0.1)',
                        borderRight: '1px solid rgba(218, 165, 32, 0.1)',
                    } as any}
                >
                    {/* Online Status + Refresh Button */}
                    <div className="flex items-center gap-1.5">
                        {isServerOnline ? (
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
                        {/* Refresh Button - Right after Online label */}
                        <motion.button
                            onClick={handleRefresh}
                            className="transition-colors flex items-center ml-1"
                            style={{ color: '#A1887F' }}
                            whileHover={{ color: '#DAA520', scale: 1.1, rotate: 180 }}
                            whileTap={{ scale: 0.9 }}
                            title="Refresh App"
                        >
                            <RefreshCw size={13} />
                        </motion.button>
                    </div>

                    <div className="w-px h-3" style={{ background: 'rgba(218, 165, 32, 0.4)' }} />

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
                    {user && (
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
                    )}
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
        </div>
    );
};

export default ClockNotch;
