/**
 * Admin Service - Uses Supabase directly (same as rest of the app)
 * No Flask backend required
 */

import { supabase } from '../supabase';
import { hashPassword } from './api';

// Interface definitions for Admin Dashboard
export interface AdminStats {
    total_users: number;
    total_prospects: number;
    high_priority_leads: number;
    conversion_rate: number;
    status_distribution: Record<string, number>;
    country_distribution: Record<string, number>;
    user_distribution: Record<string, number>;
}

export interface UserData {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'commercial';
    is_active: boolean;
    created_at: string;
}

export const adminService = {
    /**
     * Get dashboard statistics from Supabase
     */
    async getDashboardStats() {
        try {
            // Fetch all prospects
            const { data: prospects, error: pError } = await supabase
                .from('prospects')
                .select('*');

            if (pError) throw pError;

            // Fetch all users
            const { count: userCount, error: uError } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true });

            if (uError) throw uError;

            const allProspects = prospects || [];
            const total_prospects = allProspects.length;
            const total_users = userCount || 0;

            // High priority leads
            const high_priority_leads = allProspects.filter(
                (p: any) => p.priority === 'Prioritaire' || p.priority === 'High'
            ).length;

            // Conversion rate
            const converted = allProspects.filter((p: any) => p.status === 'Client').length;
            const conversion_rate = total_prospects > 0
                ? Math.round((converted / total_prospects) * 100)
                : 0;

            // Status distribution
            const status_distribution: Record<string, number> = {};
            allProspects.forEach((p: any) => {
                const status = p.status || 'Nouveau';
                status_distribution[status] = (status_distribution[status] || 0) + 1;
            });

            // Country distribution
            const country_distribution: Record<string, number> = {};
            allProspects.forEach((p: any) => {
                const country = p.country || 'Unknown';
                country_distribution[country] = (country_distribution[country] || 0) + 1;
            });

            // User distribution (Workload by user)
            const user_distribution: Record<string, number> = {};

            // First, get all users to map IDs to usernames
            const { data: usersData } = await supabase
                .from('users')
                .select('id, username');

            const userMap: Record<number, string> = {};
            (usersData || []).forEach(u => {
                userMap[u.id] = u.username;
            });

            allProspects.forEach((p: any) => {
                const username = p.assigned_to_id ? (userMap[p.assigned_to_id] || 'Other') : 'Unassigned';
                user_distribution[username] = (user_distribution[username] || 0) + 1;
            });

            const stats: AdminStats = {
                total_users,
                total_prospects,
                high_priority_leads,
                conversion_rate,
                status_distribution,
                country_distribution,
                user_distribution,
            };

            return { success: true, stats };
        } catch (error) {
            console.error('Admin stats error:', error);
            return { success: false, message: 'Failed to load dashboard data' };
        }
    },

    /**
     * Get all users from Supabase
     */
    async getUsers() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, email, role, is_active, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { success: true, users: data || [] };
        } catch (error) {
            console.error('Get users error:', error);
            return { success: false, message: 'Failed to load users' };
        }
    },

    /**
     * Create new user in Supabase
     */
    async createUser(user: Omit<UserData, 'id' | 'created_at' | 'is_active'> & { password: string }) {
        try {
            // Hash the password with SHA-256 (same as authService)
            const password_hash = await hashPassword(user.password);

            const { data, error } = await supabase
                .from('users')
                .insert({
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    password_hash,
                    is_active: true,
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, user: data };
        } catch (error: any) {
            console.error('Create user error:', error);
            return { success: false, message: error?.message || 'Failed to create user' };
        }
    },

    /**
     * Delete user from Supabase with options for their prospects
     */
    async deleteUserWithOptions(id: number, action: 'delete' | 'transfer' | 'unassign', transferToId?: number) {
        try {
            if (action === 'delete') {
                // Delete all assigned prospects
                await supabase
                    .from('prospects')
                    .delete()
                    .eq('assigned_to_id', id);
            } else if (action === 'transfer' && transferToId) {
                // Transfer prospects to another user
                await supabase
                    .from('prospects')
                    .update({ assigned_to_id: transferToId })
                    .eq('assigned_to_id', id);
            } else {
                // Default: Unassign
                await supabase
                    .from('prospects')
                    .update({ assigned_to_id: null })
                    .eq('assigned_to_id', id);
            }

            // Finally delete the user
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Delete user with options error:', error);
            return { success: false, message: 'Failed to delete user and handle prospects' };
        }
    },

    /**
     * Detailed activity (existing)
     */
    async getUserActivity(userId: number) {
        try {
            // Fetch prospects assigned to this user
            const { data: prospects, error: pError } = await supabase
                .from('prospects')
                .select('*')
                .eq('assigned_to_id', userId)
                .order('updated_at', { ascending: false });

            if (pError) throw pError;

            // Fetch interactions created by this user
            const { data: interactions, error: iError } = await supabase
                .from('interactions')
                .select('*, prospects(school_name)')
                .eq('created_by_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (iError) throw iError;

            // Calculate status distribution for this user
            const status_distribution: Record<string, number> = {};
            (prospects || []).forEach((p: any) => {
                const status = p.status || 'Nouveau';
                status_distribution[status] = (status_distribution[status] || 0) + 1;
            });

            return {
                success: true,
                activity: {
                    prospects: prospects || [],
                    interactions: (interactions || []).map((i: any) => ({
                        ...i,
                        school_name: i.prospects?.school_name || 'Deleted Prospect'
                    })),
                    status_distribution,
                    total_prospects: prospects?.length || 0,
                    total_interactions: interactions?.length || 0
                }
            };
        } catch (error) {
            console.error('Get user activity error:', error);
            return { success: false, message: 'Failed to load user activity' };
        }
    },

    /**
     * Permanent system-wide reset (Admin ONLY)
     * Wipes all prospects and interactions
     */
    async resetSystem() {
        try {
            // 1. Delete all interactions
            const { error: iError } = await supabase
                .from('interactions')
                .delete()
                .neq('id', 0); // Hack to delete all in Supabase without WHERE true

            if (iError) throw iError;

            // 2. Delete all prospects
            const { error: pError } = await supabase
                .from('prospects')
                .delete()
                .neq('id', 0);

            if (pError) throw pError;

            return { success: true, message: 'System reset successful' };
        } catch (error) {
            console.error('System reset error:', error);
            return { success: false, message: 'Failed to reset system' };
        }
    }
};
