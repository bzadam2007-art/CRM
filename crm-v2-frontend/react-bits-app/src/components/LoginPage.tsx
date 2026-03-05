import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isLoading, error, clearError, isAuthenticated } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [localError, setLocalError] = useState('');

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setLocalError('');

        if (!email || !password) {
            setLocalError('Please fill in all fields');
            return;
        }

        const success = await login(email, password, rememberMe);
        if (success) {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden mesh-bg">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="mesh-blob mesh-blob-1 rounded-full bg-purple-600/30 mix-blend-screen animate-float" style={{ animationDuration: '15s' }} />
                <div className="mesh-blob mesh-blob-2 rounded-full bg-blue-600/30 mix-blend-screen animate-float" style={{ animationDuration: '20s', animationDelay: '2s' }} />
                <div className="mesh-blob mesh-blob-3 rounded-full bg-indigo-600/30 mix-blend-screen animate-float" style={{ animationDuration: '18s', animationDelay: '5s' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden rounded-3xl shadow-2xl z-10 glass border border-white/10"
            >
                {/* Left Side - Brand/Logo Area */}
                <div className="hidden md:flex flex-col justify-center items-center p-12 bg-black/20 relative">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-center relative z-10"
                    >
                        {/* Logo Container with Glow */}
                        <div className="relative w-72 h-72 mx-auto mb-8 flex items-center justify-center group">
                            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all duration-700" />
                            <motion.img
                                src="/logo.png"
                                alt="EXPANZIA Logo"
                                className="w-full h-full object-contain drop-shadow-2xl relative z-10 scale-100 group-hover:scale-105 transition-transform duration-500"
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            />
                        </div>

                        <motion.h1
                            className="text-6xl font-black tracking-tight text-white mb-4 drop-shadow-lg"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent bg-300% animate-gradient">
                                EXPANZIA
                            </span>
                        </motion.h1>

                        <p className="text-slate-300 text-lg font-light tracking-wide">
                            Next-Gen School Management
                        </p>
                    </motion.div>
                </div>

                {/* Right Side - Login Form */}
                <div className="p-8 md:p-12 bg-white/5 backdrop-blur-xl flex flex-col justify-center">
                    <div className="max-w-md w-full mx-auto">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                            <p className="text-slate-400 mb-8">Enter your credentials to access the platform</p>


                            {/* Error Message */}
                            {(error || localError) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm font-medium flex items-center gap-3 backdrop-blur-sm"
                                >
                                    <AlertCircle size={18} className="flex-shrink-0 text-red-400" />
                                    <span>{error || localError}</span>
                                </motion.div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-6">
                                {/* Email Field */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={isLoading}
                                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300 hover:bg-slate-800/80"
                                            placeholder="admin@school.com"
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-sm font-medium text-slate-300">Password</label>
                                        <a href="#" className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors">
                                            Forgot password?
                                        </a>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isLoading}
                                            className="block w-full pl-11 pr-12 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300 hover:bg-slate-800/80"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center ml-1">
                                    <input
                                        id="remember-me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-400 hover:text-slate-300 cursor-pointer transition-colors">
                                        Remember me for 30 days
                                    </label>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-slate-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            Sign In to Dashboard <ArrowRight size={16} />
                                        </span>
                                    )}
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* Footer */}
            <div className="absolute bottom-6 w-full text-center text-xs text-slate-500/50">
                &copy; 2026 Expanzia Education. All rights reserved.
            </div>
        </div>
    );
};

export default LoginPage;
