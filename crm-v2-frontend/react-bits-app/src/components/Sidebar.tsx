import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    LogOut,
    Upload,
    Settings,
    Mail,
    X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ onClose }: { onClose?: () => void }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', bgColor: 'bg-purple-500/10', color: 'text-purple-600 dark:text-purple-400' },
        { icon: Users, label: 'Prospects', path: '/prospects', bgColor: 'bg-purple-500/10', color: 'text-purple-600 dark:text-purple-400' },
        // Admin only link
        ...(user?.role === 'admin' ? [
            { icon: Settings, label: 'Admin Panel', path: '/admin/dashboard', bgColor: 'bg-red-500/10', color: 'text-red-600 dark:text-red-400' }
        ] : []),
    ];

    const toolsItems = [
        ...(user?.role !== 'admin' ? [
            { icon: Upload, label: 'Import CSV', path: '/import', bgColor: 'bg-emerald-500/10', color: 'text-emerald-600 dark:text-emerald-400' }
        ] : []),
        { icon: Mail, label: 'Email Settings', path: '/email-settings', bgColor: 'bg-orange-500/10', color: 'text-orange-600 dark:text-orange-400' },
    ];

    return (
        <aside className="w-64 glass border-r border-white/10 flex flex-col shrink-0 h-screen transition-all duration-300 shadow-2xl z-50">
            <div className="p-6 flex flex-col gap-6 h-full relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />

                {/* Close Button */}
                <motion.button
                    onClick={onClose}
                    className="self-end md:hidden p-2 rounded-full bg-purple-50 dark:bg-purple-900/20 text-slate-500 hover:text-red-500 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <X size={20} />
                </motion.button>

                {/* Nav Links - Card Style */}
                <nav className="flex flex-col gap-3 grow relative z-10">
                    {menuItems.map((item) => (
                        <motion.button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive(item.path)
                                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30'
                                : 'hover:bg-purple-500/10 text-slate-400 hover:text-white'
                                }`}
                            whileHover={{ scale: 1.02, x: 5 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <item.icon size={20} className={`transition-transform duration-300 ${isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="text-sm font-bold flex-1 text-left tracking-wide">{item.label}</span>

                            {isActive(item.path) && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-white/20 mix-blend-overlay"
                                />
                            )}
                        </motion.button>
                    ))}
                </nav>

                {/* Tools Section */}
                <div className="space-y-3 pt-6 border-t border-slate-200/50 dark:border-slate-800/50 relative z-10">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 px-2 uppercase tracking-widest mb-2">System</p>
                    {toolsItems.map((item) => (
                        <motion.button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${isActive(item.path)
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold'
                                : 'text-slate-400 hover:text-white hover:bg-purple-500/10'
                                }`}
                            whileHover={{ x: 3 }}
                        >
                            <item.icon size={18} />
                            <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                        </motion.button>
                    ))}
                </div>

                {/* User Profile Section */}
                <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-4 mt-auto relative z-10">
                    <motion.button
                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                        className="w-full flex items-center gap-3 hover:bg-purple-500/10 px-3 py-2.5 rounded-xl transition-all border border-transparent hover:border-purple-500/20 group"
                    >
                        <div className="size-10 rounded-full bg-gradient-to-tr from-purple-500 to-fuchsia-500 p-0.5">
                            <div className="w-full h-full rounded-full bg-purple-50 dark:bg-slate-900 flex items-center justify-center">
                                <span className="text-xs font-black bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    {user?.email?.substring(0, 2).toUpperCase() || 'AD'}
                                </span>
                            </div>
                        </div>
                        <div className="overflow-hidden flex-1 text-left">
                            <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                {user?.email?.split('@')[0] || 'User'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-wider">{user?.role || 'Commercial'}</p>
                        </div>
                        <Settings size={16} className={`text-slate-400 transition-transform duration-300 ${profileMenuOpen ? 'rotate-90' : ''}`} />
                    </motion.button>

                    {/* Profile Dropdown Menu */}
                    <AnimatePresence>
                        {profileMenuOpen && (
                            <motion.div
                                className="absolute bottom-full left-0 w-full mb-3 modern-card rounded-xl overflow-hidden shadow-xl"
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                            >
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-semibold text-sm"
                                >
                                    <LogOut size={18} />
                                    <span>Sign Out</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </aside>
    );
}
