import React, { createContext, useContext, useMemo } from 'react';
import { useData } from './DataContext';

interface SuggestionContextType {
    suppliers: string[];
    agencies: string[];
    staffNames: string[];
    categories: string[];
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

export const SuggestionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { sales, expenses, supplierPayments, salaryPayments, staff } = useData();

    const suggestions = useMemo(() => {
        // Extract unique suppliers from all sources
        const supplierSet = new Set<string>();

        sales.forEach(s => {
            if (s.supplier) supplierSet.add(s.supplier.trim());
            if (s.bus_supplier) supplierSet.add(s.bus_supplier.trim());
            if (s.visa_supplier) supplierSet.add(s.visa_supplier.trim());
            if (s.ticket_supplier) supplierSet.add(s.ticket_supplier.trim());
        });
        supplierPayments.forEach(sp => sp.supplier_name && supplierSet.add(sp.supplier_name.trim()));

        const suppliers = Array.from(supplierSet).filter(Boolean).sort();

        // Extract unique agencies from sales
        const agencySet = new Set<string>();
        sales.forEach(s => s.agency && agencySet.add(s.agency.trim()));
        const agencies = Array.from(agencySet).filter(Boolean).sort();

        // Extract staff names
        const staffNameSet = new Set<string>();
        staff.forEach(s => s.name && staffNameSet.add(s.name.trim()));
        salaryPayments.forEach(sp => sp.staff_name && staffNameSet.add(sp.staff_name.trim()));
        const staffNames = Array.from(staffNameSet).filter(Boolean).sort();

        // Extract categories from expenses
        const categorySet = new Set<string>();
        expenses.forEach(e => e.category && categorySet.add(e.category.trim()));
        const categories = Array.from(categorySet).filter(Boolean).sort();

        return {
            suppliers,
            agencies,
            staffNames,
            categories
        };
    }, [sales, expenses, supplierPayments, salaryPayments, staff]);

    return (
        <SuggestionContext.Provider value={suggestions}>
            {children}
        </SuggestionContext.Provider>
    );
};

export const useSuggestions = () => {
    const context = useContext(SuggestionContext);
    if (context === undefined) {
        throw new Error('useSuggestions must be used within a SuggestionProvider');
    }
    return context;
};
