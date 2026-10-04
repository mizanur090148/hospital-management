export interface User {
    id: string;
    name: string;
    email: string;
    user_type: string;
    user_type_label: string;
    status: string;
    roles: string[];
    permissions: string[];
    has_2fa: boolean;
}

export interface Tenant {
    id: string;
    slug: string;
    trade_name: string;
    legal_name: string;
    status: string;
    plan: string;
}

export interface Branch {
    id: string;
    code: string;
    name: string;
    is_main: boolean;
}

export interface TenantContext {
    tenant: Tenant | null;
    branch: Branch | null;
    branches: Branch[];
    isPlatformMode: boolean;
}

export interface PageProps<T = Record<string, unknown>> {
    app: {
        name: string;
        env: string;
    };
    auth: {
        user: User | null;
    };
    tenantContext: TenantContext;
    flash: {
        success?: string | null;
        error?: string | null;
        warning?: string | null;
    };
    errors: Record<string, string>;
    [key: string]: unknown;
} & T;

declare global {
    function route(name?: string, params?: any): any;
}
