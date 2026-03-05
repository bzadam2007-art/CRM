import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    UserPlus,
    Upload,
    ClipboardList,
    Globe,
    Plus,
    Edit,
    X,
} from 'lucide-react';
import { prospectService } from '../services/api';
import type { IProspect } from '../services/api';
import { adminService } from '../services/adminService';
import type { UserData } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';

export type LeadStatus = 'Nouveau' | 'Contacté' | 'Répondu' | 'Intéressé' | 'Démo planifiée' | 'Démo réalisée' | 'Client' | 'Perdu';

const ProspectTable = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<LeadStatus | 'All'>('All');
    const [countryFilter, setCountryFilter] = useState<string>('All');
    const [priorityFilter, setPriorityFilter] = useState<'All' | 'Prioritaire' | 'Moyen' | 'Faible'>('All');

    // Discovery Mode State
    const [discoverySearchTerm, setDiscoverySearchTerm] = useState('');
    const [discoveryResults, setDiscoveryResults] = useState<any[]>([]);
    const [discoveryCountryFilter, setDiscoveryCountryFilter] = useState<string>('All');
    const [discoveryTypeFilter, setDiscoveryTypeFilter] = useState<string>('All');
    const [isSearching, setIsSearching] = useState(false);
    const [searchCountry, setSearchCountry] = useState<string>('All');
    const [selectedProspect, setSelectedProspect] = useState<any>(null); // For Preview Modal
    const [contactEmail, setContactEmail] = useState('');
    const [isManualAdd, setIsManualAdd] = useState(false);
    const [scrapingEmail, setScrapingEmail] = useState(false);
    const [shouldSendEmail, setShouldSendEmail] = useState(true);
    const [scrapeError, setScrapeError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [discoveryEmails, setDiscoveryEmails] = useState<Record<string, string>>({});
    const [discoveryContactNames, setDiscoveryContactNames] = useState<Record<string, string>>({});
    const [discoveryLoadingEmails, setDiscoveryLoadingEmails] = useState<Record<string, boolean>>({});

    const [prospects, setProspects] = useState<IProspect[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');
    const [availableUsers, setAvailableUsers] = useState<UserData[]>([]);

    // Pagination/Metadata state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 10;
    const [allCountries, setAllCountries] = useState<string[]>(['All']);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
        'Nouveau': 0, 'Contacté': 0, 'Répondu': 0, 'Intéressé': 0,
        'Démo planifiée': 0, 'Démo réalisée': 0, 'Client': 0, 'Perdu': 0
    });

    // Quick Edit Modal State
    const [editingProspectId, setEditingProspectId] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState({
        country: '',
        school_type: '' as 'Private' | 'Public',
        contact_role: '',
        status: '',
        interaction_email_sent: false,
        interaction_response_received: false,
        assigned_to_id: null as number | null,
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Reset to first page when filters change
        setCurrentPage(1);
    }, [searchTerm, statusFilter, countryFilter, priorityFilter]);

    useEffect(() => {
        // Debounce search term
        const handler = setTimeout(() => {
            fetchProspects();
        }, 300);

        return () => clearTimeout(handler);
    }, [searchTerm, statusFilter, countryFilter, priorityFilter, currentPage]);

    useEffect(() => {
        fetchMetadata();
        if (user?.role === 'admin') {
            fetchUsers();
        }
    }, [user]);

    const fetchUsers = async () => {
        try {
            const res = await adminService.getUsers();
            if (res.success && res.users) {
                setAvailableUsers(res.users);
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    };

    const fetchMetadata = async () => {
        try {
            // Fetch a bigger batch just once to get unique countries
            const response = await prospectService.getProspects({ per_page: 500 });
            if (response.success && response.prospects) {
                const countries = new Set(response.prospects.map((p: any) => p.country).filter(Boolean));
                setAllCountries(['All', ...Array.from(countries).sort() as string[]]);
            }
        } catch (err) {
            console.error('Failed to pre-fetch countries', err);
        }
    };

    const fetchProspects = async () => {
        if (!loading) setIsFetching(true);
        else setLoading(true);

        try {
            const response = await prospectService.getProspects({
                per_page: itemsPerPage,
                page: currentPage,
                userId: user?.id,
                role: user?.role,
                search: searchTerm || undefined,
                status: statusFilter === 'All' ? undefined : statusFilter,
                country: countryFilter === 'All' ? undefined : countryFilter,
                priority: priorityFilter === 'All' ? undefined : priorityFilter
            });
            if (response.success && response.prospects) {
                setProspects(response.prospects as unknown as IProspect[]);
                setTotalPages(response.pages || 1);
                setTotalItems(response.total || response.prospects.length);
                if (response.status_counts) {
                    setStatusCounts(response.status_counts as Record<string, number>);
                }
            } else {
                setError('Failed to load prospects');
            }
        } catch (err) {
            setError('Error connecting to server');
        } finally {
            setLoading(false);
            setIsFetching(false);
        }
    };

    const handleDiscoverySearch = async (term: string, country?: string) => {
        if (!term.trim()) {
            setDiscoveryResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const response = await prospectService.searchExternalUniversities(term, country || searchCountry);
            if (response.success && response.data) {
                setDiscoveryResults(response.data);

                // Trigger auto-scraping for each result with a website
                response.data.forEach((result: any) => {
                    if (result.website && !discoveryEmails[result.website]) {
                        autoScrapeContactInfo(result.website);
                    }
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const autoScrapeContactInfo = async (website: string) => {
        if (discoveryLoadingEmails[website]) return;

        setDiscoveryLoadingEmails(prev => ({ ...prev, [website]: true }));
        try {
            const result = await prospectService.findUniversityEmail(website);
            if (result && result.success) {
                if (result.email) {
                    setDiscoveryEmails(prev => ({ ...prev, [website]: result.email }));
                }
                if (result.contact_name) {
                    setDiscoveryContactNames(prev => ({ ...prev, [website]: result.contact_name }));
                }
            }
        } catch (err) {
            console.error(`Failed to auto-scrape info for ${website}:`, err);
        } finally {
            setDiscoveryLoadingEmails(prev => ({ ...prev, [website]: false }));
        }
    };

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (discoverySearchTerm) {
                handleDiscoverySearch(discoverySearchTerm, searchCountry);
                // Reset filters when new search is performed
                setDiscoveryCountryFilter('All');
                setDiscoveryTypeFilter('All');
            } else {
                setDiscoveryResults([]);
            }
        }, 500); // 500ms delay

        return () => clearTimeout(timer);
    }, [discoverySearchTerm, searchCountry]);

    // Filter university discovery results
    const filteredDiscoveryResults = useMemo(() => {
        return discoveryResults.filter(result => {
            // Check if already in prospects list
            const isAlreadyAdded = prospects.some(p =>
                p.school_name.toLowerCase() === result.school_name.toLowerCase()
            );
            if (isAlreadyAdded) return false;

            const matchesCountry = discoveryCountryFilter === 'All' || result.country === discoveryCountryFilter;
            const matchesType = discoveryTypeFilter === 'All' || result.school_type === discoveryTypeFilter;
            return matchesCountry && matchesType;
        });
    }, [discoveryResults, discoveryCountryFilter, discoveryTypeFilter, prospects]);

    // Extract unique countries from discovery results
    const discoveryCountries = useMemo(() => {
        const countries = new Set(discoveryResults.map(r => r.country).filter(Boolean));
        return ['All', ...Array.from(countries).sort()];
    }, [discoveryResults]);

    const handleOpenPreview = async (schoolData: any) => {
        setIsManualAdd(false);
        setSelectedProspect(schoolData);

        // Use pre-scraped email from discovery if available
        if (schoolData.email) {
            setContactEmail(schoolData.email);
            return;
        }

        setContactEmail('');
        // Scrape real email from website using BeautifulSoup
        if (schoolData.website) {
            setScrapingEmail(true);
            setScrapeError(null);
            try {
                const result = await prospectService.findUniversityEmail(schoolData.website);
                if (result && result.success) {
                    if (result.email) {
                        setContactEmail(result.email);
                        setDiscoveryEmails(prev => ({ ...prev, [schoolData.website]: result.email }));
                    }
                    if (result.contact_name) {
                        setSelectedProspect((prev: any) => ({ ...prev, contact_name: result.contact_name }));
                        setDiscoveryContactNames(prev => ({ ...prev, [schoolData.website]: result.contact_name }));
                    }
                } else {
                    setScrapeError(result.message || 'No direct contact info found on website.');
                }
            } catch (err: any) {
                console.error('Email scraping failed:', err);
                setScrapeError('Website unreachable or took too long to search.');
            } finally {
                setScrapingEmail(false);
            }
        }
    };

    const handleManualAdd = () => {
        setIsManualAdd(true);
        setSelectedProspect({
            school_name: '',
            country: 'France',
            website: '',
            school_type: 'Public',
            contact_role: 'Admissions',
            student_count: 5000
        });
        setContactEmail('');
    };


    const handleConfirmAdd = async () => {
        if (!selectedProspect) return;

        setCreateLoading(true);
        setCreateError('');

        // Add email and interaction status to prospect data
        const prospectData = {
            ...selectedProspect,
            email: contactEmail,
            assigned_to_id: user?.id,
            interaction_email_sent: shouldSendEmail && !!contactEmail
        };

        try {
            const response = await prospectService.createProspect(prospectData);
            if (response.success && response.prospect) {
                // Keep existing prospects and add the new one at the top
                setProspects(prev => [response.prospect as unknown as IProspect, ...prev]);
                setDiscoveryResults([]); // Clear search results
                setDiscoverySearchTerm('');
                setSelectedProspect(null);

                // Auto-send welcome email if we have an email and toggle is on
                if (shouldSendEmail && contactEmail) {
                    prospectService.sendWelcomeEmail(
                        contactEmail,
                        prospectData.school_name,
                        prospectData.contact_name || 'Admissions Team'
                    ).then(emailResult => {
                        if (emailResult.success) {
                            console.log('✅ Welcome email sent to', contactEmail);
                        } else {
                            setEmailError(emailResult.message || 'Failed to send automated welcome email. Check SMTP settings.');
                        }
                    });
                }
            } else {
                setCreateError(response.message || 'Failed to create prospect');
            }
        } catch (err: any) {
            console.error('Failed to add prospect', err);
            setCreateError(err.message || 'Failed to add prospect');
        } finally {
            setCreateLoading(false);
        }
    };

    // Quick Edit Modal Functions
    const openEditModal = (prospect: any) => {
        setEditingProspectId(prospect.id);
        setEditFormData({
            country: prospect.country || '',
            school_type: prospect.school_type || '',
            contact_role: prospect.contact_role || '',
            status: prospect.status || '',
            interaction_email_sent: prospect.interaction_email_sent || false,
            interaction_response_received: prospect.interaction_response_received || false,
            assigned_to_id: prospect.assigned_to_id || null,
        });
    };

    const closeEditModal = () => {
        setEditingProspectId(null);
        setEditFormData({
            country: '',
            school_type: 'Private' as 'Private' | 'Public',
            contact_role: '',
            status: '',
            interaction_email_sent: false,
            interaction_response_received: false,
            assigned_to_id: null,
        });
    };

    const handleSaveEdit = async () => {
        if (!editingProspectId) return;

        try {
            setIsSaving(true);

            // First get the prospect to get full details
            const prospect = prospects.find(p => p.id === editingProspectId);
            if (!prospect) return;

            // Update prospect data
            const updateResponse = await prospectService.updateProspect(editingProspectId, editFormData);

            if (updateResponse.success) {
                // Recalculate score based on updated data
                try {
                    const qualifyResponse = await prospectService.qualifyProspect(editingProspectId, {
                        country: editFormData.country,
                        school_type: editFormData.school_type,
                        contact_role: editFormData.contact_role,
                        status: editFormData.status,
                        interaction_email_sent: editFormData.interaction_email_sent,
                        interaction_response_received: editFormData.interaction_response_received,
                        assigned_to_id: editFormData.assigned_to_id,
                    });

                    // Update the prospects list with edited data and new score
                    setProspects(prev => prev.map(p =>
                        p.id === editingProspectId
                            ? {
                                ...p,
                                ...editFormData,
                                score: qualifyResponse.score || p.score,
                                priority: qualifyResponse.priority || p.priority,
                            }
                            : p
                    ));
                } catch (scoreErr) {
                    // If score calculation fails, still update the prospect data
                    console.error('Failed to recalculate score', scoreErr);
                    setProspects(prev => prev.map(p =>
                        p.id === editingProspectId
                            ? { ...p, ...editFormData }
                            : p
                    ));
                }
                closeEditModal();
            }
        } catch (err) {
            console.error('Failed to save prospect', err);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    // Use pre-fetched unique countries
    const uniqueCountries = allCountries;

    // Filter Logic - Entirely server side now
    const filteredData = prospects;
    const paginatedData = prospects;

    // Status Counts for UI - Now managed by state from API

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Nouveau': return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'Contacté': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'Répondu': return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
            case 'Intéressé': return 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
            case 'Démo planifiée': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
            case 'Démo réalisée': return 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400';
            case 'Client': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'Perdu': return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const exportProspectsToCSV = () => {
        try {
            if (!prospects || prospects.length === 0) {
                alert('No prospects to export');
                return;
            }

            // Filter prospects based on current filters
            const filteredProspects = prospects.filter(prospect => {
                if (!prospect) return false;

                const matchesSearch = !searchTerm ||
                    String(prospect.school_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    String(prospect.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase());

                const matchesStatus = statusFilter === 'All' || prospect.status === statusFilter;
                const matchesCountry = countryFilter === 'All' || prospect.country === countryFilter;
                const matchesPriority = priorityFilter === 'All' || prospect.priority === priorityFilter;

                return matchesSearch && matchesStatus && matchesCountry && matchesPriority;
            });

            if (filteredProspects.length === 0) {
                alert('No prospects match your filters');
                return;
            }

            // Define CSV headers
            const headers = ['School Name', 'Country', 'Contact Name', 'Role', 'Email', 'Status', 'Priority', 'Score', 'Notes'];

            // Convert prospects to CSV rows - ensure all values are strings
            const csvRows = [headers.join(',')];

            for (const p of filteredProspects) {
                const cells = [
                    String(p.school_name || '').replace(/"/g, '""'),
                    String(p.country || '').replace(/"/g, '""'),
                    String(p.contact_name || '').replace(/"/g, '""'),
                    String(p.contact_role || '').replace(/"/g, '""'),
                    String(p.email || '').replace(/"/g, '""'),
                    String(p.status || '').replace(/"/g, '""'),
                    String(p.priority || '').replace(/"/g, '""'),
                    String(p.score !== null && p.score !== undefined ? p.score : '').replace(/"/g, '""'),
                    String(p.notes || '').replace(/"/g, '""')
                ];

                // Format each cell for CSV (quote if contains comma, quote, or newline)
                const csvRow = cells.map(cell => {
                    const cellStr = String(cell);
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                        return `"${cellStr}"`;
                    }
                    return cellStr;
                }).join(',');

                csvRows.push(csvRow);
            }

            const csvContent = csvRows.join('\n');

            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `prospects_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export prospects. Check console for details.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark overflow-hidden">
            {/* Header */}
            <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Prospects Management</h2>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8">

                {/* Page Title & Action */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-1 text-slate-900 dark:text-white">Prospects</h1>
                        <p className="text-slate-500 dark:text-slate-400">Manage and track your international school pipeline.</p>
                    </div>
                    {user?.role !== 'admin' && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/import')}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-sm shadow-emerald-500/20 whitespace-nowrap"
                            >
                                <Upload size={20} />
                                Import CSV
                            </button>
                        </div>
                    )}
                </div>

                {/* Search Universities - hidden for admin */}
                {user?.role !== 'admin' && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
                        <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Find Universities</h3>
                        <div className="flex gap-3 mb-4 flex-col md:flex-row items-stretch">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search for universities by name..."
                                    value={discoverySearchTerm}
                                    onChange={(e) => setDiscoverySearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 text-sm"
                                />
                            </div>
                            <select
                                value={searchCountry}
                                onChange={(e) => setSearchCountry(e.target.value)}
                                className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary/50 min-w-[180px]"
                            >
                                <option value="All">🌍 All Countries</option>
                                <option value="Canada">🇨🇦 Canada</option>
                                <option value="United Arab Emirates">🇦🇪 UAE</option>
                                <option value="France">🇫🇷 France</option>
                                <option value="United Kingdom">🇬🇧 United Kingdom</option>
                                <option value="United States">🇺🇸 United States</option>
                                <option value="Germany">🇩🇪 Germany</option>
                                <option value="Australia">🇦🇺 Australia</option>
                                <option value="India">🇮🇳 India</option>
                                <option value="China">🇨🇳 China</option>
                                <option value="Brazil">🇧🇷 Brazil</option>
                                <option value="Switzerland">🇨🇭 Switzerland</option>
                                <option value="Belgium">🇧🇪 Belgium</option>
                                <option value="Ghana">🇬🇭 Ghana</option>
                                <option value="South Africa">🇿🇦 South Africa</option>
                                <option value="Nigeria">🇳🇬 Nigeria</option>
                                <option value="Morocco">🇲🇦 Morocco</option>
                                <option value="Tunisia">🇹🇳 Tunisia</option>
                                <option value="Senegal">🇸🇳 Senegal</option>
                            </select>
                            <button
                                onClick={handleManualAdd}
                                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white px-5 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-colors flex-1 md:flex-none"
                            >
                                Or Add Manually
                            </button>
                        </div>

                        {/* University Filters */}
                        {discoveryResults.length > 0 && (
                            <div className="flex gap-2 mb-4 flex-wrap">
                                {/* Country Filter */}
                                <div className="relative group">
                                    <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <Globe size={16} />
                                        Country: {discoveryCountryFilter}
                                    </button>
                                    <div className="absolute left-0 top-full pt-2 w-48 hidden group-hover:block z-20">
                                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-60 overflow-y-auto">
                                            {discoveryCountries.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setDiscoveryCountryFilter(c)}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${discoveryCountryFilter === c ? 'bg-slate-50 dark:bg-slate-700 font-medium text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* School Type Filter */}
                                <div className="relative group">
                                    <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <Filter size={16} />
                                        Type: {discoveryTypeFilter}
                                    </button>
                                    <div className="absolute left-0 top-full pt-2 w-48 hidden group-hover:block z-20">
                                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            {['All', 'Public', 'Private'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setDiscoveryTypeFilter(t)}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${discoveryTypeFilter === t ? 'bg-slate-50 dark:bg-slate-700 font-medium text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                                >
                                                    {t === 'All' ? 'All Types' : t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isSearching && (
                            <div className="text-center py-4 text-slate-500">Searching...</div>
                        )}
                        {filteredDiscoveryResults.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {filteredDiscoveryResults.map((result, idx) => (
                                    <div key={idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:border-primary/50 transition-colors flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">{result.school_name}</h4>
                                            <div className="mb-2">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{result.country} • {result.school_type}</p>
                                            </div>

                                            {/* Auto-scraped Email & Phone Display */}
                                            <div className="mt-2 space-y-1">
                                                <div className="text-[11px] flex items-center gap-1.5 h-5">
                                                    {discoveryLoadingEmails[result.website] ? (
                                                        <div className="flex items-center gap-1.5 text-blue-500 animate-pulse">
                                                            <div className="size-2 bg-blue-500 rounded-full animate-bounce"></div>
                                                            <span>Searching contact...</span>
                                                        </div>
                                                    ) : discoveryEmails[result.website] ? (
                                                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium overflow-hidden">
                                                            <div className="size-2 bg-emerald-500 rounded-full"></div>
                                                            <span className="truncate">
                                                                {discoveryContactNames[result.website] && (
                                                                    <span className="text-slate-900 dark:text-white mr-1.5 font-bold">
                                                                        {discoveryContactNames[result.website]}:
                                                                    </span>
                                                                )}
                                                                {discoveryEmails[result.website]}
                                                            </span>
                                                        </div>
                                                    ) : result.website ? (
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <div className="size-2 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                                                            <span>No contact found</span>
                                                        </div>
                                                    ) : null}
                                                </div>

                                                {/* website link here */}
                                                {result.website && (
                                                    <div className="text-[11px] flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                        <Globe size={12} className="text-slate-400" />
                                                        <a
                                                            href={result.website.startsWith('http') ? result.website : `https://${result.website}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline truncate"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {result.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                                            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-medium">
                                                ~{result.student_count} seats
                                            </span>
                                            <button
                                                onClick={() => {
                                                    const finalData = { ...result };
                                                    if (discoveryEmails[result.website]) {
                                                        finalData.email = discoveryEmails[result.website];
                                                    }
                                                    if (discoveryContactNames[result.website]) {
                                                        finalData.contact_name = discoveryContactNames[result.website];
                                                    }
                                                    handleOpenPreview(finalData);
                                                }}
                                                className="p-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                                                title="Preview & Add"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {discoveryResults.length === 0 && discoverySearchTerm && !isSearching && (
                            <div className="text-center py-4 text-slate-500">No results found.</div>
                        )}
                        {filteredDiscoveryResults.length === 0 && discoveryResults.length > 0 && (
                            <div className="text-center py-4 text-slate-500">No universities match the selected filters.</div>
                        )}
                    </div>
                )}

                {/* Status Counters */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {Object.entries(statusCounts).map(([status, count]) => (
                        <div key={status} className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center shrink-0 flex-1 min-w-[120px] shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-4xl font-bold text-slate-900 dark:text-white">{count}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">{status}</p>
                        </div>
                    ))}
                </div>

                {/* Filters Bar - Moved outside to prevent overflow clipping */}
                <div className="mb-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">

                    <div className="flex flex-1 min-w-[300px] max-w-md relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or country..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary/50 text-sm transition-all text-slate-900 dark:text-white placeholder-slate-400"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Country Filter */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <Globe size={18} />
                                Country: {countryFilter}
                            </button>
                            <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-20">
                                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-60 overflow-y-auto">
                                    {uniqueCountries.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setCountryFilter(c)}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${countryFilter === c ? 'bg-slate-50 dark:bg-slate-700 font-medium text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Priority Filter */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <ClipboardList size={18} />
                                Priority: {priorityFilter}
                            </button>
                            <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-20">
                                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    {['All', 'Prioritaire', 'Moyen', 'Faible'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPriorityFilter(p as any)}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${priorityFilter === p ? 'bg-slate-50 dark:bg-slate-700 font-medium text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <Filter size={18} />
                                Status: {statusFilter}
                            </button>
                            <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-20">
                                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    {['All', 'Nouveau', 'Contacté', 'Répondu', 'Intéressé', 'Démo planifiée', 'Démo réalisée', 'Client', 'Perdu'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setStatusFilter(s as any)}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${statusFilter === s ? 'bg-slate-50 dark:bg-slate-700 font-medium text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <button
                            onClick={exportProspectsToCSV}
                            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Export prospects as CSV"
                        >
                            <Download size={20} />
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    {/* Data Table */}
                    <div className="overflow-x-auto relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 text-center text-red-500 bg-red-50 dark:bg-red-900/20 m-4 rounded-lg">
                                {error}
                            </div>
                        )}

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">School Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Country</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                <AnimatePresence>
                                    {paginatedData.map((prospect, index) => (
                                        <motion.tr
                                            key={prospect.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => navigate(`/prospects/${prospect.id}`)}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-9 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-700 dark:text-purple-400 font-bold text-xs">
                                                        {getInitials(prospect.school_name)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{prospect.school_name}</span>
                                                        {prospect.website && (
                                                            <a
                                                                href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[10px] text-primary hover:underline mt-1 w-fit"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {prospect.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{prospect.email || '—'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${(prospect.school_type || '').toLowerCase() === 'private' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20'}`}>
                                                    {prospect.school_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(prospect.status || 'Nouveau')}`}>
                                                    {prospect.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold ${(prospect.score || 0) > 60 ? 'text-red-600' :
                                                        (prospect.score || 0) > 30 ? 'text-amber-600' : 'text-emerald-600'
                                                        }`}>
                                                        {prospect.score || 0}
                                                    </span>
                                                    {(prospect.priority) && (
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-200 px-1 rounded">
                                                            {prospect.priority}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-900 dark:text-white">{prospect.country}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Only commercial users can edit/qualify */}
                                                    {user?.role === 'commercial' && (
                                                        <>
                                                            {prospect.score && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openEditModal(prospect);
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors"
                                                                    title="Quick Edit"
                                                                >
                                                                    <Edit size={18} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditModal(prospect);
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                                                                title="Quick Edit / Qualify"
                                                            >
                                                                <ClipboardList size={20} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>

                        {!loading && !error && filteredData.length === 0 && (
                            <div className="p-12 text-center">
                                <div className="bg-slate-50 dark:bg-slate-800 size-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700">
                                    <UserPlus className="text-slate-400" size={32} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    {user?.role === 'admin' ? 'No prospects found' : 'No prospects yet'}
                                </h4>
                                {user?.role !== 'admin' ? (
                                    <>
                                        <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">
                                            Start by searching for a university above or adding one manually.
                                        </p>
                                        <button
                                            onClick={handleManualAdd}
                                            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors"
                                        >
                                            <Plus size={18} />
                                            Add Your First Prospect
                                        </button>
                                    </>
                                ) : (
                                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                                        Wait for commercial users to add prospects or import a CSV.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            {isFetching && <div className="size-2 bg-primary rounded-full animate-pulse" title="Refreshing data..." />}
                            Showing <span className="font-semibold text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-semibold text-slate-900 dark:text-white">{totalItems}</span> prospects
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${currentPage === i + 1
                                        ? 'bg-primary text-white'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
            {/* Preview Modal */}
            <AnimatePresence>
                {selectedProspect && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm shadow-2xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col"
                        >
                            <div className="p-6 overflow-y-auto flex-1">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                    {isManualAdd ? 'Add University Manually' : 'Preview University'}
                                </h3>

                                {createError && (
                                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                                        {createError}
                                    </div>
                                )}

                                <div className="space-y-4 mb-6">
                                    {isManualAdd ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">School Name</label>
                                                <input
                                                    type="text"
                                                    value={selectedProspect.school_name}
                                                    onChange={(e) => setSelectedProspect({ ...selectedProspect, school_name: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                                                    placeholder="University Name"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Country</label>
                                                    <input
                                                        type="text"
                                                        value={selectedProspect.country}
                                                        onChange={(e) => setSelectedProspect({ ...selectedProspect, country: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                                                        placeholder="Country"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Type</label>
                                                    <select
                                                        value={selectedProspect.school_type}
                                                        onChange={(e) => setSelectedProspect({ ...selectedProspect, school_type: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                                                    >
                                                        <option value="Private">Private</option>
                                                        <option value="Public">Public</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Website</label>
                                                <input
                                                    type="text"
                                                    value={selectedProspect.website}
                                                    onChange={(e) => setSelectedProspect({ ...selectedProspect, website: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                                                    placeholder="www.example.com"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">School</label>
                                                    <p className="text-sm text-slate-900 dark:text-white font-bold truncate">{selectedProspect.school_name}</p>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Country</label>
                                                    <p className="text-sm text-slate-900 dark:text-white font-medium truncate">{selectedProspect.country}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website</label>
                                                    {selectedProspect.website ? (
                                                        <a
                                                            href={selectedProspect.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-primary font-medium truncate hover:underline block"
                                                        >
                                                            {selectedProspect.website}
                                                        </a>
                                                    ) : (
                                                        <p className="text-xs text-slate-500 italic">N/A</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-4">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contact Details</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                                    Contact Email <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="email"
                                                        placeholder={scrapingEmail ? 'Searching...' : 'email@univ.edu'}
                                                        value={contactEmail}
                                                        onChange={(e) => setContactEmail(e.target.value)}
                                                        className={`w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-primary/50 ${scrapingEmail ? 'pr-8' : ''}`}
                                                    />
                                                    {scrapingEmail && (
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                    <p className={`text-xs mt-1 ${scrapeError ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                                        {scrapingEmail ? (
                                            <span className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-help" title="Searching deeper into the university website for direct contact lines...">
                                                <span className="animate-pulse">🔍 Searching footer & contact pages...</span>
                                            </span>
                                        ) : scrapeError ? (
                                            <span>⚠️ {scrapeError}</span>
                                        ) : (
                                            'Required to send the automatic welcome email.'
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <input
                                        type="checkbox"
                                        id="sendEmail"
                                        checked={shouldSendEmail}
                                        onChange={(e) => setShouldSendEmail(e.target.checked)}
                                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary focus:ring-offset-0"
                                    />
                                    <label htmlFor="sendEmail" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                        Send Automatic Welcome Email
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                                <button
                                    onClick={() => setSelectedProspect(null)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmAdd}
                                    disabled={!contactEmail || !selectedProspect?.school_name || !selectedProspect?.country || createLoading}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                >
                                    {createLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={18} />
                                            Confirm & Add
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Quick Edit Modal */}
            <AnimatePresence>
                {
                    editingProspectId && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
                            onClick={closeEditModal}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Edit</h3>
                                    <button
                                        onClick={closeEditModal}
                                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">


                                    {/* School Type */}
                                    <div className="space-y-4">
                                        {/* Country */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wide">
                                                Country <span className="text-[10px] font-normal opacity-50 ml-1">(Read-only)</span>
                                            </label>
                                            <div className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-sm font-medium">
                                                {editFormData.country || '—'}
                                            </div>
                                        </div>

                                        {/* School Type */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                School Type
                                            </label>
                                            <select
                                                value={editFormData.school_type}
                                                onChange={(e) => setEditFormData({ ...editFormData, school_type: e.target.value as 'Public' | 'Private' })}
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                                            >
                                                <option value="">Select Type</option>
                                                <option value="Private">Private</option>
                                                <option value="Public">Public</option>
                                            </select>
                                        </div>

                                        {/* Contact Role */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                Contact Role
                                            </label>
                                            <select
                                                value={editFormData.contact_role}
                                                onChange={(e) => setEditFormData({ ...editFormData, contact_role: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                                            >
                                                <option value="">Select Role</option>
                                                <option value="Director">Director</option>
                                                <option value="Principal">Principal</option>
                                                <option value="Head of School">Head of School</option>
                                                <option value="Teacher">Teacher</option>
                                                <option value="Secretary">Secretary</option>
                                                <option value="IT Admin">IT Admin</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                Status
                                            </label>
                                            <select
                                                value={editFormData.status}
                                                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                                            >
                                                <option value="">Select Status</option>
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

                                        {/* Assigned To - Admin Only */}
                                        {user?.role === 'admin' && (
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                    Assign To
                                                </label>
                                                <select
                                                    value={editFormData.assigned_to_id || ''}
                                                    onChange={(e) => setEditFormData({
                                                        ...editFormData,
                                                        assigned_to_id: e.target.value ? Number(e.target.value) : null
                                                    })}
                                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                                                >
                                                    <option value="">Unassigned</option>
                                                    {availableUsers.map(u => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.username} ({u.role})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Interactions */}
                                        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                                Interactions
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editFormData.interaction_email_sent}
                                                    onChange={(e) => setEditFormData({ ...editFormData, interaction_email_sent: e.target.checked })}
                                                    className="w-4 h-4 rounded border-slate-300"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">Email Sent</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editFormData.interaction_response_received}
                                                    onChange={(e) => setEditFormData({ ...editFormData, interaction_response_received: e.target.checked })}
                                                    className="w-4 h-4 rounded border-slate-300"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">Response Received</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={closeEditModal}
                                            disabled={isSaving}
                                            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={isSaving}
                                            className="flex-1 px-4 py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                                        >
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Email Error Toast */}
            <AnimatePresence>
                {
                    emailError && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-6 right-6 z-[100] max-w-md w-full"
                        >
                            <div className="bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <X className="w-5 h-5" />
                                    </div>
                                    <p className="font-medium text-sm">{emailError}</p>
                                </div>
                                <button
                                    onClick={() => setEmailError(null)}
                                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
};

export default ProspectTable;
