"""
Scoring system for prospects based on specified rules.
Applies weighted scoring rules based on:
- Country (target vs non-target)
- School type (private vs public)
- Contact role (decision maker level)
- Lead status (pipeline progression)
- Interaction frequency
- Inactivity penalty
"""
from datetime import datetime

class ScoringRules:
    """Define all scoring rules and constants"""
    
    # Country scoring
    COUNTRY_TARGET = 20       # Target countries: Canada, UAE
    COUNTRY_OTHER = 5         # Other countries (5 points)
    TARGET_COUNTRIES_LIST = ['canada', 'uae', 'united arab emirates', 'émirats arabes unis']

    # School type scoring
    SCHOOL_PRIVATE = 15       # Private schools
    SCHOOL_PUBLIC = 10        # Public schools
    
    # Contact role scoring
    ROLE_DIRECTOR = 25        # Director/Principal
    ROLE_TEACHER = 15         # Teacher
    ROLE_OTHER = 5            # Non-decision maker
    
    # Lead status scoring — 8 pipeline stages
    VALID_STATUSES = [
        'Nouveau', 'Contacté', 'Répondu', 'Intéressé',
        'Démo planifiée', 'Démo réalisée', 'Client', 'Perdu'
    ]

    STATUS_SCORES = {
        'Nouveau': 5,
        'Contacté': 10,
        'Répondu': 10,  # Form appears here, scoring base maintained
        'Intéressé': 20,
        'Démo planifiée': 30,
        'Démo réalisée': 35,
        'Client': 50,
        'Perdu': 0
    }
    
    # Interactions scoring
    INTERACTION_EMAIL_SENT = 5
    INTERACTION_RESPONSE_RECEIVED = 15
    
    # Inactivity penalty
    INACTIVITY_THRESHOLD_DAYS = 30
    INACTIVITY_PENALTY = -10
    
    # Large school bonus
    LARGE_SCHOOL_THRESHOLD = 500
    LARGE_SCHOOL_BONUS = 15


def calculate_score(prospect):
    """
    Calculate prospect score based on multiple factors.
    
    Args:
        prospect: Prospect object with attributes
        
    Returns:
        tuple: (score: int, priority: str, breakdown: list)
            - score: Total computed score (0-100)
            - priority: 'High' (>60), 'Medium' (30-59), 'Low' (<30)
            - breakdown: List of dicts [{"rule": "...", "points": ...}]
    """
    score = 0
    breakdown = []
    
    # 1. Country scoring
    p_country = (prospect.country or "").lower()
    if p_country in ScoringRules.TARGET_COUNTRIES_LIST:
        points = ScoringRules.COUNTRY_TARGET
        rule_name = f"Country: {prospect.country} (Target)"
    else:
        points = ScoringRules.COUNTRY_OTHER
        rule_name = f"Country: {prospect.country} (Other)"
    
    score += points
    breakdown.append({"rule": rule_name, "points": points})
    
    # 2. School type scoring
    p_type = (prospect.school_type or "").lower()
    if p_type == 'private' or p_type == 'privé':
        points = ScoringRules.SCHOOL_PRIVATE
        rule_name = "Type: Private"
    else:
        points = ScoringRules.SCHOOL_PUBLIC
        rule_name = f"Type: {prospect.school_type}"
    
    score += points
    breakdown.append({"rule": rule_name, "points": points})
    
    # 3. Contact role scoring
    role_lower = (prospect.contact_role or "").lower()
    if any(r in role_lower for r in ['director', 'directeur', 'principal', 'head of', 'ceo', 'pedagogical', 'pédagogique', 'responsable']):
        points = ScoringRules.ROLE_DIRECTOR
        rule_name = f"Role: {prospect.contact_role} (Decision Maker)"
    elif any(r in role_lower for r in ['teacher', 'enseignant', 'professor', 'trainer', 'formateur']):
        points = ScoringRules.ROLE_TEACHER
        rule_name = f"Role: {prospect.contact_role} (Influencer)"
    else:
        points = ScoringRules.ROLE_OTHER
        rule_name = f"Role: {prospect.contact_role} (Other)"
        
    score += points
    breakdown.append({"rule": rule_name, "points": points})
    
    # 4. Lead status scoring
    status_points = ScoringRules.STATUS_SCORES.get(prospect.status, 0)
    score += status_points
    breakdown.append({"rule": f"Status: {prospect.status}", "points": status_points})
    
    # 5. Interaction Checkboxes
    if prospect.interaction_email_sent:
        points = ScoringRules.INTERACTION_EMAIL_SENT
        score += points
        breakdown.append({"rule": "Email Sent", "points": points})
        
    if prospect.interaction_response_received:
        points = ScoringRules.INTERACTION_RESPONSE_RECEIVED
        score += points
        breakdown.append({"rule": "Response Received", "points": points})

    # 6. Inactivity penalty
    if prospect.last_interaction:
        days_inactive = (datetime.utcnow() - prospect.last_interaction).days
        if days_inactive >= ScoringRules.INACTIVITY_THRESHOLD_DAYS:
            points = ScoringRules.INACTIVITY_PENALTY
            score += points
            breakdown.append({"rule": f"Inactivity ({days_inactive} days)", "points": points})

    # 7. Large School Bonus
    if prospect.student_count and prospect.student_count >= ScoringRules.LARGE_SCHOOL_THRESHOLD:
        points = ScoringRules.LARGE_SCHOOL_BONUS
        score += points
        breakdown.append({"rule": f"Large School (>={ScoringRules.LARGE_SCHOOL_THRESHOLD} students)", "points": points})
    
    # Clamp score 0-100
    score = max(0, min(100, score))
    
    # Determine priority
    if score > 60:
        priority = 'Prioritaire'
    elif score >= 30:
        priority = 'Moyen'
    else:
        priority = 'Faible'
    
    return score, priority, breakdown


def recalculate_prospect_score(prospect):
    """
    Recalculate and update prospect score in database.
    Also logs the change for audit trail.
    
    Args:
        prospect: Prospect object to recalculate
        
    Returns:
        Prospect: Updated prospect object
    """
    from extensions import db
    from models import ScoringLog
    import json
    
    old_score = prospect.score
    new_score, priority, breakdown = calculate_score(prospect)
    
    # Update prospect
    prospect.score = new_score
    prospect.priority = priority
    # prospect.updated_at is handled by onupdate in model usually, but explicit sets are fine
    prospect.updated_at = datetime.utcnow()
    
    # Log the scoring change only if score changed OR if it's a new calc (e.g. initial)
    # But usually strictly on change is better to avoid spam. 
    # Let's log if score changed.
    if old_score != new_score:
        log = ScoringLog(
            prospect_id=prospect.id,
            old_score=old_score,
            new_score=new_score,
            scoring_details=breakdown  # SQLAlchemy JSON type handles list/dict automatically
        )
        db.session.add(log)
    
    db.session.commit()
    return prospect
