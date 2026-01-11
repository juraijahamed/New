import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useData } from './DataContext';

interface SuggestionContextType {
    suppliers: string[];
    agencies: string[];
    staffNames: string[];
    categories: string[];
    addSupplier: (supplier: string) => void;
    addAgency: (agency: string) => void;
    addStaffName: (name: string) => void;
    addCategory: (category: string) => void;
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

// LocalStorage keys
const STORAGE_KEYS = {
    suppliers: 'hawk_suggestion_suppliers',
    agencies: 'hawk_suggestion_agencies',
    staffNames: 'hawk_suggestion_staffNames',
    categories: 'hawk_suggestion_categories'
};

export const SuggestionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { sales, expenses, supplierPayments, salaryPayments, staff } = useData();
    
    // Custom suggestions stored in localStorage
    const [customSuppliers, setCustomSuppliers] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.suppliers);
            return new Set(stored ? JSON.parse(stored) : []);
        } catch {
            return new Set<string>();
        }
    });

    const [customAgencies, setCustomAgencies] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.agencies);
            return new Set(stored ? JSON.parse(stored) : []);
        } catch {
            return new Set<string>();
        }
    });

    const [customStaffNames, setCustomStaffNames] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.staffNames);
            return new Set(stored ? JSON.parse(stored) : []);
        } catch {
            return new Set<string>();
        }
    });

    const [customCategories, setCustomCategories] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.categories);
            return new Set(stored ? JSON.parse(stored) : []);
        } catch {
            return new Set<string>();
        }
    });

    // Persist custom suggestions to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(Array.from(customSuppliers)));
    }, [customSuppliers]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.agencies, JSON.stringify(Array.from(customAgencies)));
    }, [customAgencies]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.staffNames, JSON.stringify(Array.from(customStaffNames)));
    }, [customStaffNames]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(Array.from(customCategories)));
    }, [customCategories]);

    const suggestions = useMemo(() => {
        // Extract unique suppliers from all sources
        const supplierSet = new Set<string>(customSuppliers);

        sales.forEach(s => {
            if (s.supplier) supplierSet.add(s.supplier.trim());
            if (s.bus_supplier) supplierSet.add(s.bus_supplier.trim());
            if (s.visa_supplier) supplierSet.add(s.visa_supplier.trim());
            if (s.ticket_supplier) supplierSet.add(s.ticket_supplier.trim());
        });
        supplierPayments.forEach(sp => sp.supplier_name && supplierSet.add(sp.supplier_name.trim()));

        const suppliers = Array.from(supplierSet).filter(Boolean).sort();

        // Extract unique agencies from sales, combined with custom agencies
        const agencySet = new Set<string>(customAgencies);
        sales.forEach(s => s.agency && agencySet.add(s.agency.trim()));
        const agencies = Array.from(agencySet).filter(Boolean).sort();

        // Extract staff names
        const staffNameSet = new Set<string>(customStaffNames);
        staff.forEach(s => s.name && staffNameSet.add(s.name.trim()));
        salaryPayments.forEach(sp => sp.staff_name && staffNameSet.add(sp.staff_name.trim()));
        const staffNames = Array.from(staffNameSet).filter(Boolean).sort();

        // Extract categories from expenses
        const categorySet = new Set<string>(customCategories);
        expenses.forEach(e => e.category && categorySet.add(e.category.trim()));
        const categories = Array.from(categorySet).filter(Boolean).sort();

        return {
            suppliers,
            agencies,
            staffNames,
            categories,
            addSupplier: (supplier: string) => {
                if (supplier.trim()) {
                    setCustomSuppliers(prev => new Set([...prev, supplier.trim()]));
                }
            },
            addAgency: (agency: string) => {
                if (agency.trim()) {
                    setCustomAgencies(prev => new Set([...prev, agency.trim()]));
                }
            },
            addStaffName: (name: string) => {
                if (name.trim()) {
                    setCustomStaffNames(prev => new Set([...prev, name.trim()]));
                }
            },
            addCategory: (category: string) => {
                if (category.trim()) {
                    setCustomCategories(prev => new Set([...prev, category.trim()]));
                }
            }
        };
    }, [sales, expenses, supplierPayments, salaryPayments, staff, customSuppliers, customAgencies, customStaffNames, customCategories]);

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
