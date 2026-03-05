import React, { useState } from 'react';
import { Save, Globe, Settings, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminNav from '../../components/AdminNav';

const SystemSettings: React.FC = () => {
    const [settings, setSettings] = useState({
        appName: 'EXPANZIA',
        targetCountries: ['UAE', 'Canada']
    });
    const [saved, setSaved] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const removeCountry = (country: string) => {
        setSettings(prev => ({
            ...prev,
            targetCountries: prev.targetCountries.filter(c => c !== country)
        }));
    };

    const [newCountry, setNewCountry] = useState('');
    const addCountry = () => {
        if (newCountry.trim() && !settings.targetCountries.includes(newCountry.trim())) {
            setSettings(prev => ({
                ...prev,
                targetCountries: [...prev.targetCountries, newCountry.trim()]
            }));
            setNewCountry('');
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 p-6 lg:p-8">
            {/* Success Toast */}
            <AnimatePresence>
                {saved && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-xl shadow-emerald-500/30"
                    >
                        <Check size={20} />
                        <span className="font-medium">Settings saved!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 shadow-lg shadow-slate-500/20">
                        <Settings className="text-white" size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Settings</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Configure global preferences</p>
                    </div>
                </div>
            </motion.header>

            {/* Admin Navigation Tabs */}
            <AdminNav />

            <form onSubmit={handleSave} className="space-y-6">
                {/* General Settings */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm"
                >
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 uppercase tracking-wider">
                        <Globe size={16} className="text-blue-500" />
                        General
                    </h2>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Application Name</label>
                        <input
                            type="text"
                            value={settings.appName}
                            onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                            className="w-full max-w-sm px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm text-slate-900 dark:text-white transition-all"
                        />
                    </div>
                </motion.div>



                {/* Target Countries */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm"
                >
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 uppercase tracking-wider">
                        <Globe size={16} className="text-emerald-500" />
                        Target Markets
                    </h2>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Active target countries for prospect scoring:</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <AnimatePresence mode="popLayout">
                            {settings.targetCountries.map(country => (
                                <motion.span
                                    key={country}
                                    layout
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg text-sm font-medium border border-emerald-200 dark:border-emerald-800/50"
                                >
                                    {country}
                                    <button
                                        type="button"
                                        onClick={() => removeCountry(country)}
                                        className="w-4 h-4 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 hover:text-red-700"
                                    >
                                        ×
                                    </button>
                                </motion.span>
                            ))}
                        </AnimatePresence>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCountry}
                            onChange={(e) => setNewCountry(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCountry())}
                            placeholder="Add a country..."
                            className="flex-1 max-w-xs px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 transition-all"
                        />
                        <button
                            type="button"
                            onClick={addCountry}
                            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                        >
                            Add
                        </button>
                    </div>
                </motion.div>

                {/* Save Button */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-end"
                >
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg transition-all font-semibold text-sm bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 hover:from-slate-800 hover:to-slate-950 text-white shadow-slate-900/20"
                    >
                        <Save size={18} />
                        Save Changes
                    </motion.button>
                </motion.div>
            </form>
        </div>
    );
};

export default SystemSettings;
