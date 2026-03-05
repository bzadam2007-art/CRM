import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    MessageSquare,
    Activity,
    Calendar,
    Filter,
    Clock,
    Mail,
    Phone,
    AlertCircle,
    Info,
    CheckCircle,
    Sparkles
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { dashboardService, prospectService } from '../services/api';
import { adminService } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';

const StatCard = ({ title, value, icon: Icon, colorClass, bgClass, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay, duration: 0.4 }}
        className="glass p-6 rounded-2xl flex flex-col gap-3 group border border-white/10"
    >
        <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
            <div className={`p-2.5 rounded-xl ${bgClass} group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={22} className={colorClass} />
            </div>
        </div>
        <div>
            <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{value}</p>
        </div>
        {/* Trend section removed as requested */}
    </motion.div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalProspects: 0,
        priority: 0,
        converted: 0,
        replied: 0,
        byStatus: {} as Record<string, number>,
        byPriority: {} as Record<string, number>
    });
    const [recentProspects, setRecentProspects] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<any>(null);
    const [showGlobalResetConfirm, setShowGlobalResetConfirm] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);


    const handleGlobalReset = async () => {
        setIsCleaning(true);
        try {
            const result = await adminService.resetSystem();
            if (result.success) {
                await refreshDashboardData();
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

    const refreshDashboardData = async () => {
        if (!user) return;
        const statsData = await dashboardService.getStats(user.id, user.role);
        if (statsData.success) {
            setStats({
                totalProspects: statsData.stats?.total_prospects || 0,
                priority: statsData.stats?.by_priority?.['Prioritaire'] || 0,
                converted: statsData.stats?.by_status?.['Client'] || 0,
                replied: statsData.stats?.by_status?.['Répondu'] || 0,
                byStatus: statsData.stats?.by_status || {},
                byPriority: statsData.stats?.by_priority || {}
            });
        }
        setRecentProspects([]);
    };

    const getInteractionIcon = (type: string) => {
        switch (type) {
            case 'Email': return <Mail size={14} />;
            case 'Phone': return <Phone size={14} />;
            case 'Note': return <MessageSquare size={14} />;
            default: return <Info size={14} />;
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Check database health
                const healthData = await dashboardService.health();
                setHealth(healthData);

                // Fetch stats via Supabase
                const statsData = await dashboardService.getStats(user?.id, user?.role);

                if (statsData.success) {
                    setStats({
                        totalProspects: statsData.stats?.total_prospects || 0,
                        priority: statsData.stats?.by_priority?.['Prioritaire'] || 0,
                        converted: statsData.stats?.by_status?.['Client'] || 0,
                        replied: statsData.stats?.by_status?.['Répondu'] || 0,
                        byStatus: statsData.stats?.by_status || {},
                        byPriority: statsData.stats?.by_priority || {}
                    });
                }

                // Fetch recent prospects via Supabase
                const prospectsData = await prospectService.getProspects({
                    per_page: 5,
                    userId: user?.id,
                    role: user?.role
                });
                if (prospectsData.success && prospectsData.prospects) {
                    setRecentProspects(prospectsData.prospects.slice(0, 5));
                }

                // Fetch recent activity (Team History - Global)
                const activityData = await dashboardService.getRecentActivity(10);
                if (activityData.success) {
                    setActivities(activityData.activities || []);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="flex flex-col h-full bg-transparent overflow-y-auto">
            {/* Health Check Banner */}
            {health && health.status === 'error' && (
                <div className="bg-rose-500 text-white px-8 py-3 flex items-center justify-between shadow-lg z-20 sticky top-0 backdrop-blur-md bg-opacity-90">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} />
                        <div>
                            <p className="font-bold text-sm">Database Connection Issue</p>
                            <p className="text-xs opacity-90">{health.message || 'Could not reach Supabase tables. Check your configuration.'}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        {!health.users_table && <span className="text-[10px] bg-rose-700 px-2 py-0.5 rounded uppercase font-bold">Users Table Missing</span>}
                        {!health.prospects_table && <span className="text-[10px] bg-rose-700 px-2 py-0.5 rounded uppercase font-bold">Prospects Table Missing</span>}
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="h-20 bg-slate-900/50 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="absolute -inset-2 bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <img
                            src="/logo.png"
                            alt="EXPANZIA"
                            className="w-10 h-10 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.6)] transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-xl font-black tracking-tight text-white">EXPANZIA</h2>
                        <p className="text-xs font-medium text-slate-400 tracking-wide">Dashboard Overview</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {user?.role !== 'admin' && (
                        <>
                            <button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all active:scale-95 border border-white/10" onClick={() => navigate('/prospects?new=true')}>
                                <span className="text-lg">+</span>
                                <span>New Prospect</span>
                            </button>
                        </>
                    )}
                    <div className="h-10 w-10 rounded-xl bg-slate-800/50 flex items-center justify-center border border-white/10 text-slate-400 cursor-pointer hover:bg-slate-800 transition-colors hover:text-white">
                        <Calendar size={18} />
                    </div>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setShowGlobalResetConfirm(true)}
                            className="flex items-center gap-2 bg-red-900/20 text-red-500 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-red-900/40 transition-all border border-red-500/20 ml-2"
                            title="Reset Entire System"
                        >
                            <Sparkles size={14} />
                            <span>System Restart</span>
                        </button>
                    )}
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
            </header>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-primary relative z-10"></div>
                    </div>
                </div>
            ) : (
                <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <StatCard
                            title="Total Leads"
                            value={stats.totalProspects}
                            icon={TrendingUp}
                            trend="+12.5%"
                            trendLabel="from last month"
                            colorClass="text-primary"
                            bgClass="bg-purple-50 dark:bg-purple-900/20"
                            delay={0.1}
                        />
                        <StatCard
                            title="Priority"
                            value={stats.priority}
                            icon={AlertCircle}
                            trend="+4"
                            trendLabel="new high priority"
                            colorClass="text-amber-500"
                            bgClass="bg-amber-50 dark:bg-amber-900/20"
                            delay={0.2}
                        />
                        <StatCard
                            title="Replied"
                            value={stats.replied}
                            icon={CheckCircle}
                            trend="+3"
                            trendLabel="prospects replied"
                            colorClass="text-cyan-500"
                            bgClass="bg-cyan-50 dark:bg-cyan-900/20"
                            delay={0.3}
                        />
                        <StatCard
                            title="Converted"
                            value={stats.converted}
                            icon={CheckCircle}
                            trend="+5.2%"
                            trendLabel="conversion increase"
                            colorClass="text-emerald-500"
                            bgClass="bg-emerald-50 dark:bg-emerald-900/20"
                            delay={0.4}
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Analytics Chart - Priority Distribution */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="lg:col-span-2 glass p-6 rounded-2xl border border-white/10"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lead Priority Distribution</h3>
                                    <p className="text-sm text-slate-500">Breakdown by priority level</p>
                                </div>
                                <button className="p-2 hover:bg-purple-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    <Filter size={18} className="text-slate-400" />
                                </button>
                            </div>
                            <div className="h-72 w-full min-h-[288px] min-w-0">
                                <ResponsiveContainer width="99%" height={288} minWidth={0}>
                                    <PieChart>
                                        <Pie
                                            data={Object.entries({
                                                'Prioritaire': stats.byPriority['Prioritaire'] || 0,
                                                'Moyen': stats.byPriority['Moyen'] || 0,
                                                'Faible': stats.byPriority['Faible'] || 0
                                            }).map(([key, value]) => ({ name: key, value: value as number }))}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={6}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {['Prioritaire', 'Moyen', 'Faible'].map((key) => (
                                                <Cell key={`${key}`} fill={
                                                    key === 'Prioritaire' ? '#ef4444' :
                                                        key === 'Moyen' ? '#f59e0b' :
                                                            '#3b82f6'
                                                } strokeWidth={0} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                padding: '12px'
                                            }}
                                            itemStyle={{ color: '#1e293b', fontWeight: 600, fontSize: '13px' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{ paddingTop: '20px', fontWeight: 500, fontSize: '13px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Priority Breakdown Stack */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="glass p-6 rounded-2xl flex flex-col border border-white/10"
                        >
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Priority Metrics</h3>
                            <div className="flex-1 flex flex-col justify-center space-y-6">
                                {Object.entries(stats.byPriority).length > 0 ? (
                                    Object.entries({
                                        'Prioritaire': stats.byPriority['Prioritaire'] || 0,
                                        'Moyen': stats.byPriority['Moyen'] || 0,
                                        'Faible': stats.byPriority['Faible'] || 0
                                    }).map(([key, value]: [string, any]) => (
                                        <div key={key} className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="size-2.5 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                key === 'Prioritaire' ? '#ef4444' :
                                                                    key === 'Moyen' ? '#f59e0b' :
                                                                        '#3b82f6'
                                                        }}
                                                    />
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{key}</span>
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-white">{value} leads</span>
                                            </div>
                                            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${stats.totalProspects > 0 ? (value / stats.totalProspects) * 100 : 0}%` }}
                                                    transition={{ duration: 1, ease: "easeOut", delay: 0.8 }}
                                                    className="h-full rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            key === 'Prioritaire' ? '#ef4444' :
                                                                key === 'Moyen' ? '#f59e0b' :
                                                                    '#3b82f6'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 opacity-50">
                                        <Info size={40} className="mx-auto mb-2" />
                                        <p>No data to display</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Recent Prospects & Team History Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Recent Prospects */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="lg:col-span-3 glass rounded-2xl overflow-hidden border border-white/10"
                        >
                            <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Prospects</h3>
                                    <p className="text-xs text-slate-500 mt-1">Latest leads added to the system</p>
                                </div>
                                <button className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20" onClick={() => navigate('/prospects')}>
                                    View All
                                </button>
                            </div>

                            {/* Status Filter Buttons */}
                            <div className="px-6 py-4 border-b border-purple-100 dark:border-slate-800/50 flex flex-wrap gap-2 bg-purple-50/50 dark:bg-slate-900/20">
                                {['All', 'Nouveau', 'Contacté', 'Répondu', 'Intéressé'].map((status) => {
                                    const isActive = selectedStatus === (status === 'All' ? null : status);
                                    let activeClass = '';
                                    if (isActive) {
                                        if (status === 'Nouveau') activeClass = 'bg-blue-500 text-white shadow-lg shadow-blue-500/25';
                                        else if (status === 'Contacté') activeClass = 'bg-amber-500 text-white shadow-lg shadow-amber-500/25';
                                        else if (status === 'Répondu') activeClass = 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25';
                                        else if (status === 'Intéressé') activeClass = 'bg-purple-500 text-white shadow-lg shadow-purple-500/25';
                                        else activeClass = 'bg-primary text-white shadow-lg shadow-primary/25';
                                    } else {
                                        activeClass = 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700';
                                    }

                                    return (
                                        <button
                                            key={status}
                                            onClick={() => setSelectedStatus(status === 'All' ? null : status)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none ${activeClass}`}
                                        >
                                            {status}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/80 dark:bg-slate-800/30 text-xs text-slate-500 uppercase font-semibold">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">School Name</th>
                                            <th className="px-6 py-4 font-bold">Status</th>
                                            <th className="px-6 py-4 font-bold">Country</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-purple-100 dark:divide-slate-800/50">
                                        {recentProspects
                                            .filter(prospect => selectedStatus === null || prospect.status === selectedStatus)
                                            .map((prospect) => (
                                                <tr key={prospect.id} className="hover:bg-purple-50/80 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group" onClick={() => navigate(`/prospects/${prospect.id}`)}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-10 rounded-xl bg-purple-100 dark:bg-slate-800 flex items-center justify-center text-purple-500 font-bold text-xs shadow-sm group-hover:bg-white group-hover:shadow-md transition-all">
                                                                {prospect.school_name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{prospect.school_name}</span>
                                                                <span className="text-xs text-slate-500">{prospect.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide
                                                    ${prospect.status === 'Nouveau' ? 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30' :
                                                                prospect.status === 'Client' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' :
                                                                    prospect.status === 'Contacté' ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30' :
                                                                        'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'
                                                            }`}>
                                                            {prospect.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                                        {prospect.country}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>

                        {/* Recent Team History */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="lg:col-span-2 glass p-6 rounded-2xl flex flex-col h-[600px] border border-white/10"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                        <Clock size={18} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                                </div>
                                <span className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-emerald-500">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    Live
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                                {activities.length > 0 ? (
                                    activities.map((activity, idx) => (
                                        <div key={activity.id} className="relative pl-6 pb-2 group">
                                            {/* Timeline line */}
                                            {idx !== activities.length - 1 && (
                                                <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-purple-100 dark:bg-slate-800 group-hover:bg-primary/20 transition-colors" />
                                            )}
                                            {/* Point */}
                                            <div className="absolute left-0 top-1.5 w-[16px] h-[16px] rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 group-hover:border-primary z-10 transition-colors" />

                                            <div className="pl-2">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px] group-hover:text-primary transition-colors">
                                                        {activity.prospect_name}
                                                    </p>
                                                    <span className="text-[9px] font-medium text-slate-400 tabular-nums">
                                                        {new Date(activity.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                                                    {activity.description || 'No details'}
                                                </p>

                                                <div className="flex items-center justify-between bg-purple-50 dark:bg-slate-800/40 p-2 rounded-lg border border-purple-100 dark:border-slate-800 group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors shadow-sm">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                        {getInteractionIcon(activity.interaction_type)}
                                                        <span>{activity.interaction_type}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[8px] text-white shadow-sm">
                                                            {activity.created_by.charAt(0).toUpperCase()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
                                        <Activity size={32} className="text-slate-300" />
                                        <p className="text-sm font-medium text-slate-400">No recent team activity.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;


