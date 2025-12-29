import axios from 'axios';
import config from '../config';

const API_URL = config.API_BASE;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============ AUTH ============
export const authApi = {
    login: async (name: string) => {
        const response = await api.post('/login', { name });
        return response.data;
    },
};

// ============ EXPENSES ============
export interface Expense {
    id?: number;
    description: string;
    amount: number;
    category: string;
    date: string;
    receipt_url?: string;
    remarks?: string;
    status?: string;
    user_id?: number;
    created_by?: string;
    updated_by?: string;
    created_at?: string;
    updated_at?: string;
}

export const expensesApi = {
    getAll: async (): Promise<Expense[]> => {
        const response = await api.get('/expenses');
        return response.data;
    },
    create: async (expense: Omit<Expense, 'id'>): Promise<Expense> => {
        const response = await api.post('/expenses', expense);
        return response.data;
    },
    update: async (id: number, expense: Partial<Expense>): Promise<Expense> => {
        const response = await api.put(`/expenses/${id}`, expense);
        return response.data;
    },
    delete: async (id: number): Promise<void> => {
        await api.delete(`/expenses/${id}`);
    },
};

// ============ SALES ============
export interface Sale {
    id?: number;
    date: string;
    agency: string;
    client: string;
    supplier: string;
    national: string;
    service: string;
    net_rate: number;
    sales_rate: number;
    profit: number;
    passport_number?: string;
    documents?: string;
    remarks?: string;
    status?: string;
    user_id?: number;
    created_by?: string;
    updated_by?: string;
    created_at?: string;
    updated_at?: string;
    bus_supplier?: string;
    visa_supplier?: string;
    ticket_supplier?: string;
}

export const salesApi = {
    getAll: async (): Promise<Sale[]> => {
        const response = await api.get('/sales');
        return response.data;
    },
    create: async (sale: Omit<Sale, 'id'>): Promise<Sale> => {
        const response = await api.post('/sales', sale);
        return response.data;
    },
    update: async (id: number, sale: Partial<Sale>): Promise<Sale> => {
        const response = await api.put(`/sales/${id}`, sale);
        return response.data;
    },
    delete: async (id: number): Promise<void> => {
        await api.delete(`/sales/${id}`);
    },
};

// ============ STAFF ============
export interface Staff {
    id?: number;
    name: string;
    position: string;
    salary: number;
    phone: string;
}

export const staffApi = {
    getAll: async (): Promise<Staff[]> => {
        const response = await api.get('/staff');
        return response.data;
    },
    create: async (staff: Omit<Staff, 'id'>): Promise<Staff> => {
        const response = await api.post('/staff', staff);
        return response.data;
    },
    update: async (id: number, staff: Partial<Staff>): Promise<Staff> => {
        const response = await api.put(`/staff/${id}`, staff);
        return response.data;
    },
    delete: async (id: number): Promise<void> => {
        await api.delete(`/staff/${id}`);
    },
};

// ============ SUPPLIER PAYMENTS ============
export interface SupplierPayment {
    id?: number;
    supplier_name: string;
    amount: number;
    date: string;
    receipt_url?: string;
    remarks?: string;
    status?: string;
    user_id?: number;
    created_by?: string;
    updated_by?: string;
    created_at?: string;
    updated_at?: string;
}

export const supplierPaymentsApi = {
    getAll: async (): Promise<SupplierPayment[]> => {
        const response = await api.get('/supplier-payments');
        return response.data;
    },
    create: async (payment: Omit<SupplierPayment, 'id'>): Promise<SupplierPayment> => {
        const response = await api.post('/supplier-payments', payment);
        return response.data;
    },
    update: async (id: number, payment: Partial<SupplierPayment>): Promise<SupplierPayment> => {
        const response = await api.put(`/supplier-payments/${id}`, payment);
        return response.data;
    },
    delete: async (id: number): Promise<void> => {
        await api.delete(`/supplier-payments/${id}`);
    },
};

// ============ SALARY PAYMENTS ============
export interface SalaryPayment {
    id?: number;
    staff_id: number;
    staff_name: string;
    amount: number;
    advance: number;
    total_amount?: number;
    paid_month: string;
    date: string;
    receipt_url?: string;
    remarks?: string;
    status?: string;
    user_id?: number;
    created_by?: string;
    updated_by?: string;
    created_at?: string;
    updated_at?: string;
}

export const salaryPaymentsApi = {
    getAll: async (): Promise<SalaryPayment[]> => {
        const response = await api.get('/salary-payments');
        return response.data;
    },
    create: async (payment: Omit<SalaryPayment, 'id'>): Promise<SalaryPayment> => {
        const response = await api.post('/salary-payments', payment);
        return response.data;
    },
    update: async (id: number, payment: Partial<SalaryPayment>): Promise<SalaryPayment> => {
        const response = await api.put(`/salary-payments/${id}`, payment);
        return response.data;
    },
    delete: async (id: number): Promise<void> => {
        await api.delete(`/salary-payments/${id}`);
    },
};

// ============ DASHBOARD ============
export interface DashboardStats {
    totalSales: number;
    totalExpenses: number;
    totalProfit: number;
    netProfit: number;
    salesCount: number;
    expensesCount: number;
    recentSales: { date: string; total: number }[];
    recentExpenses: { date: string; total: number }[];
    salesByCategory: { category: string; total: number }[];
    expensesByCategory: { category: string; total: number }[];
}

export const dashboardApi = {
    getStats: async (): Promise<DashboardStats> => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },
};

// Health check for online/offline status
export const healthApi = {
    check: async (): Promise<boolean> => {
        try {
            await api.get('/health');
            return true;
        } catch {
            return false;
        }
    },
};

// ============ DROPDOWN OPTIONS ============
export interface DropdownOption {
    id?: number;
    type: string;
    value: string;
    display_order?: number;
    color?: string;
    table_type?: string;
}

export const dropdownOptionsApi = {
    getAll: async (type?: string, table_type?: string): Promise<DropdownOption[]> => {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (table_type) params.append('table_type', table_type);
        const queryString = params.toString();
        const response = await api.get(`/dropdown-options${queryString ? `?${queryString}` : ''}`);
        return response.data;
    },
    create: async (option: Omit<DropdownOption, 'id'>): Promise<DropdownOption> => {
        const response = await api.post('/dropdown-options', option);
        return response.data;
    },
    update: async (id: number, option: Partial<DropdownOption>): Promise<DropdownOption> => {
        const response = await api.put(`/dropdown-options/${id}`, option);
        return response.data;
    },
    delete: async (id: number): Promise<void> => {
        await api.delete(`/dropdown-options/${id}`);
    },
};

// ============ FILE UPLOAD ============
export interface UploadResponse {
    filename: string;
    originalName: string;
    path: string;
}

export interface MultipleUploadResponse {
    files: UploadResponse[];
}

export const fileUploadApi = {
    uploadSingle: async (file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            // Use axios directly (not the api instance) to avoid JSON Content-Type header
            // Don't set Content-Type - axios will set it automatically with boundary for FormData
            const response = await axios.post(`${API_URL}/upload`, formData);
            return response.data;
        } catch (error: any) {
            console.error('File upload error:', error);
            console.error('Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                url: error.config?.url
            });
            const errorMessage = error.response?.status === 404
                ? 'Upload endpoint not found. Please ensure the server is running and has the /api/upload endpoint. Check server console for errors.'
                : error.response?.data?.error || error.message || 'Failed to upload file';
            throw new Error(errorMessage);
        }
    },
    deleteFile: async (filePath: string): Promise<void> => {
        try {
            await api.post('/upload/delete', { filePath });
        } catch (error) {
            console.error('File deletion error:', error);
            // Non-critical error, don't throw to avoid blocking UI cleanup
        }
    },
    uploadMultiple: async (files: File[]): Promise<MultipleUploadResponse> => {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        try {
            // Use axios directly (not the api instance) to avoid JSON Content-Type header
            // Don't set Content-Type - axios will set it automatically with boundary for FormData
            const response = await axios.post(`${API_URL}/upload-multiple`, formData);
            return response.data;
        } catch (error: any) {
            console.error('Multiple file upload error:', error);
            console.error('Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                url: error.config?.url
            });
            const errorMessage = error.response?.status === 404
                ? 'Upload endpoint not found. Please ensure the server is running and has the /api/upload-multiple endpoint. Check server console for errors.'
                : error.response?.data?.error || error.message || 'Failed to upload files';
            throw new Error(errorMessage);
        }
    },
};

export default api;

