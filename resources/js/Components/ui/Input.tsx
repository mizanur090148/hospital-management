import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    className,
    id,
    ...props
}, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className="w-full space-y-1.5">
            {label && (
                <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    {label}
                </label>
            )}
            <div className="relative rounded-lg shadow-2xs">
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        {leftIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={twMerge(
                        clsx(
                            'block w-full rounded-lg border text-sm transition-all duration-150 py-2.5 px-3.5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1',
                            leftIcon ? 'pl-10' : '',
                            rightIcon ? 'pr-10' : '',
                            error
                                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900'
                                : 'border-slate-200 hover:border-slate-300 focus:border-cyan-500 focus:ring-cyan-500/20',
                            className
                        )
                    )}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <p className="text-xs text-rose-600 font-medium animate-fadeIn">{error}</p>
            )}
            {!error && helperText && (
                <p className="text-xs text-slate-500">{helperText}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
