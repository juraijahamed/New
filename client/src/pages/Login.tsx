import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, ArrowRight, Loader2 } from 'lucide-react';

const Login = () => {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await login(name.trim());
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                background: 'linear-gradient(135deg, #5D4037 0%, #3E2723 50%, #5D4037 100%)'
            }}
        >
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    className="absolute top-20 left-20 w-64 h-64 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(218, 165, 32, 0.15) 0%, transparent 70%)' }}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />
                <motion.div
                    className="absolute bottom-20 right-20 w-96 h-96 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(218, 165, 32, 0.1) 0%, transparent 70%)' }}
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 5, repeat: Infinity }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md"
            >
                <div
                    className="bg-white rounded-3xl p-8 overflow-hidden"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(218, 165, 32, 0.2)'
                    }}
                >
                    {/* Logo */}
                    <motion.div
                        className="flex justify-center mb-6"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                    >
                        <div
                            className="w-20 h-20 rounded-full overflow-hidden"
                            style={{
                                border: '3px solid #DAA520',
                                boxShadow: '0 0 30px rgba(218, 165, 32, 0.4)'
                            }}
                        >
                            <img src="img/icon.jpeg" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-center mb-8"
                    >
                        <h1 className="text-2xl font-bold" style={{ color: '#5D4037' }}>
                            HAWK Travelmate
                        </h1>
                        <p className="mt-1" style={{ color: '#8D6E63' }}>
                            Financial Management System
                        </p>
                    </motion.div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: '#5D4037' }}>
                                Your Name
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#A1887F' }}>
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl text-sm transition-all"
                                    style={{
                                        border: '2px solid #e0d5c7',
                                        background: '#fdf9f3',
                                        color: '#5D4037'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#DAA520'}
                                    onBlur={(e) => e.target.style.borderColor = '#e0d5c7'}
                                    placeholder="Enter your name to continue"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            style={{
                                background: 'linear-gradient(135deg, #DAA520 0%, #B8860B 100%)',
                                boxShadow: '0 10px 30px -10px rgba(218, 165, 32, 0.5)'
                            }}
                            whileHover={{ scale: 1.02, boxShadow: '0 15px 40px -10px rgba(218, 165, 32, 0.6)' }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    Continue
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <p className="text-center text-xs mt-6" style={{ color: '#A1887F' }}>
                        Version 2.0 • Financial Dashboard
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
