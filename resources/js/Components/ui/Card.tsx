import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
    return (
        <div className={twMerge(clsx('bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden transition-all', className))} {...props}>
            {children}
        </div>
    );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
    return (
        <div className={twMerge(clsx('p-5 border-b border-slate-100 flex flex-col space-y-1', className))} {...props}>
            {children}
        </div>
    );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...props }) => {
    return (
        <h3 className={twMerge(clsx('text-base font-semibold text-slate-900 leading-tight', className))} {...props}>
            {children}
        </h3>
    );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, children, ...props }) => {
    return (
        <p className={twMerge(clsx('text-xs text-slate-500 font-normal', className))} {...props}>
            {children}
        </p>
    );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
    return (
        <div className={twMerge(clsx('p-5', className))} {...props}>
            {children}
        </div>
    );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
    return (
        <div className={twMerge(clsx('p-5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between', className))} {...props}>
            {children}
        </div>
    );
};
