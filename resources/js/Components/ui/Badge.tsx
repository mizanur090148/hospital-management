import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'purple' | 'cyan';
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    className,
    variant = 'default',
    ...props
}) => {
    const variants = {
        default: 'bg-slate-100 text-slate-700 border-slate-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
        warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
        destructive: 'bg-rose-50 text-rose-700 border-rose-200/60',
        info: 'bg-blue-50 text-blue-700 border-blue-200/60',
        purple: 'bg-purple-50 text-purple-700 border-purple-200/60',
        cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
    };

    return (
        <span
            className={twMerge(
                clsx(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
                    variants[variant],
                    className
                )
            )}
            {...props}
        >
            {children}
        </span>
    );
};
