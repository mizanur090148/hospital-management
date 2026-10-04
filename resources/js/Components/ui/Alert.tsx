import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'info' | 'success' | 'warning' | 'destructive';
    title?: string;
    onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
    children,
    className,
    variant = 'info',
    title,
    onDismiss,
    ...props
}) => {
    const config = {
        info: {
            bg: 'bg-blue-50/80 border-blue-200 text-blue-900',
            icon: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
            titleColor: 'text-blue-950',
        },
        success: {
            bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
            titleColor: 'text-emerald-950',
        },
        warning: {
            bg: 'bg-amber-50/80 border-amber-200 text-amber-900',
            icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
            titleColor: 'text-amber-950',
        },
        destructive: {
            bg: 'bg-rose-50/80 border-rose-200 text-rose-900',
            icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
            titleColor: 'text-rose-950',
        },
    };

    const current = config[variant];

    return (
        <div
            className={twMerge(
                clsx(
                    'relative rounded-xl border p-4 flex gap-3 text-sm shadow-xs transition-all animate-fadeIn',
                    current.bg,
                    className
                )
            )}
            role="alert"
            {...props}
        >
            {current.icon}
            <div className="flex-1">
                {title && <h5 className={clsx('font-semibold text-sm mb-1 leading-tight', current.titleColor)}>{title}</h5>}
                <div className="text-xs leading-relaxed opacity-90">{children}</div>
            </div>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="p-1 hover:bg-black/5 rounded-md transition-colors text-slate-500 hover:text-slate-800"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};
