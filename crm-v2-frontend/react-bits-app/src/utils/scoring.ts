
export const ScoringRules = {
    // Country scoring
    COUNTRY_TARGET: 20,       // Target countries: Canada, UAE
    COUNTRY_OTHER: 5,         // Other countries (5 points)
    TARGET_COUNTRIES_LIST: ['canada', 'uae', 'united arab emirates', 'émirats arabes unis'],

    // School type scoring
    SCHOOL_PRIVATE: 15,       // Private schools
    SCHOOL_PUBLIC: 10,        // Public schools

    // Contact role scoring
    ROLE_DIRECTOR: 25,        // Director/Principal
    ROLE_TEACHER: 15,         // Teacher
    ROLE_OTHER: 5,            // Non-decision maker

    // Lead status scoring
    STATUS_SCORES: {
        'Nouveau': 5,
        'Contacté': 10,
        'Répondu': 10,
        'Intéressé': 20,
        'Démo planifiée': 30,
        'Démo réalisée': 35,
        'Client': 50,
        'Perdu': 0
    } as Record<string, number>,

    // Interactions scoring
    INTERACTION_EMAIL_SENT: 5,
    INTERACTION_RESPONSE_RECEIVED: 15,

    // Inactivity penalty
    INACTIVITY_THRESHOLD_DAYS: 30,
    INACTIVITY_PENALTY: -10,

    // Large school bonus
    LARGE_SCHOOL_THRESHOLD: 500,
    LARGE_SCHOOL_BONUS: 15
};

export interface ScoreResult {
    score: number;
    priority: 'Prioritaire' | 'Moyen' | 'Faible'; // Matching Python backend values
    breakdown: Array<{ rule: string; points: number }>;
}

export const calculateScore = (prospect: any): ScoreResult => {
    let score = 0;
    const breakdown: Array<{ rule: string; points: number }> = [];

    // 1. Country scoring
    const p_country = (prospect.country || "").trim().toLowerCase();
    if (ScoringRules.TARGET_COUNTRIES_LIST.includes(p_country)) {
        const points = ScoringRules.COUNTRY_TARGET;
        score += points;
        breakdown.push({ rule: `Country: ${prospect.country} (Target)`, points });
    } else {
        const points = ScoringRules.COUNTRY_OTHER;
        score += points;
        breakdown.push({ rule: `Country: ${prospect.country} (Other)`, points });
    }

    // 2. School type scoring
    const p_type = (prospect.school_type || "").toLowerCase();
    if (p_type === 'private' || p_type === 'privé') {
        const points = ScoringRules.SCHOOL_PRIVATE;
        score += points;
        breakdown.push({ rule: "Type: Private", points });
    } else {
        const points = ScoringRules.SCHOOL_PUBLIC;
        score += points;
        breakdown.push({ rule: `Type: ${prospect.school_type}`, points });
    }

    // 3. Contact role scoring
    const role_lower = (prospect.contact_role || "").toLowerCase();
    const director_keywords = ['director', 'directeur', 'principal', 'head of', 'ceo', 'pedagogical', 'pédagogique', 'responsable'];
    const teacher_keywords = ['teacher', 'enseignant', 'professor', 'trainer', 'formateur'];

    if (director_keywords.some(r => role_lower.includes(r))) {
        const points = ScoringRules.ROLE_DIRECTOR;
        score += points;
        breakdown.push({ rule: `Role: ${prospect.contact_role} (Decision Maker)`, points });
    } else if (teacher_keywords.some(r => role_lower.includes(r))) {
        const points = ScoringRules.ROLE_TEACHER;
        score += points;
        breakdown.push({ rule: `Role: ${prospect.contact_role} (Influencer)`, points });
    } else {
        const points = ScoringRules.ROLE_OTHER;
        score += points;
        breakdown.push({ rule: `Role: ${prospect.contact_role} (Other)`, points });
    }

    // 4. Lead status scoring
    const status_points = ScoringRules.STATUS_SCORES[prospect.status] || 0;
    score += status_points;
    breakdown.push({ rule: `Status: ${prospect.status}`, points: status_points });

    // 5. Interaction Checkboxes
    if (prospect.interaction_email_sent) {
        const points = ScoringRules.INTERACTION_EMAIL_SENT;
        score += points;
        breakdown.push({ rule: "Email Sent", points });
    }

    if (prospect.interaction_response_received) {
        const points = ScoringRules.INTERACTION_RESPONSE_RECEIVED;
        score += points;
        breakdown.push({ rule: "Response Received", points });
    }

    // 6. Inactivity penalty (if last_interaction exists)
    if (prospect.last_interaction) {
        const lastInteractionDate = new Date(prospect.last_interaction);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastInteractionDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= ScoringRules.INACTIVITY_THRESHOLD_DAYS) {
            const points = ScoringRules.INACTIVITY_PENALTY;
            score += points;
            breakdown.push({ rule: `Inactivity (${diffDays} days)`, points });
        }
    }

    // 7. Large School Bonus
    if (prospect.student_count && prospect.student_count >= ScoringRules.LARGE_SCHOOL_THRESHOLD) {
        const points = ScoringRules.LARGE_SCHOOL_BONUS;
        score += points;
        breakdown.push({ rule: `Large School (>=${ScoringRules.LARGE_SCHOOL_THRESHOLD} students)`, points });
    }

    // Clamp score 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine priority
    let priority: 'Prioritaire' | 'Moyen' | 'Faible';
    if (score > 60) {
        priority = 'Prioritaire';
    } else if (score >= 30) {
        priority = 'Moyen';
    } else {
        priority = 'Faible';
    }

    return { score, priority, breakdown };
};
