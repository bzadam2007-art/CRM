import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatusPipelineProps {
    currentStatus: string;
    onStatusChange?: (status: string) => void;
}

const STAGES = [
    { id: 'Nouveau', label: 'Nouveau', color: '#3b82f6' },
    { id: 'Contacté', label: 'Contacté', color: '#f59e0b' },
    { id: 'Répondu', label: 'Répondu', color: '#06b6d4' },
    { id: 'Intéressé', label: 'Intéressé', color: '#8b5cf6' },
    { id: 'Démo planifiée', label: 'Démo planifiée', color: '#6366f1' },
    { id: 'Démo réalisée', label: 'Démo réalisée', color: '#d946ef' },
    { id: 'Client', label: 'Client', color: '#10b981' },
];

const StatusPipeline = ({ currentStatus, onStatusChange }: StatusPipelineProps) => {
    // Pipeline is restricted to first 3 stages per user request
    const VISIBLE_STAGES = STAGES.slice(0, 3);

    // Find index in the full list to know if we are beyond the visible stages
    const fullIndex = STAGES.findIndex(s => s.id === currentStatus);

    // Find index within visible stages
    let activeIndex = VISIBLE_STAGES.findIndex(s => s.id === currentStatus);

    const isLost = currentStatus === 'Perdu';
    const isConverted = currentStatus === 'Client';

    // If status is in the full list but layout is restricted (e.g. "Intéressé"), 
    // treat it as "completed" for the visible pipeline context (all 3 checked)
    const isBeyondVisible = fullIndex >= 3;

    // Handle Perdu or unknown statuses
    if (activeIndex === -1 && !isBeyondVisible && !isLost) {
        activeIndex = 0;
    }

    return (
        <div className="w-full py-6">
            <div className="relative flex items-center justify-between w-full">
                {/* Background Line */}
                <div className="absolute top-1/2 left-0 w-full h-1.5 bg-slate-200 dark:bg-slate-700 -z-10 rounded-full" />
                {/* Progress Line */}
                <div
                    className={`absolute top-1/2 left-0 h-1.5 -z-10 rounded-full transition-all duration-500 ${isLost ? 'bg-red-200 dark:bg-red-900/30' : (isConverted || isBeyondVisible) ? 'bg-emerald-200 dark:bg-emerald-900/30' : 'bg-primary/30'}`}
                    style={{ width: `${isBeyondVisible ? 100 : Math.max(0, (activeIndex / (VISIBLE_STAGES.length - 1)) * 100)}%` }}
                />

                {VISIBLE_STAGES.map((stage, index) => {
                    const isCompleted = !isLost && (index < activeIndex || isBeyondVisible);
                    const isCurrent = !isLost && index === activeIndex && !isBeyondVisible;
                    const isFuture = isLost || (index > activeIndex && !isBeyondVisible);

                    return (
                        <div key={stage.id} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => onStatusChange?.(stage.id)}>
                            <motion.div
                                initial={false}
                                animate={{
                                    scale: isCurrent ? 1.25 : 1,
                                    backgroundColor: isCompleted || isCurrent ? stage.color : '#f1f5f9',
                                    borderColor: isCompleted || isCurrent ? stage.color : '#e2e8f0'
                                }}
                                className={`
                                    w-8 h-8 rounded-full flex items-center justify-center border-2 
                                    ${isFuture ? 'dark:bg-slate-800 dark:border-slate-700' : 'text-white'}
                                    transition-colors duration-300 relative z-10
                                `}
                            >
                                {isCompleted ? (
                                    <Check size={14} strokeWidth={3} />
                                ) : (
                                    <span className={`text-xs font-bold ${isFuture ? 'text-slate-400' : 'text-white'}`}>{index + 1}</span>
                                )}
                            </motion.div>
                            <span className={`text-[10px] font-medium transition-colors text-center leading-tight max-w-[70px] ${isCurrent ? 'text-primary font-bold' : isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                                }`}>
                                {stage.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Contextual Status Message */}
            <div className="mt-6 text-center">
                {isLost ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
                        <X size={14} /> Prospect Perdu
                    </div>
                ) : isConverted ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                        <Check size={14} /> Client confirmé !
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">
                        Étape actuelle : <span className="font-bold text-slate-900 dark:text-white">{STAGES.find(s => s.id === currentStatus)?.label || currentStatus}</span>
                    </p>
                )}
            </div>
        </div>
    );
};

export default StatusPipeline;
