import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import type { AdminStats } from '../../services/adminService';
import { dashboardService } from '../../services/api';
import { Users, TrendingUp, AlertCircle, BarChart3, Activity, ArrowUpRight, Sparkles, Clock, Mail, Phone, MessageSquare, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import AdminNav from '../../components/AdminNav';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGlobalResetConfirm, setShowGlobalResetConfirm] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [statsResult, activityResult] = await Promise.all([
                adminService.getDashboardStats(),
                dashboardService.getRecentActivity(15)
            ]);

            if (statsResult.success) {
                setStats(statsResult.stats ?? null);
            }

            if (activityResult.success) {
                setActivities(activityResult.activities ?? []);
            }
        } catch (error) {
            console.error('Failed to load dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGlobalReset = async () => {
        setIsCleaning(true);
        try {
            const result = await adminService.resetSystem();
            if (result.success) {
                await loadStats();
                setShowGlobalResetConfirm(false);
            } else {
                alert(result.message || "Reset failed");
            }
        } catch (error) {
            console.error("Failed to reset system", error);
            alert("An unexpected error occurred during reset.");
        } finally {
            setIsCleaning(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-violet-200 dark:border-violet-800 rounded-full animate-spin border-t-violet-600 dark:border-t-violet-400" />
                        <Sparkles className="absolute -top-1 -right-1 text-amber-400 animate-pulse" size={16} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
                    <AlertCircle className="mx-auto text-red-500 mb-3" size={40} />
                    <p className="text-red-600 dark:text-red-400 font-medium">Failed to load dashboard data.</p>
                    <button onClick={loadStats} className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const statCards = [
        {
            title: 'Total Users', value: stats.total_users, icon: Users,
            gradient: 'from-blue-500 to-cyan-400',
            bgGlow: 'bg-blue-500/10',
            desc: 'System users'
        },
        {
            title: 'Total Prospects', value: stats.total_prospects, icon: BarChart3,
            gradient: 'from-violet-500 to-purple-400',
            bgGlow: 'bg-violet-500/10',
            desc: 'Schools tracked'
        },
        {
            title: 'High Priority', value: stats.high_priority_leads, icon: AlertCircle,
            gradient: 'from-rose-500 to-orange-400',
            bgGlow: 'bg-rose-500/10',
            desc: 'Need attention'
        },
        {
            title: 'Conversion', value: `${stats.conversion_rate}%`, icon: TrendingUp,
            gradient: 'from-emerald-500 to-teal-400',
            bgGlow: 'bg-emerald-500/10',
            desc: 'Success rate'
        },
    ];

    const statusData = Object.entries(stats.status_distribution).map(([name, value]) => ({ name, value }));
    const countryData = Object.entries(stats.country_distribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }));

    const workloadData = Object.entries(stats.user_distribution)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }));

    const CHART_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f97316', '#ec4899', '#06b6d4', '#a78bfa', '#fb7185'];
    const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f43f5e', '#0ea5e9'];

    const getInteractionIcon = (type: string) => {
        switch (type) {
            case 'Email': return <Mail size={14} />;
            case 'Phone': return <Phone size={14} />;
            case 'Note': return <MessageSquare size={14} />;
            default: return <Info size={14} />;
        }
    };

    return (
        <div className="space-y-8 p-6 lg:p-8">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
                            <Activity className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Admin Dashboard</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">System overview & global activity</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowGlobalResetConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 dark:bg-red-900/20 border border-red-500/20 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all shadow-sm"
                    >
                        <Sparkles size={16} />
                        System Restart
                    </button>
                    <button onClick={loadStats} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
                        <Activity size={16} />
                        Refresh
                    </button>
                </div>

                {/* Global System Reset Confirmation Modal */}
                <AnimatePresence>
                    {showGlobalResetConfirm && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-md"
                                onClick={() => setShowGlobalResetConfirm(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
                            >
                                <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-red-500/20 pointer-events-auto">
                                    <div className="p-10 text-center">
                                        <div className="w-20 h-20 bg-red-600/10 rounded-[28px] flex items-center justify-center text-red-600 mx-auto mb-8 animate-pulse">
                                            <Sparkles size={40} />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">GLOBAL SYSTEM RESET</h3>
                                        <p className="text-base text-slate-500 mb-10 leading-relaxed">
                                            Warning: This is a <span className="text-red-600 font-black">FULL RESTART</span>.
                                            This will permanently delete <span className="font-bold underline">EVERY PROSPECT AND INTERACTION</span> from the entire company database.
                                            Dashboard stats will go back to zero.
                                        </p>
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={handleGlobalReset}
                                                disabled={isCleaning}
                                                className="w-full py-5 rounded-2xl bg-red-600 text-white font-black text-base shadow-2xl shadow-red-600/30 hover:bg-red-700 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {isCleaning ? 'RESTARTING SYSTEM...' : 'CONFIRM GLOBAL WIPE'}
                                            </button>
                                            <button
                                                onClick={() => setShowGlobalResetConfirm(false)}
                                                className="w-full py-4 rounded-2xl text-slate-400 font-bold text-sm hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                            >
                                                Abort Restart
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </motion.header>

            {/* Admin Navigation Tabs */}
            <AdminNav />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
                        className="group relative bg-white dark:bg-slate-800/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
                    >
                        {/* Glow effect */}
                        <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bgGlow} rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity -translate-y-8 translate-x-8`} />

                        <div className="relative flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{stat.title}</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">{stat.value}</h3>
                                <div className="flex items-center gap-1 mt-2">
                                    <ArrowUpRight size={14} className="text-emerald-500" />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.desc}</p>
                                </div>
                            </div>
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                                <stat.icon size={20} className="text-white" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Status Breakdown</h3>
                        <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2.5 py-1 rounded-full font-medium">{statusData.length} statuses</span>
                    </div>
                    <div className="h-72 w-full min-h-[280px] min-w-0">
                        <ResponsiveContainer width="99%" height={280} minWidth={0}>
                            <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#e2e8f0" opacity={0.3} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={110} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#f1f5f9', padding: '10px 14px' }}
                                    itemStyle={{ color: '#f1f5f9' }}
                                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                                />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={22}>
                                    {statusData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Country Top List */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                    className="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Top Countries</h3>
                        <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2.5 py-1 rounded-full font-medium">{countryData.length} countries</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-44 h-44 min-h-[176px] min-w-0">
                            <ResponsiveContainer width="99%" height={176} minWidth={0}>
                                <PieChart>
                                    <Pie
                                        data={countryData}
                                        cx="50%" cy="50%"
                                        innerRadius={45} outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                        strokeWidth={0}
                                    >
                                        {countryData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#f1f5f9', padding: '10px 14px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-2 max-h-48 overflow-y-auto pr-2">
                            {countryData.map((item, i) => (
                                <div key={item.name} className="flex items-center justify-between gap-2 text-sm group">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        <span className="text-slate-700 dark:text-slate-300 truncate font-medium">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Section: Workload and Global Activity Feed */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Workload Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="xl:col-span-3 bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Workload by User</h3>
                        <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2.5 py-1 rounded-full font-medium">Activity Tracking</span>
                    </div>
                    <div className="h-80 w-full min-h-[320px] min-w-0">
                        <ResponsiveContainer width="99%" height={320} minWidth={0}>
                            <BarChart data={workloadData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    angle={-30}
                                    textAnchor="end"
                                />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#f1f5f9', padding: '10px 14px' }}
                                    itemStyle={{ color: '#f1f5f9' }}
                                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                                    {workloadData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Global Activity Timeline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="xl:col-span-2 bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col h-[460px]"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-violet-500" />
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Team Activity</h3>
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Live Feed</span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {activities.length > 0 ? (
                            activities.map((activity, idx) => (
                                <div key={activity.id} className="relative pl-6 pb-2 group">
                                    {/* Timeline line */}
                                    {idx !== activities.length - 1 && (
                                        <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-700 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition-colors" />
                                    )}
                                    {/* Point */}
                                    <div className="absolute left-0 top-1.5 w-[16px] h-[16px] rounded-full bg-white dark:bg-slate-800 border-2 border-violet-500 z-10 shadow-sm" />

                                    <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-100/50 dark:border-slate-800/50 group-hover:border-violet-200 dark:group-hover:border-violet-900/50 transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[150px]">
                                                {activity.prospect_name}
                                            </p>
                                            <span className="text-[9px] font-bold text-slate-400 tabular-nums">
                                                {new Date(activity.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic mb-2">
                                            "{activity.description || 'No details'}"
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-md">
                                                {getInteractionIcon(activity.interaction_type)}
                                                <span>{activity.interaction_type}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] text-white">
                                                    {activity.created_by.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                                    {activity.created_by}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
                                <Activity size={32} className="text-slate-300" />
                                <p className="text-sm font-medium text-slate-400">No recent activity detected.</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={loadStats}
                        className="mt-4 w-full py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 transition-all"
                    >
                        Check for Updates
                    </button>
                </motion.div>
            </div>
        </div>
    );
};

export default AdminDashboard;
