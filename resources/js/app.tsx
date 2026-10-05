import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

// Lightweight route resolver fallback
const routeMap: Record<string, string> = {
    'login': '/login',
    'hospital.register': '/register-hospital',
    'dashboard': '/dashboard',
    'home': '/dashboard',
    'logout': '/logout',
    'patients.index': '/patients',
    'patients.create': '/patients/create',
    'patients.store': '/patients',
    'facility.index': '/facility',
    'users.index': '/users',
    'roles.index': '/roles',
    'opd.workstation': '/opd',
    'appointments.index': '/appointments',
    'doctors.index': '/doctors',
};

if (typeof window.route === 'undefined') {
    (window as any).route = ((name?: string, params?: any) => {
        if (!name) {
            return {
                current: (pattern?: string) => {
                    const currentPath = window.location.pathname;
                    if (!pattern) return currentPath;
                    if (pattern.endsWith('.*')) {
                        const base = pattern.replace('.*', '');
                        return currentPath.startsWith(`/${base}`);
                    }
                    const mapped = routeMap[pattern] || `/${pattern.replace(/\./g, '/')}`;
                    return currentPath === mapped || (pattern === 'home' && currentPath === '/');
                },
            };
        }

        let path = routeMap[name];
        if (!path) {
            if (name.endsWith('.index')) {
                path = `/${name.replace('.index', '')}`;
            } else if (name.endsWith('.create')) {
                path = `/${name.replace('.create', '')}/create`;
            } else if (name.endsWith('.store')) {
                path = `/${name.replace('.store', '')}`;
            } else {
                path = `/${name.replace(/\./g, '/')}`;
            }
        }

        if (params !== undefined && params !== null) {
            if (typeof params === 'object') {
                Object.keys(params).forEach((key) => {
                    path = path.replace(`{${key}}`, params[key]);
                });
            } else {
                path = path.includes('{') ? path.replace(/\{[^}]+\}/, String(params)) : `${path}/${params}`;
            }
        }

        return path;
    });
}

const appName = import.meta.env.VITE_APP_NAME || 'ApexCare HMS';

createInertiaApp({
    title: (title) => title ? `${title} - ${appName}` : appName,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: '#0891b2',
        showSpinner: true,
    },
});
