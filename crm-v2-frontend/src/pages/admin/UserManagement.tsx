import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import type { UserData } from '../../services/adminService';
import { Users, Trash2, Shield, UserPlus, X, Search, Check, AlertTriangle, Briefcase, Mail, Lock, User, Activity, BarChart3, Clock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminNav from '../../components/AdminNav';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'commercial' as 'admin' | 'commercial'
    });
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // User Activity state
    const [selectedUserForActivity, setSelectedUserForActivity] = useState<UserData | null>(null);
    const [userActivity, setUserActivity] = useState<any | null>(null);
    const [isActivityLoading, setIsActivityLoading] = useState(false);

    // Delete User state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
    const [deleteOption, setDeleteOption] = useState<'delete' | 'transfer' | 'unassign'>('unassign');
    const [transferToId, setTransferToId] = useState<number | string>('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await adminService.getUsers();
            if (data.success) {
                setUsers(data.users ?? []);
            }
        } catch (error) {
            console.error('Failed to load users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (user: UserData) => {
        if (user.username === 'admin') {
            alert('Cannot delete the main admin account.');
            return;
        }
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        if (deleteOption === 'transfer' && !transferToId) {
            alert('Please select a user to transfer prospects to.');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await adminService.deleteUserWithOptions(
                userToDelete.id,
                deleteOption,
                deleteOption === 'transfer' ? Number(transferToId) : undefined
            );

            if (result.success) {
                setUsers(users.filter(u => u.id !== userToDelete.id));
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
                setSuccessMessage(`User "${userToDelete.username}" deleted successfully.`);
                setTimeout(() => setSuccessMessage(''), 4000);
            } else {
                alert(result.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        // ... (rest of handleCreate remains same)
        e.preventDefault();
        setFormError('');
        setIsSubmitting(true);

        // Validations
        if (formData.password.length < 6) {
            setFormError('Password must be at least 6 characters.');
            setIsSubmitting(false);
            return;
        }

        try {
            const result = await adminService.createUser(formData);
            if (result.success) {
                setUsers(prev => [result.user, ...prev]);
                setIsModalOpen(false);
                setFormData({ username: '', email: '', password: '', role: 'commercial' });
                setSuccessMessage(`User "${formData.username}" created successfully!`);
                setTimeout(() => setSuccessMessage(''), 4000);
            } else {
                setFormError(result.message || 'Failed to create user');
            }
        } catch (error) {
            setFormError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewActivity = async (user: UserData) => {
        setSelectedUserForActivity(user);
        setIsActivityLoading(true);
        setUserActivity(null);
        try {
            const result = await adminService.getUserActivity(user.id);
            if (result.success) {
                setUserActivity(result.activity);
            }
        } catch (error) {
            console.error('Activity load error:', error);
        } finally {
            setIsActivityLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const adminCount = users.filter(u => u.role === 'admin').length;
    const commercialCount = users.filter(u => u.role === 'commercial').length;

    if (loading) return (
        <div className="flex justify-center items-center h-full">
            <div className="w-10 h-10 border-4 border-violet-200 dark:border-violet-800 rounded-full animate-spin border-t-violet-600 dark:border-t-violet-400" />
        </div>
    );

    return (
        <div className="space-y-6 p-6 lg:p-8">
            {/* Success Toast */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-xl shadow-emerald-500/30"
                    >
                        <Check size={20} />
                        <span className="font-medium">{successMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                        <Users className="text-white" size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">User Management</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Manage accounts & permissions</p>
                    </div>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setIsModalOpen(true); setFormError(''); }}
                    className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/25 font-semibold text-sm"
                >
                    <UserPlus size={18} />
                    Add New User
                </motion.button>
            </motion.header>

            {/* Admin Navigation Tabs */}
            <AdminNav />

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center">
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{users.length}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider mt-1">Total Users</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center">
                    <p className="text-3xl font-black text-violet-600 dark:text-violet-400">{adminCount}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider mt-1">Admins</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center">
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{commercialCount}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider mt-1">Commercial</p>
                </motion.div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-3 bg-white dark:bg-slate-800/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 text-sm text-slate-900 dark:text-white placeholder-slate-400"
                    />
                </div>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
                    {[{ label: 'All', value: 'all' }, { label: 'Admin', value: 'admin' }, { label: 'Commercial', value: 'commercial' }].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setRoleFilter(opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${roleFilter === opt.value
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* User Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                    {filteredUsers.map((user, index) => (
                        <motion.div
                            key={user.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.03 }}
                            className="group relative bg-white dark:bg-slate-800/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 dark:hover:shadow-slate-900/40 transition-all duration-200"
                        >
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg ${user.role === 'admin'
                                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30'
                                    : 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/30'
                                    }`}>
                                    {user.username.substring(0, 2).toUpperCase()}
                                    {user.role === 'admin' && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                                            <Shield size={10} className="text-amber-900" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-900 dark:text-white truncate">{user.username}</p>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin'
                                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                            }`}>
                                            {user.role === 'admin' ? <Shield size={9} /> : <Briefcase size={9} />}
                                            {user.role}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase ${user.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                            Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {user.role !== 'admin' && (
                                        <button
                                            onClick={() => handleViewActivity(user)}
                                            className="p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            title="View Activity"
                                        >
                                            <Activity size={18} />
                                        </button>
                                    )}
                                    {user.username !== 'admin' && (
                                        <button
                                            onClick={() => handleDeleteClick(user)}
                                            className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete User"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredUsers.length === 0 && (
                    <div className="col-span-full py-12 text-center">
                        <Users className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No users found</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {isDeleteModalOpen && userToDelete && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-md"
                            onClick={() => setIsDeleteModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 pointer-events-auto">
                                <div className="p-8">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-600 dark:text-red-400">
                                            <Trash2 size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Delete User?</h3>
                                            <p className="text-sm text-slate-500">You are about to delete <span className="font-bold text-slate-700 dark:text-slate-300">{userToDelete.username}</span>.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">What should happen to their prospects?</label>
                                            <div className="grid grid-cols-1 gap-3">
                                                <button
                                                    onClick={() => setDeleteOption('unassign')}
                                                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${deleteOption === 'unassign'
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                                        : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-xl ${deleteOption === 'unassign' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                        <User size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">Unassign them</p>
                                                        <p className="text-[10px] opacity-70 italic">Leave them as "Unassigned" in the database</p>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => setDeleteOption('transfer')}
                                                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${deleteOption === 'transfer'
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                        : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-xl ${deleteOption === 'transfer' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                        <Briefcase size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">Transfer them</p>
                                                        <p className="text-[10px] opacity-70 italic">Reassign all prospects to another user</p>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => setDeleteOption('delete')}
                                                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${deleteOption === 'delete'
                                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                                        : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-xl ${deleteOption === 'delete' ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                        <Trash2 size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-red-600 dark:text-red-400">Delete everything</p>
                                                        <p className="text-[10px] opacity-70 italic font-medium">DANGER: Locally deletes all their assigned prospects</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        {deleteOption === 'transfer' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="space-y-2"
                                            >
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Select target user</label>
                                                <select
                                                    value={transferToId}
                                                    onChange={(e) => setTransferToId(e.target.value)}
                                                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Choose a user...</option>
                                                    {users.filter(u => u.id !== userToDelete.id).map(u => (
                                                        <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                                                    ))}
                                                </select>
                                            </motion.div>
                                        )}

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={() => setIsDeleteModalOpen(false)}
                                                className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={confirmDelete}
                                                disabled={isSubmitting || (deleteOption === 'transfer' && !transferToId)}
                                                className={`flex-1 py-4 px-6 rounded-2xl text-white font-bold text-sm shadow-xl transition-all active:scale-95 disabled:opacity-50 ${deleteOption === 'delete' ? 'bg-red-600 shadow-red-500/20' : 'bg-indigo-600 shadow-indigo-500/20'
                                                    }`}
                                            >
                                                {isSubmitting ? 'Processing...' : 'Confirm Deletion'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Create User Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                                {/* Modal Header */}
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
                                                <UserPlus size={18} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">New User</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Fill in the details below</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleCreate} className="p-6 space-y-5">
                                    {formError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-800"
                                        >
                                            <AlertTriangle size={16} />
                                            {formError}
                                        </motion.div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Username</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                required
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                placeholder="e.g. john_doe"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="user@schoolcrm.com"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                minLength={6}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="Min. 6 characters"
                                                className="w-full pl-10 pr-12 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                title={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Role</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, role: 'commercial' })}
                                                className={`p-3 rounded-xl border-2 text-center transition-all ${formData.role === 'commercial'
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                                                    }`}
                                            >
                                                <Briefcase size={20} className="mx-auto mb-1" />
                                                <span className="text-xs font-bold">Commercial</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, role: 'admin' })}
                                                className={`p-3 rounded-xl border-2 text-center transition-all ${formData.role === 'admin'
                                                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                                                    }`}
                                            >
                                                <Shield size={20} className="mx-auto mb-1" />
                                                <span className="text-xs font-bold">Admin</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white transition-all disabled:opacity-50 font-semibold text-sm shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus size={16} />
                                                    Create User
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* User Activity Modal */}
            <AnimatePresence>
                {selectedUserForActivity && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 dark:bg-black/60 z-[60] backdrop-blur-sm"
                            onClick={() => setSelectedUserForActivity(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-4 md:inset-x-auto md:inset-y-10 md:left-1/2 md:-translate-x-1/2 md:w-[700px] z-[70] flex flex-col"
                        >
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex-1 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                                {/* Header */}
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                            {selectedUserForActivity.username.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedUserForActivity.username}'s Activity</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{selectedUserForActivity.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUserForActivity(null)}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                    {isActivityLoading ? (
                                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                                            <div className="w-10 h-10 border-4 border-violet-200 dark:border-violet-800 rounded-full animate-spin border-t-violet-600 dark:border-t-violet-400" />
                                            <p className="text-slate-500 font-medium">Loading history...</p>
                                        </div>
                                    ) : userActivity ? (
                                        <>
                                            {/* Summary Stats */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Prospects</p>
                                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{userActivity.total_prospects}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Interactions</p>
                                                    <p className="text-2xl font-black text-violet-600 dark:text-violet-400">{userActivity.total_interactions}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Converted</p>
                                                    <p className="text-2xl font-black text-emerald-500">{userActivity.status_distribution['Client'] || 0}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Conversion %</p>
                                                    <p className="text-2xl font-black text-blue-500">
                                                        {userActivity.total_prospects > 0
                                                            ? Math.round(((userActivity.status_distribution['Client'] || 0) / userActivity.total_prospects) * 100)
                                                            : 0}%
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Recent Interactions */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Clock size={18} className="text-slate-400" />
                                                    <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm">Recent Interactions Log</h4>
                                                </div>
                                                <div className="space-y-3">
                                                    {userActivity.interactions.length > 0 ? (
                                                        userActivity.interactions.map((i: any) => (
                                                            <div key={i.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-start gap-4">
                                                                <div className={`p-2 rounded-lg shrink-0 ${i.interaction_type === 'Email' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                    <Mail size={16} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start">
                                                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{i.school_name}</p>
                                                                        <span className="text-[10px] text-slate-400 font-medium">{new Date(i.created_at).toLocaleDateString()}</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 italic">"{i.description || 'No description'}"</p>
                                                                    <div className="mt-2 flex items-center justify-between">
                                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">{i.interaction_type}</span>
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${i.result === 'Interested' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                            {i.result || 'Logged'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                                            <p className="text-slate-400 text-sm font-medium">No interaction history found for this user.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Status Breakdown */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <BarChart3 size={18} className="text-slate-400" />
                                                    <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm">Prospect Status Distribution</h4>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {Object.entries(userActivity.status_distribution).map(([status, count]: any) => (
                                                        <div key={status} className="flex flex-col p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{status}</span>
                                                            <span className="text-lg font-black text-slate-900 dark:text-white">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-10">
                                            <p className="text-slate-500">Failed to load user activity.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                                    <button
                                        onClick={() => setSelectedUserForActivity(null)}
                                        className="px-6 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors"
                                    >
                                        Close Activity
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserManagement;
