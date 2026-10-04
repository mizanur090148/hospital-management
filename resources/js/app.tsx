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
    'facility.index': '/facility',
    'users.index': '/users',
    'roles.index': '/roles',
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
                    const mapped = routeMap[pattern] || `/${pattern}`;
                    return currentPath === mapped || (pattern === 'home' && currentPath === '/');
                },
            };
        }
        return routeMap[name] || `/${name}`;
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
