import React from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  className?: string;
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ className, icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'text-center py-16 px-6 flex flex-col items-center justify-center gap-4 bg-white/[0.01] rounded-3xl border border-white/5 max-w-md mx-auto',
        className
      )}
    >
      <div className="text-white/20 w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto shadow-inner">
        {icon || <HelpCircle size={32} />}
      </div>
      
      <div className="space-y-1">
        <h4 className="font-extrabold text-white text-base leading-snug">{title}</h4>
        <p className="text-xs text-white/40 leading-relaxed max-w-xs mx-auto">{description}</p>
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
