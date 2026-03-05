import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Users, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const adminTabs = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: BarChart3 },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
];

export default function AdminNav() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl w-fit">
            {adminTabs.map(tab => {
                const isActive = location.pathname === tab.path;
                return (
                    <button
                        key={tab.path}
                        onClick={() => navigate(tab.path)}
                        className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive
                                ? 'text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="admin-tab-bg"
                                className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg shadow-lg shadow-violet-500/25"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative flex items-center gap-2">
                            <tab.icon size={16} />
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
