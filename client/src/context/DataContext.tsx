import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    expensesApi, salesApi, staffApi, supplierPaymentsApi, salaryPaymentsApi, dashboardApi, healthApi,
    type Expense, type Sale, type Staff, type SupplierPayment, type SalaryPayment, type DashboardStats
} from '../services/api';

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
            // If it's a connection error, we'll let the health check handle it
            const online = await healthApi.check();
            setIsServerOnline(online);
        } finally {
            setIsLoading(false);
        }
    }, [refreshExpenses, refreshSales, refreshStaff, refreshSupplierPayments, refreshSalaryPayments, refreshDashboard]);

    // Health Check Effect
    useEffect(() => {
        const checkHealth = async () => {
            const online = await healthApi.check();
            setIsServerOnline(online);
        };

        checkHealth();
        const interval = setInterval(checkHealth, 5000); // Check every 5 seconds
        return () => clearInterval(interval);
    }, []);

    // Auto-refresh when coming back online
    useEffect(() => {
        // If we just came online and haven't successfully refreshed in a while (e.g., 2 seconds)
        // or if we are online but have no data (lastSuccessfulRefresh === 0)
        if (isServerOnline && (Date.now() - lastSuccessfulRefresh > 2000)) {
            refreshAll();
        }
    }, [isServerOnline, refreshAll, lastSuccessfulRefresh]);

    // Initial load
    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    // CRUD Operations
    const addExpense = async (expense: Omit<Expense, 'id'>) => {
        const newExpense = await expensesApi.create(expense);
        await refreshExpenses();
        await refreshDashboard();
        return newExpense;
    };

    const updateExpense = async (id: number, expense: Partial<Expense>) => {
        await expensesApi.update(id, expense);
        await refreshExpenses();
        await refreshDashboard();
    };

    const deleteExpense = async (id: number) => {
        await expensesApi.delete(id);
        await refreshExpenses();
        await refreshDashboard();
    };

    const addSale = async (sale: Omit<Sale, 'id'>) => {
        const newSale = await salesApi.create(sale);
        await refreshSales();
        await refreshDashboard();
        return newSale;
    };

    const updateSale = async (id: number, sale: Partial<Sale>) => {
        await salesApi.update(id, sale);
        await refreshSales();
        await refreshDashboard();
    };

    const deleteSale = async (id: number) => {
        await salesApi.delete(id);
        await refreshSales();
        await refreshDashboard();
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
        const newPayment = await supplierPaymentsApi.create(payment);
        await refreshSupplierPayments();
        await refreshDashboard();
        return newPayment;
    };

    const updateSupplierPayment = async (id: number, payment: Partial<SupplierPayment>) => {
        await supplierPaymentsApi.update(id, payment);
        await refreshSupplierPayments();
        await refreshDashboard();
    };

    const deleteSupplierPayment = async (id: number) => {
        await supplierPaymentsApi.delete(id);
        await refreshSupplierPayments();
        await refreshDashboard();
    };

    const addSalaryPayment = async (payment: Omit<SalaryPayment, 'id'>) => {
        const newPayment = await salaryPaymentsApi.create(payment);
        await refreshSalaryPayments();
        await refreshDashboard();
        return newPayment;
    };

    const updateSalaryPayment = async (id: number, payment: Partial<SalaryPayment>) => {
        await salaryPaymentsApi.update(id, payment);
        await refreshSalaryPayments();
        await refreshDashboard();
    };

    const deleteSalaryPayment = async (id: number) => {
        await salaryPaymentsApi.delete(id);
        await refreshSalaryPayments();
        await refreshDashboard();
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
