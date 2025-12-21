import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import {
    expensesApi, salesApi, staffApi, supplierPaymentsApi, salaryPaymentsApi, dashboardApi, healthApi,
    type Expense, type Sale, type Staff, type SupplierPayment, type SalaryPayment, type DashboardStats
} from '../services/api';

const API_URL = 'http://localhost:3001';
const socket = io(API_URL);

interface DataContextType {
    // Data
    expenses: Expense[];
    sales: Sale[];
    staff: Staff[];
    supplierPayments: SupplierPayment[];
    salaryPayments: SalaryPayment[];
    dashboardStats: DashboardStats | null;

    // Loading and Connection states
    isLoading: boolean;
    isServerOnline: boolean;

    // Refresh functions
    refreshExpenses: () => Promise<void>;
    refreshSales: () => Promise<void>;
    refreshStaff: () => Promise<void>;
    refreshSupplierPayments: () => Promise<void>;
    refreshSalaryPayments: () => Promise<void>;
    refreshDashboard: () => Promise<void>;
    refreshAll: () => Promise<void>;

    // CRUD operations
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<Expense>;
    updateExpense: (id: number, expense: Partial<Expense>) => Promise<void>;
    deleteExpense: (id: number) => Promise<void>;

    addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale>;
    updateSale: (id: number, sale: Partial<Sale>) => Promise<void>;
    deleteSale: (id: number) => Promise<void>;

    addStaff: (staff: Omit<Staff, 'id'>) => Promise<Staff>;
    updateStaff: (id: number, staff: Partial<Staff>) => Promise<void>;
    deleteStaff: (id: number) => Promise<void>;

    addSupplierPayment: (payment: Omit<SupplierPayment, 'id'>) => Promise<SupplierPayment>;
    updateSupplierPayment: (id: number, payment: Partial<SupplierPayment>) => Promise<void>;
    deleteSupplierPayment: (id: number) => Promise<void>;

    addSalaryPayment: (payment: Omit<SalaryPayment, 'id'>) => Promise<SalaryPayment>;
    updateSalaryPayment: (id: number, payment: Partial<SalaryPayment>) => Promise<void>;
    deleteSalaryPayment: (id: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
    const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isServerOnline, setIsServerOnline] = useState(true);
    const [lastSuccessfulRefresh, setLastSuccessfulRefresh] = useState<number>(0);

    // Refresh functions
    const refreshExpenses = useCallback(async () => {
        const data = await expensesApi.getAll();
        setExpenses(data);
    }, []);

    const refreshSales = useCallback(async () => {
        const data = await salesApi.getAll();
        setSales(data);
    }, []);

    const refreshStaff = useCallback(async () => {
        const data = await staffApi.getAll();
        setStaff(data);
    }, []);

    const refreshSupplierPayments = useCallback(async () => {
        const data = await supplierPaymentsApi.getAll();
        setSupplierPayments(data);
    }, []);

    const refreshSalaryPayments = useCallback(async () => {
        const data = await salaryPaymentsApi.getAll();
        setSalaryPayments(data);
    }, []);

    const refreshDashboard = useCallback(async () => {
        const data = await dashboardApi.getStats();
        setDashboardStats(data);
    }, []);

    const refreshAll = useCallback(async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                refreshExpenses(),
                refreshSales(),
                refreshStaff(),
                refreshSupplierPayments(),
                refreshSalaryPayments(),
                refreshDashboard(),
            ]);
            setLastSuccessfulRefresh(Date.now());
            setIsServerOnline(true);
        } catch (error) {
            console.error('Failed to refresh data:', error);
            const online = await healthApi.check();
            setIsServerOnline(online);
        } finally {
            setIsLoading(false);
        }
    }, [refreshExpenses, refreshSales, refreshStaff, refreshSupplierPayments, refreshSalaryPayments, refreshDashboard]);

    // Socket.IO Event Listeners
    useEffect(() => {
        // Expense events
        socket.on('expense:created', (expense: Expense) => {
            setExpenses(prev => [expense, ...prev]);
            refreshDashboard();
        });
        socket.on('expense:updated', (expense: Expense) => {
            setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
            refreshDashboard();
        });
        socket.on('expense:deleted', ({ id }: { id: number }) => {
            setExpenses(prev => prev.filter(e => e.id !== id));
            refreshDashboard();
        });

        // Sale events
        socket.on('sale:created', (sale: Sale) => {
            setSales(prev => [sale, ...prev]);
            refreshDashboard();
        });
        socket.on('sale:updated', (sale: Sale) => {
            setSales(prev => prev.map(s => s.id === sale.id ? sale : s));
            refreshDashboard();
        });
        socket.on('sale:deleted', ({ id }: { id: number }) => {
            setSales(prev => prev.filter(s => s.id !== id));
            refreshDashboard();
        });

        // Supplier payment events
        socket.on('supplier_payment:created', (payment: SupplierPayment) => {
            setSupplierPayments(prev => [payment, ...prev]);
            refreshDashboard();
        });
        socket.on('supplier_payment:updated', (payment: SupplierPayment) => {
            setSupplierPayments(prev => prev.map(p => p.id === payment.id ? payment : p));
            refreshDashboard();
        });
        socket.on('supplier_payment:deleted', ({ id }: { id: number }) => {
            setSupplierPayments(prev => prev.filter(p => p.id !== id));
            refreshDashboard();
        });

        // Salary payment events
        socket.on('salary_payment:created', (payment: SalaryPayment) => {
            setSalaryPayments(prev => [payment, ...prev]);
            refreshDashboard();
        });
        socket.on('salary_payment:updated', (payment: SalaryPayment) => {
            setSalaryPayments(prev => prev.map(p => p.id === payment.id ? payment : p));
            refreshDashboard();
        });
        socket.on('salary_payment:deleted', ({ id }: { id: number }) => {
            setSalaryPayments(prev => prev.filter(p => p.id !== id));
            refreshDashboard();
        });

        // Connection status
        socket.on('connect', () => {
            console.log('Socket.IO connected');
            setIsServerOnline(true);
        });
        socket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            setIsServerOnline(false);
        });

        return () => {
            socket.off('expense:created');
            socket.off('expense:updated');
            socket.off('expense:deleted');
            socket.off('sale:created');
            socket.off('sale:updated');
            socket.off('sale:deleted');
            socket.off('supplier_payment:created');
            socket.off('supplier_payment:updated');
            socket.off('supplier_payment:deleted');
            socket.off('salary_payment:created');
            socket.off('salary_payment:updated');
            socket.off('salary_payment:deleted');
            socket.off('connect');
            socket.off('disconnect');
        };
    }, [refreshDashboard]);

    // Health Check Effect
    useEffect(() => {
        const checkHealth = async () => {
            const online = await healthApi.check();
            setIsServerOnline(online);
        };

        checkHealth();
        const interval = setInterval(checkHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    // Auto-refresh when coming back online
    useEffect(() => {
        if (isServerOnline && (Date.now() - lastSuccessfulRefresh > 2000)) {
            refreshAll();
        }
    }, [isServerOnline, refreshAll, lastSuccessfulRefresh]);

    // Initial load
    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    // Helper to get current user_id from localStorage
    const getCurrentUserId = (): number | undefined => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user?.id;
            }
        } catch (e) {
            console.error('Error getting user from localStorage:', e);
        }
        return undefined;
    };

    // CRUD Operations
    const addExpense = async (expense: Omit<Expense, 'id'>) => {
        const user_id = getCurrentUserId();
        const expenseWithUser = { ...expense, user_id };
        const newExpense = await expensesApi.create(expenseWithUser);
        // No need to manually update state - Socket.IO event will handle it
        return newExpense;
    };

    const updateExpense = async (id: number, expense: Partial<Expense>) => {
        const user_id = getCurrentUserId();
        const expenseWithUser = { ...expense, user_id };
        await expensesApi.update(id, expenseWithUser);
        // Socket.IO event will update state
    };

    const deleteExpense = async (id: number) => {
        await expensesApi.delete(id);
        // Socket.IO event will update state
    };

    const addSale = async (sale: Omit<Sale, 'id'>) => {
        const user_id = getCurrentUserId();
        const saleWithUser = { ...sale, user_id };
        const newSale = await salesApi.create(saleWithUser);
        return newSale;
    };

    const updateSale = async (id: number, sale: Partial<Sale>) => {
        const user_id = getCurrentUserId();
        const saleWithUser = { ...sale, user_id };
        await salesApi.update(id, saleWithUser);
    };

    const deleteSale = async (id: number) => {
        await salesApi.delete(id);
    };

    const addStaff = async (staffData: Omit<Staff, 'id'>) => {
        const newStaff = await staffApi.create(staffData);
        await refreshStaff();
        return newStaff;
    };

    const updateStaff = async (id: number, staffData: Partial<Staff>) => {
        await staffApi.update(id, staffData);
        await refreshStaff();
    };

    const deleteStaff = async (id: number) => {
        await staffApi.delete(id);
        await refreshStaff();
    };

    const addSupplierPayment = async (payment: Omit<SupplierPayment, 'id'>) => {
        const user_id = getCurrentUserId();
        const paymentWithUser = { ...payment, user_id };
        const newPayment = await supplierPaymentsApi.create(paymentWithUser);
        return newPayment;
    };

    const updateSupplierPayment = async (id: number, payment: Partial<SupplierPayment>) => {
        const user_id = getCurrentUserId();
        const paymentWithUser = { ...payment, user_id };
        await supplierPaymentsApi.update(id, paymentWithUser);
    };

    const deleteSupplierPayment = async (id: number) => {
        await supplierPaymentsApi.delete(id);
    };

    const addSalaryPayment = async (payment: Omit<SalaryPayment, 'id'>) => {
        const user_id = getCurrentUserId();
        const paymentWithUser = { ...payment, user_id };
        const newPayment = await salaryPaymentsApi.create(paymentWithUser);
        return newPayment;
    };

    const updateSalaryPayment = async (id: number, payment: Partial<SalaryPayment>) => {
        const user_id = getCurrentUserId();
        const paymentWithUser = { ...payment, user_id };
        await salaryPaymentsApi.update(id, paymentWithUser);
    };

    const deleteSalaryPayment = async (id: number) => {
        await salaryPaymentsApi.delete(id);
    };

    return (
        <DataContext.Provider value={{
            expenses,
            sales,
            staff,
            supplierPayments,
            salaryPayments,
            dashboardStats,
            isLoading,
            isServerOnline,
            refreshExpenses,
            refreshSales,
            refreshStaff,
            refreshSupplierPayments,
            refreshSalaryPayments,
            refreshDashboard,
            refreshAll,
            addExpense,
            updateExpense,
            deleteExpense,
            addSale,
            updateSale,
            deleteSale,
            addStaff,
            updateStaff,
            deleteStaff,
            addSupplierPayment,
            updateSupplierPayment,
            deleteSupplierPayment,
            addSalaryPayment,
            updateSalaryPayment,
            deleteSalaryPayment,
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
