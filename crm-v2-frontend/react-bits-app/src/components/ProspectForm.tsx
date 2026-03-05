import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, AlertCircle, Mail } from 'lucide-react';
import { prospectService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ProspectForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditMode);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        school_name: '',
        country: 'France', // Default
        school_type: 'Private', // Default
        contact_name: '',
        contact_role: 'Director', // Default
        email: '',
        website: '',
        student_count: '',
        status: 'Nouveau',
        notes: ''
    });

    useEffect(() => {
        if (isEditMode) {
            fetchProspect();
        }
    }, [id]);

    const fetchProspect = async () => {
        try {
            if (!id) return;
            const res = await prospectService.getProspect(Number(id));
            if (res.success && res.prospect) {
                setFormData({
                    ...res.prospect,
                    student_count: res.prospect.student_count || '',
                });
            } else {
                setError('Failed to load prospect details');
            }
        } catch (err) {
            setError('Error fetching prospect');
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.SyntheticEvent | null, shouldEmail: boolean = false) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Basic Validation
        if (!formData.school_name || formData.school_name.trim() === '') {
            setError('School Name is required');
            setLoading(false);
            return;
        }

        if (shouldEmail && (!formData.email || !formData.email.trim())) {
            setError('Email is required when using "Add & Email"');
            setLoading(false);
            return;
        }

        try {
            let res;
            // Clean up student_count to be a number or undefined
            const payload = {
                ...formData,
                student_count: formData.student_count ? Number(formData.student_count) : undefined,
                assigned_to_id: isEditMode ? undefined : user?.id,
                interaction_email_sent: !isEditMode && shouldEmail && !!formData.email
            };

            if (isEditMode && id) {
                // @ts-ignore - mismatch in loose types vs strict interface
                res = await prospectService.updateProspect(Number(id), payload);
            } else {
                // @ts-ignore
                res = await prospectService.createProspect(payload);
            }

            if (res.success) {
                // Send welcome email logic
                if (!isEditMode && shouldEmail && formData.email) {
                    try {
                        await prospectService.sendWelcomeEmail(
                            formData.email,
                            formData.school_name,
                            formData.contact_name
                        );
                        setSuccess('Prospect created successfully! Welcome email sent.');
                    } catch (emailErr) {
                        console.error('Failed to send welcome email:', emailErr);
                        setSuccess('Prospect created, but failed to send welcome email.');
                    }
                } else {
                    if (!isEditMode) {
                        setSuccess('Prospect created successfully!');
                    } else {
                        setSuccess('Prospect updated successfully!');
                    }
                }

                setTimeout(() => {
                    navigate(isEditMode ? `/prospects/${id}` : '/prospects');
                }, 1500);
            } else {
                setError(res.message || 'Operation failed');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-500" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                        {isEditMode ? 'Edit Prospect' : 'New Prospect'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    {!isEditMode && (
                        <button
                            onClick={(e) => handleSubmit(e, true)}
                            disabled={loading}
                            className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                            Add & Email
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isEditMode ? 'Update' : 'Save Only'}
                    </button>
                </div>
            </header>

            <div className="p-8 max-w-3xl mx-auto w-full">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2"
                    >
                        <AlertCircle size={20} />
                        {error}
                    </motion.div>
                )}

                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-2"
                    >
                        ✓ {success}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    {/* School Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">School Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">School Name *</label>
                                <input
                                    required
                                    name="school_name"
                                    value={formData.school_name}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
                                    placeholder="e.g. International School of Paris"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={`text-sm font-medium ${isEditMode ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                    Country * {isEditMode && <span className="text-[10px] uppercase opacity-50 ml-1">(Read-only)</span>}
                                </label>
                                {isEditMode ? (
                                    <div className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-100 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-sm font-medium">
                                        {formData.country || '—'}
                                    </div>
                                ) : (
                                    <select
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm transition-all focus:ring-2 focus:ring-primary/50"
                                        required
                                    >
                                        <option value="">Select Country</option>
                                        <option value="France">France</option>
                                        <option value="Suisse">Suisse</option>
                                        <option value="Belgique">Belgique</option>
                                        <option value="Luxembourg">Luxembourg</option>
                                        <option value="Maroc">Maroc</option>
                                        <option value="Tunisie">Tunisie</option>
                                        <option value="Sénégal">Sénégal</option>
                                        <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                                        <option value="UAE">UAE</option>
                                        <option value="Canada">Canada</option>
                                        <option value="Autre">Autre</option>
                                    </select>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                                <select
                                    name="school_type"
                                    value={formData.school_type}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
                                >
                                    <option value="Private">Private</option>
                                    <option value="Public">Public</option>
                                    <option value="Charter">Charter</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Student Count</label>
                                <input
                                    type="number"
                                    name="student_count"
                                    value={formData.student_count}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
                                    placeholder="e.g. 850"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-4 pt-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Primary Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact Name</label>
                                <input
                                    name="contact_name"
                                    value={formData.contact_name}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role *</label>
                                <select
                                    name="contact_role"
                                    value={formData.contact_role}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
                                >
                                    <option value="Director">Director</option>
                                    <option value="Principal">Principal</option>
                                    <option value="Head of School">Head of School</option>
                                    <option value="Teacher">Teacher</option>
                                    <option value="Secretary">Secretary</option>
                                    <option value="IT Admin">IT Admin</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
                                    placeholder="e.g. contact@school.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Website</label>
                                <input
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
                                    placeholder="e.g. www.school.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-4 pt-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Status & Notifications</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
                                >
                                    <option value="Nouveau">Nouveau</option>
                                    <option value="Contacté">Contacté</option>
                                    <option value="Répondu">Répondu</option>
                                    <option value="Intéressé">Intéressé</option>
                                    <option value="Démo planifiée">Démo planifiée</option>
                                    <option value="Démo réalisée">Démo réalisée</option>
                                    <option value="Client">Client</option>
                                    <option value="Perdu">Perdu</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-4 pt-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Notes</h3>
                        <div className="space-y-1">
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
                                placeholder="Any additional information..."
                            />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProspectForm;
