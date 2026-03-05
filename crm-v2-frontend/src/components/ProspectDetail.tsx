import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    MapPin,
    Mail,
    Globe,
    Users,
    Award,
    TrendingUp,
    Clock,
    Pencil,
    Trash,
    MessageSquare,
    PhoneCall,
    Activity
} from 'lucide-react';
import { calculateScore } from '../utils/scoring';
import { prospectService, interactionService } from '../services/api';
// In real app, we would fetch from API
import StatusPipeline from './StatusPipeline';

const ProspectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Mock data state (replace with API fetch later)
    // Mock data state (replace with API fetch later)
    const [prospect, setProspect] = useState<any>(null);
    const [interactions, setInteractions] = useState<any[]>([]);
    const [scoreData, setScoreData] = useState<any>(null);
    // const [history, setHistory] = useState<any[]>([]); // Score history not yet implemented in frontend API
    const [editingInteractionId, setEditingInteractionId] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<any>({
        interaction_type: '',
        description: '',
        result: 'Pending'
    });

    const fetchAllData = async () => {
        if (!id) return;
        try {
            // Fetch prospect details
            const prospectRes = await prospectService.getProspect(Number(id));
            if (prospectRes.success) setProspect(prospectRes.prospect);

            // Fetch interactions
            const interactionsRes = await interactionService.getInteractions(Number(id));
            if (interactionsRes.success) setInteractions(interactionsRes.interactions);

            // Calculate score data from prospect
            if (prospectRes.success && prospectRes.prospect) {
                const result = calculateScore(prospectRes.prospect);
                setScoreData(result);
            }

        } catch (error) {
            console.error("Failed to fetch details", error);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [id]);

    if (!prospect) return <div className="p-8 text-center">Loading...</div>;

    const getPriorityColor = (p: string) => {
        switch (p?.toLowerCase()) {
            case 'high': case 'prioritaire': return 'text-red-500 bg-red-50 border-red-200';
            case 'medium': case 'moyen': return 'text-amber-500 bg-amber-50 border-amber-200';
            default: return 'text-emerald-500 bg-emerald-50 border-emerald-200';
        }
    };

    const handleEditInteraction = (interaction: any) => {
        setEditingInteractionId(interaction.id);
        setEditFormData({
            interaction_type: interaction.interaction_type,
            description: interaction.description,
            result: interaction.result
        });
    };

    const handleSaveInteraction = async () => {
        if (!editingInteractionId) return;
        try {
            const res = await interactionService.updateInteraction(editingInteractionId, editFormData);
            if (res.success) {
                // Update interactions list
                setInteractions(interactions.map(i =>
                    i.id === editingInteractionId ? { ...i, ...editFormData } : i
                ));
                setEditingInteractionId(null);
            }
        } catch (error) {
            console.error("Failed to update interaction", error);
        }
    };

    const handleDeleteInteraction = async (interactionId: number) => {
        if (!window.confirm('Are you sure you want to delete this interaction?')) return;
        try {
            const res = await interactionService.deleteInteraction(interactionId);
            if (res.success) {
                setInteractions(interactions.filter(i => i.id !== interactionId));
            }
        } catch (error) {
            console.error("Failed to delete interaction", error);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this prospect?')) return;

        try {
            if (!id) return;
            const res = await prospectService.deleteProspect(Number(id));
            if (res.success) {
                navigate('/prospects');
            } else {
                alert('Failed to delete prospect');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting prospect');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft size={20} className="text-slate-500" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">{prospect.school_name}</h1>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><MapPin size={14} /> {prospect.country}</span>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getPriorityColor(prospect.priority)}`}>
                        {prospect.priority}
                    </span>
                    {/* Commercial users can edit, admin cannot */}
                    {user?.role === 'commercial' && (
                        <button
                            onClick={() => navigate(`/prospects/${id}/edit`)}
                            className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Edit Prospect"
                        >
                            <Pencil size={20} />
                        </button>
                    )}
                    {/* Only admin can delete */}
                    {user?.role === 'admin' && (
                        <button
                            onClick={handleDelete}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Prospect"
                        >
                            <Trash size={20} />
                        </button>
                    )}
                </div>
            </header>

            <div className="p-4 md:py-8 md:px-6 max-w-[1600px] mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Column: Info & Scoring */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* School & Contact Information */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                        >
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Users size={18} className="text-primary" />
                                Prospect Information
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Mail className="text-slate-400" size={18} />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{prospect.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Globe className="text-slate-400" size={18} />
                                        {prospect.website ? (
                                            <a
                                                href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline truncate"
                                            >
                                                {prospect.website}
                                            </a>
                                        ) : (
                                            <span className="text-sm text-slate-700 dark:text-slate-300">N/A</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Current Score Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                        >
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Award className="text-amber-500" /> Current Score
                            </h3>
                            <div className="flex flex-col items-center justify-center py-4">
                                <div className="relative text-5xl font-black text-slate-900 dark:text-white">
                                    {scoreData?.score}
                                </div>
                                <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${scoreData?.score}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className={`h-full ${scoreData?.score >= 60 ? 'bg-emerald-500' :
                                            scoreData?.score >= 30 ? 'bg-amber-500' : 'bg-red-500'
                                            }`}
                                    />
                                </div>
                                <p className="mt-4 text-center text-xs text-slate-500">
                                    Priority level: <span className={`font-bold uppercase ${getPriorityColor(scoreData?.priority).split(' ')[0]}`}>{scoreData?.priority}</span>
                                </p>
                            </div>
                            <div className="mt-6 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                                    <TrendingUp size={14} className="text-primary" /> Key Factors
                                </h4>
                                {scoreData?.breakdown.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[180px]" title={item.rule}>{item.rule}</span>
                                        <span className={`font-bold ${item.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {item.points > 0 ? '+' : ''}{item.points}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Pipeline & Historique */}
                    <div className="lg:col-span-9 space-y-6">
                        {/* Pipeline Status - Removed for commercial as requested */}
                        {user?.role !== 'commercial' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                            >
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={18} className="text-indigo-500" />
                                    Conversion Pipeline
                                </h3>
                                <StatusPipeline
                                    currentStatus={prospect.status}
                                    onStatusChange={async (newStatus) => {
                                        try {
                                            if (!id) return;
                                            const res = await prospectService.updateProspect(Number(id), { status: newStatus });
                                            if (res.success) {
                                                setProspect(res.prospect);
                                            }
                                        } catch (err) {
                                            console.error("Failed to update status", err);
                                        }
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* Historique (Activity Feed) */}
                        <div className="space-y-6">
                            {/* Log Interaction Form - Only for Commercial */}
                            {user?.role === 'commercial' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                                >
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                        <MessageSquare size={18} className="text-primary" />
                                        New Activity Log
                                    </h3>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const form = e.target as HTMLFormElement;
                                        const data = new FormData(form);

                                        try {
                                            if (!id) return;
                                            const res = await interactionService.createInteraction(Number(id), {
                                                interaction_type: String(data.get('type')),
                                                description: String(data.get('description')),
                                                result: String(data.get('result') || 'Neutral')
                                            });

                                            if (res.success) {
                                                form.reset();
                                                fetchAllData();
                                            }
                                        } catch (err) {
                                            console.error("Failed to log interaction", err);
                                        }
                                    }} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Interaction Type</label>
                                                <select name="type" className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm p-2.5 focus:ring-2 focus:ring-primary/20 transition-all font-medium" required>
                                                    <option value="call">Phone Call</option>
                                                    <option value="email">Email</option>
                                                    <option value="meeting">Meeting</option>
                                                    <option value="note">Internal Note</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Outcome / Result</label>
                                                <select name="result" className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm p-2.5 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                                                    <option value="Positive">Positive Result</option>
                                                    <option value="Neutral">Neutral / Ongoing</option>
                                                    <option value="Negative">Negative Result</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Details & Description</label>
                                            <textarea
                                                name="description"
                                                placeholder="Type your notes here... (e.g., 'Discussed the annual contract, they seemed interested in the new features.')"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm p-4 focus:ring-2 focus:ring-primary/20 min-h-[140px] transition-all"
                                                required
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button type="submit" className="bg-slate-900 dark:bg-primary text-white px-8 py-3 rounded-xl hover:opacity-90 transition-all font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/10">
                                                Save Interaction History
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {/* Timeline Feed */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                            >
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Clock className="text-slate-400" /> Historique Interactions
                                </h3>

                                <div className="space-y-8 relative pl-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                                    {[...interactions.map(i => ({ ...i, type: 'interaction', date: i.created_at }))]
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((item: any) => (
                                            <div key={`${item.type}-${item.id}`} className="relative group">
                                                <div className={`absolute -left-[29px] w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center
                                                ${item.type === 'score_change'
                                                        ? (item.new_score > item.old_score ? 'bg-emerald-500' : 'bg-red-500')
                                                        : 'bg-indigo-500'}`}
                                                >
                                                    {item.type === 'score_change' ? (
                                                        <TrendingUp size={12} className="text-white" />
                                                    ) : item.interaction_type === 'email' ? (
                                                        <Mail size={12} className="text-white" />
                                                    ) : item.interaction_type === 'call' ? (
                                                        <PhoneCall size={12} className="text-white" />
                                                    ) : (
                                                        <MessageSquare size={12} className="text-white" />
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-1 flex-1 pb-4 border-b border-slate-50 dark:border-slate-800 last:border-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex-1">
                                                            <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                                                                {item.type === 'score_change' ? 'Score Update' : item.interaction_type}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] tabular-nums font-bold text-slate-400 whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{new Date(item.date).toLocaleString()}</span>
                                                            {item.type === 'interaction' && editingInteractionId !== item.id && (
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleEditInteraction(item)}
                                                                        className="p-1 px-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400 text-[10px] font-bold transition-colors"
                                                                    >
                                                                        EDIT
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteInteraction(item.id)}
                                                                        className="p-1 px-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400 text-[10px] font-bold transition-colors"
                                                                    >
                                                                        DEL
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="text-sm text-slate-600 dark:text-slate-400 flex-1">
                                                        {editingInteractionId === item.id ? (
                                                            <div className="space-y-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mt-2 border border-slate-200 dark:border-slate-700 shadow-inner">
                                                                <input
                                                                    type="text"
                                                                    value={editFormData.interaction_type}
                                                                    onChange={(e) => setEditFormData({ ...editFormData, interaction_type: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                                                                />
                                                                <textarea
                                                                    value={editFormData.description}
                                                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                                                                    rows={2}
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button onClick={handleSaveInteraction} className="flex-1 bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-bold">SAVE</button>
                                                                    <button onClick={() => setEditingInteractionId(null)} className="flex-1 bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white px-3 py-1.5 rounded text-xs font-bold">CANCEL</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="mb-2 leading-relaxed">{item.description}</p>
                                                                <div className="flex items-center gap-2">
                                                                    {item.result && (
                                                                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md border-2 ${item.result === 'Positive' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                                                                            item.result === 'Negative' ? 'text-red-500 border-red-500/20 bg-red-500/5' :
                                                                                'text-slate-500 border-slate-500/20 bg-slate-500/5'
                                                                            }`}>
                                                                            {item.result}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                    {interactions.length === 0 && (
                                        <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-3">
                                            <MessageSquare className="size-8 opacity-20" />
                                            <p className="text-sm font-medium">Aucun historique d'interaction.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProspectDetail;
