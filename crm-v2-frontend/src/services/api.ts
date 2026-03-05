/**
 * API Service - Uses Supabase JS Client for all database operations
 * No Flask backend required - all operations go through Supabase REST API
 */

import { supabase } from '../supabase';
import universityData from '../data/world_universities_and_domains.json';
import { calculateScore } from '../utils/scoring';

const API_URL = '/api';
const INTERNAL_API_KEY = 'dev-secret-key-change-in-production';

// ==================== TYPES ====================

export interface IProspect {
  id?: number;
  school_name: string;
  country: string;
  school_type: 'Public' | 'Private';
  contact_name?: string;
  contact_role: string;
  contact_phone?: string;
  email?: string;
  status?: string;
  score?: number;
  priority?: string;
  website?: string;
  student_count?: number;
  notes?: string;
  interaction_email_sent?: boolean;
  interaction_response_received?: boolean;
  assigned_to_id?: number | null;
  created_at?: string;
  updated_at?: string;
  last_interaction?: string;
}

export interface IInteraction {
  id?: number;
  prospect_id: number;
  interaction_type: string;
  description?: string;
  result?: string;
  created_by_id?: number;
  created_at?: string;
}

export interface EmailConfig {
  mail_server: string;
  mail_port: number;
  mail_use_tls: boolean;
  mail_username: string;
  mail_default_sender: string;
  is_configured: boolean;
}

interface AppUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

// Simple hash function for password verification (client-side)
// In production, use Supabase Auth instead
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==================== AUTH SERVICE ====================

export const authService = {
  /**
   * Login user with email and password
   * Uses app-level users table (not Supabase Auth)
   */
  async login(email: string, password: string, _rememberMe: boolean = false) {
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', passwordHash)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      // Also try with raw password comparison for seeded users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (userError || !userData) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Check if password hash matches (for bcrypt-hashed passwords from seed)
      // Since we can't verify bcrypt client-side easily, we use SHA-256 for new users
      // For the seeded admin, allow login with the known password
      if (userData.username === 'admin' && password === 'admin123') {
        const user: AppUser = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          is_active: userData.is_active,
          created_at: userData.created_at,
        };
        localStorage.setItem('crm_user', JSON.stringify(user));
        return { success: true, user };
      }

      return { success: false, message: 'Invalid email or password' };
    }

    const user: AppUser = {
      id: data.id,
      username: data.username,
      email: data.email,
      role: data.role,
      is_active: data.is_active,
      created_at: data.created_at,
    };

    // Store user in localStorage for session persistence
    localStorage.setItem('crm_user', JSON.stringify(user));
    return { success: true, user };
  },

  /**
   * Register new user
   */
  async register(username: string, email: string, password: string) {
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        role: 'commercial',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate')) {
        return { success: false, message: 'Username or email already exists' };
      }
      return { success: false, message: error.message };
    }

    const user: AppUser = {
      id: data.id,
      username: data.username,
      email: data.email,
      role: data.role,
      is_active: data.is_active,
      created_at: data.created_at,
    };

    localStorage.setItem('crm_user', JSON.stringify(user));
    return { success: true, user };
  },

  /**
   * Logout user
   */
  async logout() {
    localStorage.removeItem('crm_user');
    return { success: true };
  },

  /**
   * Get current logged-in user from localStorage
   */
  async getCurrentUser() {
    const stored = localStorage.getItem('crm_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        return { success: true, user };
      } catch {
        localStorage.removeItem('crm_user');
      }
    }
    return { success: false, message: 'Not authenticated' };
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string) {
    const stored = localStorage.getItem('crm_user');
    if (!stored) return { success: false, message: 'Not authenticated' };

    const user = JSON.parse(stored);
    const currentHash = await hashPassword(currentPassword);
    const newHash = await hashPassword(newPassword);

    // Verify current password
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .eq('password_hash', currentHash)
      .single();

    if (!data) {
      return { success: false, message: 'Current password is incorrect' };
    }

    // Update password
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', user.id);

    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Password changed successfully' };
  },

  /**
   * Create user (admin only)
   */
  async createUser(username: string, email: string, password: string, role: string) {
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        role,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, user: data };
  },
};

// ==================== PROSPECT SERVICE ====================

export const prospectService = {
  /**
   * Get all prospects with optional filters
   */
  async getProspects(
    filters?: {
      country?: string;
      status?: string;
      priority?: string;
      search?: string;
      page?: number;
      per_page?: number;
      userId?: number;
      role?: string;
    }
  ) {
    let query = supabase
      .from('prospects')
      .select('*, users!prospects_assigned_to_id_fkey(username)', { count: 'exact' });

    // Data isolation: If role is commercial, show ONLY assigned prospects
    if (filters?.role === 'commercial' && filters?.userId) {
      query = query.eq('assigned_to_id', filters.userId);
    }

    if (filters?.country) {
      query = query.eq('country', filters.country);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.search) {
      query = query.or(
        `school_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }

    // Pagination
    const page = filters?.page || 1;
    const perPage = filters?.per_page || 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    // For status counts, we need a separate query that doesn't have the status filter
    // but has all other filters
    let countQuery = supabase.from('prospects').select('status');
    if (filters?.role === 'commercial' && filters?.userId) {
      countQuery = countQuery.eq('assigned_to_id', filters.userId);
    }
    if (filters?.country) {
      countQuery = countQuery.eq('country', filters.country);
    }
    if (filters?.priority) {
      countQuery = countQuery.eq('priority', filters.priority);
    }
    if (filters?.search) {
      countQuery = countQuery.or(
        `school_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }

    const { data: countData } = await countQuery;
    const status_counts: Record<string, number> = {
      'Nouveau': 0, 'Contacté': 0, 'Répondu': 0, 'Intéressé': 0,
      'Démo planifiée': 0, 'Démo réalisée': 0, 'Client': 0, 'Perdu': 0
    };
    (countData || []).forEach((p: any) => {
      if (status_counts[p.status] !== undefined) status_counts[p.status]++;
    });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Transform data to match expected format
    const prospects = (data || []).map((p: any) => ({
      ...p,
      assigned_to: p.users?.username || null,
    }));

    return {
      success: true,
      prospects,
      total: count || 0,
      status_counts,
      page,
      per_page: perPage,
      pages: Math.ceil((count || 0) / perPage),
    };
  },

  /**
   * Get single prospect by ID
   */
  async getProspect(id: number) {
    const { data, error } = await supabase
      .from('prospects')
      .select('*, users!prospects_assigned_to_id_fkey(username)')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      prospect: {
        ...data,
        assigned_to: data.users?.username || null,
      },
    };
  },

  /**
   * Create new prospect
   */
  async createProspect(prospect: IProspect) {
    const { data, error } = await supabase
      .from('prospects')
      .insert({
        school_name: prospect.school_name,
        country: prospect.country,
        school_type: prospect.school_type || 'private',
        contact_name: prospect.contact_name || '',
        contact_role: prospect.contact_role || 'Admissions',
        contact_phone: prospect.contact_phone || '',
        email: prospect.email,
        status: prospect.status || 'Nouveau',
        ...(() => {
          const { score, priority } = calculateScore({ ...prospect, status: prospect.status || 'Nouveau' });
          return { score, priority };
        })(), // Use utility for initial score, exclude breakdown
        website: prospect.website || '',
        student_count: prospect.student_count || 5000,
        notes: prospect.notes || '',
        interaction_email_sent: prospect.interaction_email_sent || false,
        interaction_response_received: prospect.interaction_response_received || false,
        assigned_to_id: prospect.assigned_to_id || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, prospect: data, message: 'Prospect created successfully' };
  },

  /**
   * Update prospect
   */
  async updateProspect(id: number, prospect: Partial<IProspect>) {
    // If attributes affecting score are changed, recalculate score
    const scoringFields = ['country', 'school_type', 'contact_role', 'status', 'interaction_email_sent', 'interaction_response_received'];
    const shouldRecalculate = scoringFields.some(field => Object.prototype.hasOwnProperty.call(prospect, field));

    let updateData = { ...prospect };

    if (shouldRecalculate) {
      // We need the full prospect to calculate score correctly
      const { data: currentProspect } = await supabase
        .from('prospects')
        .select('*')
        .eq('id', id)
        .single();

      if (currentProspect) {
        const mergedProspect = { ...currentProspect, ...prospect };
        const { score, priority } = calculateScore(mergedProspect);
        updateData = { ...updateData, score, priority };
      }
    }

    // Update updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('prospects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Trigger status change notification if status was updated
    if (prospect.status) {
      this.notifyStatusChange(id, data, prospect.status);
    }

    return { success: true, prospect: data, message: 'Prospect updated successfully' };
  },

  /**
   * Internal helper to notify Flask of status changes (side-effect)
   */
  async notifyStatusChange(id: number, prospectData: any, newStatus: string) {
    try {
      // Fire and forget - don't block the UI
      fetch(`${API_URL}/prospects/${id}/status-notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': INTERNAL_API_KEY
        },
        body: JSON.stringify({ prospect_data: prospectData, new_status: newStatus }),
      }).catch(err => console.error('Status notification error:', err));
    } catch (err) {
      console.warn('Status notification could not be initiated:', err);
    }
  },

  /**
   * Delete prospect
   */
  async deleteProspect(id: number) {
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: 'Prospect deleted successfully' };
  },

  /**
   * Delete all prospects assigned to a specific user (Clean Dashboard)
   */
  async deleteMyProspects(userId: number) {
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('assigned_to_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: 'All assigned prospects deleted successfully' };
  },

  /**
   * Get summary statistics
   */
  async getStats(userId?: number, role?: string) {
    let query = supabase
      .from('prospects')
      .select('status, priority, score, country, assigned_to_id');

    if (role === 'commercial' && userId) {
      query = query.eq('assigned_to_id', userId);
    }

    const { data: prospects, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const total = prospects.length;
    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};

    prospects.forEach((p: any) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      priorityCounts[p.priority] = (priorityCounts[p.priority] || 0) + 1;
      countryCounts[p.country] = (countryCounts[p.country] || 0) + 1;
    });

    return {
      success: true,
      stats: {
        total,
        by_status: statusCounts,
        by_priority: priorityCounts,
        by_country: countryCounts,
        average_score: total > 0 ? Math.round(prospects.reduce((sum: number, p: any) => sum + (p.score || 0), 0) / total) : 0,
      },
    };
  },

  /**
   * Search for universities (client-side from a local JSON, or placeholder)
   */
  async searchExternalUniversities(query: string, country?: string) {
    try {
      if (!query || query.length < 2) return { success: true, data: [] };

      const lowerQuery = query.toLowerCase();

      // Filter local data
      let filtered = universityData as any[];

      // Pre-filter by country if provided
      if (country && country !== 'All') {
        filtered = filtered.filter((u: any) => u.country === country);
      }

      const results = filtered
        .filter((u: any) => u.name.toLowerCase().includes(lowerQuery))
        .slice(0, 20) // Limit to top 20 results for performance
        .map((u: any) => ({
          school_name: u.name,
          country: u.country,
          website: u.web_pages?.[0] || '',
          school_type: u.name.toLowerCase().includes('institute') || u.name.toLowerCase().includes('college') ? 'Private' : 'Public', // Simple heuristic
          student_count: Math.floor(Math.random() * 40000) + 5000, // Randomized student count for realism
          inferred_email: u.domains?.[0] ? `admissions@${u.domains[0]}` : ''
        }));

      return { success: true, data: results };
    } catch (error) {
      console.error('Error searching universities:', error);
      return { success: false, message: 'Failed to search universities', data: [] };
    }
  },

  /**
   * Scrape university email from website (backend)
   */
  async findUniversityEmail(url: string) {
    try {
      const response = await fetch(`${API_URL}/prospects/find-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      return data; // Returns { success, email, contact_name, all_emails_found, source }
    } catch (error) {
      console.error('Error finding contact info:', error);
      return { success: false };
    }
  },

  /**
   * Send welcome email to newly added prospect
   */
  async sendWelcomeEmail(email: string, schoolName: string, contactName?: string) {
    try {
      const response = await fetch(`${API_URL}/prospects/send-welcome-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': INTERNAL_API_KEY
        },
        body: JSON.stringify({ email, school_name: schoolName, contact_name: contactName || 'Admissions Team' }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false };
    }
  },

  /**
   * Import metadata from a LinkedIn URL (backend)
   */
  async importFromLinkedIn(url: string) {
    try {
      const response = await fetch(`${API_URL}/import/linkedin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error importing from LinkedIn:', error);
      return { success: false, message: 'Failed to import metadata' };
    }
  },

  /**
   * Qualify prospect with scoring system
   */
  async qualifyProspect(id: number, formData: {
    country: string;
    school_type: string;
    contact_role: string;
    status: string;
    interaction_email_sent: boolean;
    interaction_response_received: boolean;
    assigned_to_id?: number | null;
  }) {
    try {
      // Use the shared scoring utility
      const { score, priority, breakdown } = calculateScore(formData);

      // Update prospect in database
      const { data, error } = await supabase
        .from('prospects')
        .update({
          country: formData.country,
          school_type: formData.school_type,
          contact_role: formData.contact_role,
          status: formData.status,
          score,
          priority,
          interaction_email_sent: formData.interaction_email_sent,
          interaction_response_received: formData.interaction_response_received,
          assigned_to_id: formData.assigned_to_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Trigger status change notification (side-effect)
      this.notifyStatusChange(id, data, formData.status);

      return {
        success: true,
        prospect: data,
        score,
        priority,
        breakdown,
        message: `Score calculated: ${score} - Priority: ${priority}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to qualify prospect',
      };
    }
  },
};

// ==================== INTERACTION SERVICE ====================

export const interactionService = {
  /**
   * Get interactions for a prospect
   */
  async getInteractions(prospectId: number) {
    const { data, error } = await supabase
      .from('interactions')
      .select('*, users!interactions_created_by_id_fkey(username)')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const interactions = (data || []).map((i: any) => ({
      ...i,
      created_by: i.users?.username || 'Unknown',
    }));

    return { success: true, interactions };
  },

  /**
   * Create interaction for a prospect
   */
  async createInteraction(prospectId: number, interaction: Omit<IInteraction, 'id' | 'prospect_id'>) {
    const stored = localStorage.getItem('crm_user');
    const currentUser = stored ? JSON.parse(stored) : null;

    const { data, error } = await supabase
      .from('interactions')
      .insert({
        prospect_id: prospectId,
        interaction_type: interaction.interaction_type,
        description: interaction.description,
        result: interaction.result,
        created_by_id: currentUser?.id || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Update prospect's last_interaction timestamp
    await supabase
      .from('prospects')
      .update({ last_interaction: new Date().toISOString() })
      .eq('id', prospectId);

    return { success: true, interaction: data, message: 'Interaction created successfully' };
  },

  /**
   * Update interaction for a prospect
   */
  async updateInteraction(interactionId: number, updates: Partial<Omit<IInteraction, 'id' | 'prospect_id' | 'created_by_id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('interactions')
      .update({
        interaction_type: updates.interaction_type,
        description: updates.description,
        result: updates.result,
      })
      .eq('id', interactionId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, interaction: data, message: 'Interaction updated successfully' };
  },

  /**
   * Delete interaction
   */
  async deleteInteraction(interactionId: number) {
    const { error } = await supabase
      .from('interactions')
      .delete()
      .eq('id', interactionId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: 'Interaction deleted successfully' };
  },
};

// ==================== DASHBOARD SERVICE ====================

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  async getStats(userId?: number, role?: string) {
    let query = supabase
      .from('prospects')
      .select('id, status, priority, score, country, created_at, assigned_to_id');

    if (role === 'commercial' && userId) {
      query = query.eq('assigned_to_id', userId);
    }

    const { data: prospects, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const total = prospects?.length || 0;
    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};

    (prospects || []).forEach((p: any) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      priorityCounts[p.priority] = (priorityCounts[p.priority] || 0) + 1;
    });

    // Recent prospects (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentCount = (prospects || []).filter(
      (p: any) => new Date(p.created_at) > weekAgo
    ).length;

    return {
      success: true,
      stats: {
        total_prospects: total,
        new_this_week: recentCount,
        by_status: statusCounts,
        by_priority: priorityCounts,
        average_score: total > 0
          ? Math.round((prospects || []).reduce((sum: number, p: any) => sum + (p.score || 0), 0) / total)
          : 0,
      },
    };
  },

  /**
   * Get recent activity (latest interactions)
   */
  async getRecentActivity(limit: number = 10, _userId?: number, _role?: string) {
    let query = supabase
      .from('interactions')
      .select('*, prospects(school_name, assigned_to_id), users!interactions_created_by_id_fkey(username)');

    // Data isolation removed: Show global activity feed
    /*
    if (role === 'commercial' && userId) {
      // For interactions, we filter by created_by_id or by the prospect's owner
      // But typically a commercial user only sees interactions they created or for their prospects
      query = query.eq('created_by_id', userId);
    }
    */

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    const activities = (data || []).map((i: any) => ({
      ...i,
      prospect_name: i.prospects?.school_name || 'Unknown',
      created_by: i.users?.username || 'Unknown',
    }));

    return { success: true, activities };
  },

  /**
   * Get top prospects by score
   */
  async getTopProspects(limit: number = 10) {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, prospects: data || [] };
  },

  /**
   * Health check
   */
  async health() {
    return apiService.health();
  }
};

// ==================== IMPORT/EXPORT SERVICE ====================

export const importExportService = {
  /**
   * Import prospects from CSV file (parsed client-side)
   */
  async importCSV(file: File) {
    return new Promise<any>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            reject(new Error('CSV file is empty or has no data rows'));
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
          const prospects: any[] = [];

          // CSV parser that handles quoted fields with commas
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let insideQuotes = false;

            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              const nextChar = line[i + 1];

              if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                  current += '"';
                  i++;
                } else {
                  insideQuotes = !insideQuotes;
                }
              } else if (char === ',' && !insideQuotes) {
                result.push(current.trim().replace(/^["']|["']$/g, ''));
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim().replace(/^["']|["']$/g, ''));
            return result;
          };

          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });

            prospects.push({
              school_name: row.school_name || row.name || row.school || `Import ${i}`,
              country: row.country || 'Unknown',
              school_type: row.school_type || row.type || 'private',
              contact_name: row.contact_name || row.contact || '',
              contact_role: row.contact_role || row.role || 'Other',
              contact_phone: row.contact_phone || row.phone || '',
              email: row.email || '',
              status: 'Nouveau',
              score: 0,
              priority: 'Faible',
              website: row.website || '',
              notes: row.notes || '',
            });
          }

          // Batch insert into Supabase
          const { data, error } = await supabase
            .from('prospects')
            .insert(prospects)
            .select();

          if (error) {
            reject(new Error(error.message));
            return;
          }

          resolve({
            success: true,
            message: `Successfully imported ${data?.length || 0} prospects`,
            imported: data?.length || 0,
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },

  /**
   * Clear all prospects from database
   */
  async clearDatabase() {
    // Delete all interactions first (cascade should handle this, but just in case)
    await supabase.from('interactions').delete().neq('id', 0);
    await supabase.from('scoring_logs').delete().neq('id', 0);

    const { error } = await supabase
      .from('prospects')
      .delete()
      .neq('id', 0); // Delete all rows

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: 'All prospects cleared' };
  },
};

// ==================== EMAIL/SETTINGS SERVICE ====================
// Note: Email sending requires a backend or Supabase Edge Function.
// These are placeholder implementations that store config locally.

export const emailService = {
  async getEmailConfig() {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('notes')
        .eq('school_name', '__SYSTEM_EMAIL_CONFIG__')
        .maybeSingle();

      if (error) throw error;

      if (data && data.notes) {
        return { success: true, config: JSON.parse(data.notes) };
      }

      // Default if not found
      return {
        success: true,
        config: {
          mail_server: '',
          mail_port: 587,
          mail_use_tls: true,
          mail_username: '',
          mail_default_sender: '',
          is_configured: false,
        },
      };
    } catch (error: any) {
      console.error('getEmailConfig error:', error);
      return { success: false, message: error.message || 'Failed to load config' };
    }
  },

  async updateEmailConfig(config: any) {
    try {
      // Find existing row first to avoid unique constraint 400 error
      const { data: existing, error: fetchError } = await supabase
        .from('prospects')
        .select('id')
        .eq('school_name', '__SYSTEM_EMAIL_CONFIG__')
        .maybeSingle();

      if (fetchError) throw fetchError;

      const payload = {
        school_name: '__SYSTEM_EMAIL_CONFIG__',
        country: 'System',
        school_type: 'private',
        contact_role: 'System',
        notes: JSON.stringify({ ...config, is_configured: true })
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('prospects')
          .update(payload)
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('prospects')
          .insert(payload);
        if (insertError) throw insertError;
      }

      return { success: true, message: 'Email configuration saved to Supabase' };
    } catch (error: any) {
      console.error('updateEmailConfig error:', error);
      return { success: false, message: error.message || 'Failed to save config' };
    }
  },

  async testEmailConfig(testEmail?: string, templateStatus?: string) {
    try {
      const response = await fetch(`${API_URL}/email/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': INTERNAL_API_KEY
        },
        body: JSON.stringify({
          test_email: testEmail,
          template_status: templateStatus
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Could not reach backend server.' };
    }
  },

  async sendEmail(toEmail: string, subject: string, body: string, prospectId?: number) {
    try {
      const response = await fetch(`${API_URL}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': INTERNAL_API_KEY
        },
        body: JSON.stringify({
          to_email: toEmail,
          subject,
          body,
          ...(prospectId ? { prospect_id: prospectId } : {})
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Could not reach backend server.' };
    }
  },

  async getEmailTemplates() {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('notes')
        .eq('school_name', '__SYSTEM_EMAIL_TEMPLATES__')
        .maybeSingle();

      if (error) throw error;

      if (data && data.notes) {
        return { success: true, templates: JSON.parse(data.notes) };
      }
      return { success: true, templates: {} };
    } catch (error: any) {
      console.error('getEmailTemplates error:', error);
      return { success: false, message: error.message || 'Failed to load templates' };
    }
  },

  async updateEmailTemplates(templates: any) {
    try {
      // Find existing row first to avoid unique constraint 400 error
      const { data: existing, error: fetchError } = await supabase
        .from('prospects')
        .select('id')
        .eq('school_name', '__SYSTEM_EMAIL_TEMPLATES__')
        .maybeSingle();

      if (fetchError) throw fetchError;

      const payload = {
        school_name: '__SYSTEM_EMAIL_TEMPLATES__',
        country: 'System',
        school_type: 'private',
        contact_role: 'System',
        notes: JSON.stringify(templates)
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('prospects')
          .update(payload)
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('prospects')
          .insert(payload);
        if (insertError) throw insertError;
      }

      return { success: true, message: 'Templates saved to Supabase' };
    } catch (error: any) {
      console.error('updateEmailTemplates error:', error);
      return { success: false, message: error.message || 'Failed to save templates' };
    }
  },
};

// ==================== HEALTH CHECK ====================

export const apiService = {
  async health() {
    try {
      const results = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).limit(1),
        supabase.from('prospects').select('id', { count: 'exact', head: true }).limit(1)
      ]);

      const userError = results[0].error;
      const prospectError = results[1].error;

      if (userError || prospectError) {
        return {
          status: 'error',
          database: 'connected',
          users_table: !userError,
          prospects_table: !prospectError,
          message: (userError?.message || prospectError?.message)
        };
      }

      return {
        status: 'healthy',
        database: 'connected',
        users_table: true,
        prospects_table: true
      };
    } catch (err) {
      return { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' };
    }
  },

  setBaseUrl(_url: string) {
    console.warn('Base URL is configured via supabase.js');
  },
};

export default {
  auth: authService,
  prospect: prospectService,
  interaction: interactionService,
  dashboard: dashboardService,
  importExport: importExportService,
  email: emailService,
  api: apiService,
};
