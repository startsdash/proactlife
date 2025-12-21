
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  color?: string; // Tailwind color class prefix (e.g. 'text-indigo-500', 'bg-indigo-50')
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  color = 'indigo'
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 animate-in fade-in zoom-in-95 duration-500">
      <div className={`
        w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-sm
        bg-gradient-to-br from-white to-slate-50 border border-slate-100
        dark:from-slate-800 dark:to-slate-900 dark:border-slate-700
      `}>
        <Icon 
            size={32} 
            className={`text-${color}-500 dark:text-${color}-400 opacity-80`} 
            strokeWidth={1.5}
        />
      </div>
      
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">
        {title}
      </h3>
      
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className={`
            px-5 py-2.5 rounded-xl text-sm font-medium transition-all
            bg-white border border-slate-200 text-slate-700 hover:border-${color}-300 hover:text-${color}-600 hover:shadow-md
            dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-${color}-500 dark:hover:text-white
            active:scale-[0.98]
          `}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
