export type EstablishmentType = 'private' | 'public';
export type ContactRole = 'director' | 'teacher' | 'other';
export type LeadStatus = 'Nouveau' | 'Contacté' | 'Répondu' | 'Intéressé' | 'Démo planifiée' | 'Client' | 'Perdu';
export type Priority = 'Prioritaire' | 'Moyen' | 'Faible';

export interface Prospect {
    id: number;
    school_name: string;
    country: string;
    countryCode: string;
    school_type: EstablishmentType;
    contact_role: ContactRole;
    status: LeadStatus;
    email: string;
    score: number;
    priority: Priority;
    last_interaction: string;
    emailSent?: boolean;
    responseReceived?: boolean;
}

export const TARGET_COUNTRIES = ['FR', 'BE', 'CH', 'CA', 'MA', 'SN', 'CI'];

export const mockProspects: Prospect[] = [
    { id: 1, school_name: 'Lycée International de Paris', country: 'France', countryCode: 'FR', school_type: 'private', contact_role: 'director', status: 'Intéressé', email: 'dir@lip.fr', score: 75, priority: 'Prioritaire', last_interaction: '2026-02-08' },
    { id: 2, school_name: 'École Polytechnique de Lausanne', country: 'Switzerland', countryCode: 'CH', school_type: 'public', contact_role: 'teacher', status: 'Contacté', email: 'teach@epl.ch', score: 45, priority: 'Moyen', last_interaction: '2026-02-05' },
    { id: 3, school_name: 'Collège Royal de Bruxelles', country: 'Belgium', countryCode: 'BE', school_type: 'private', contact_role: 'director', status: 'Démo planifiée', email: 'admin@crb.be', score: 85, priority: 'Prioritaire', last_interaction: '2026-02-09' },
    { id: 4, school_name: 'Université de Montréal', country: 'Canada', countryCode: 'CA', school_type: 'public', contact_role: 'other', status: 'Nouveau', email: 'info@udem.ca', score: 25, priority: 'Faible', last_interaction: '2026-01-20' },
    { id: 5, school_name: 'Académie Dakar', country: 'Senegal', countryCode: 'SN', school_type: 'private', contact_role: 'director', status: 'Répondu', email: 'dir@acadakar.sn', score: 60, priority: 'Moyen', last_interaction: '2026-02-03' },
    { id: 6, school_name: 'Institut Supérieur Abidjan', country: 'Ivory Coast', countryCode: 'CI', school_type: 'private', contact_role: 'teacher', status: 'Intéressé', email: 'info@isa.ci', score: 55, priority: 'Moyen', last_interaction: '2026-02-06' },
    { id: 7, school_name: 'Lycée Mohammed V', country: 'Morocco', countryCode: 'MA', school_type: 'public', contact_role: 'director', status: 'Client', email: 'admin@lm5.ma', score: 90, priority: 'Prioritaire', last_interaction: '2026-02-10' },
    { id: 8, school_name: 'Collège de Paris', country: 'France', countryCode: 'FR', school_type: 'private', contact_role: 'director', status: 'Démo planifiée', email: 'contact@cdp.fr', score: 80, priority: 'Prioritaire', last_interaction: '2026-02-07' },
    { id: 9, school_name: 'École Normale de Rabat', country: 'Morocco', countryCode: 'MA', school_type: 'public', contact_role: 'teacher', status: 'Contacté', email: 'teach@enr.ma', score: 40, priority: 'Moyen', last_interaction: '2026-01-15' },
    { id: 10, school_name: 'Université Libre de Bruxelles', country: 'Belgium', countryCode: 'BE', school_type: 'public', contact_role: 'other', status: 'Nouveau', email: 'info@ulb.be', score: 20, priority: 'Faible', last_interaction: '2026-01-10' },
    { id: 11, school_name: 'Lycée Français de Genève', country: 'Switzerland', countryCode: 'CH', school_type: 'private', contact_role: 'director', status: 'Répondu', email: 'dir@lfg.ch', score: 70, priority: 'Prioritaire', last_interaction: '2026-02-04' },
    { id: 12, school_name: 'Académie Internationale de Casablanca', country: 'Morocco', countryCode: 'MA', school_type: 'private', contact_role: 'teacher', status: 'Perdu', email: 'teach@aic.ma', score: 10, priority: 'Faible', last_interaction: '2025-12-20' },
];

export const dashboardStats = {
    totalProspects: mockProspects.length,
    active: mockProspects.filter(p => !['Client', 'Perdu'].includes(p.status)).length,
    converted: mockProspects.filter(p => p.status === 'Client').length,
    priority: mockProspects.filter(p => p.priority === 'Prioritaire').length,
    byStatus: {
        'Nouveau': mockProspects.filter(p => p.status === 'Nouveau').length,
        'Contacté': mockProspects.filter(p => p.status === 'Contacté').length,
        'Répondu': mockProspects.filter(p => p.status === 'Répondu').length,
        'Intéressé': mockProspects.filter(p => p.status === 'Intéressé').length,
        'Démo planifiée': mockProspects.filter(p => p.status === 'Démo planifiée').length,
        'Client': mockProspects.filter(p => p.status === 'Client').length,
        'Perdu': mockProspects.filter(p => p.status === 'Perdu').length,
    },
    byCountry: mockProspects.reduce((acc, p) => {
        acc[p.country] = (acc[p.country] || 0) + 1;
        return acc;
    }, {} as Record<string, number>),
};
