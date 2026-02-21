import React, { createContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Organization, PermissionKey } from '@/types/organization';
import { OrganizationService } from '@/services/OrganizationService';

type OrganizationContextType = {
    organizations: Organization[];
    currentOrganization: Organization | null;
    setCurrentOrganization: (org: Organization | null) => void;
    isLoading: boolean;
    createOrganization: (name: string, slug: string) => Promise<void>;
    refreshOrganizations: () => Promise<void>;
    // RBAC Capability Check
    hasPermission: (key: PermissionKey) => boolean;
    // Legacy support (to be deprecated in Phase 2)
    addMember: (userId: string, role?: 'admin' | 'member') => Promise<void>; 
    removeMember: (userId: string) => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrganizations = useCallback(async () => {
        if (!user) {
            setOrganizations([]);
            setCurrentOrganization(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const orgs = await OrganizationService.getMyOrganizations();
            setOrganizations(orgs);

            // Restore selected org logic
            const savedOrgId = localStorage.getItem('selectedOrgId');
            if (savedOrgId) {
                const savedOrg = orgs.find((o) => o.id === savedOrgId);
                if (savedOrg) setCurrentOrganization(savedOrg);
                else if (orgs.length > 0) setCurrentOrganization(orgs[0]);
            } else if (orgs.length > 0) {
                setCurrentOrganization(orgs[0]);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching organizations:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
             // Silent fail for expected "no orgs" cases to avoid UI clutter
            if (!errorMessage.includes('permission') && !errorMessage.includes('PGRST116')) {
                 // toast.error('Failed to load organization data'); // Spammy
                 console.warn('Failed to load organization data (silenced):', error);
            }
            setOrganizations([]);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchOrganizations();
    }, [fetchOrganizations]);

    useEffect(() => {
        if (currentOrganization) {
            localStorage.setItem('selectedOrgId', currentOrganization.id);
        } else {
            localStorage.removeItem('selectedOrgId');
        }
    }, [currentOrganization]);

    const hasPermission = useCallback((key: PermissionKey): boolean => {
        if (!currentOrganization) return false;
        return OrganizationService.hasPermission(currentOrganization, key);
    }, [currentOrganization]);

    const createOrganization = async (name: string, slug: string) => {
        try {
            const newOrg = await OrganizationService.createOrganization(name, slug);
            toast.success('Organization created successfully');
            
            // Auto-select the new organization
            // We set the preference before fetching so the fetcher picks it up
            localStorage.setItem('selectedOrgId', newOrg.id);
            
            await fetchOrganizations();
        } catch (error: any) {
             // eslint-disable-next-line no-console
            console.error('Error creating org:', error);
            if (error.code === '23505') {
                toast.error('Organization ID already exists', { description: 'Please choose a different slug.' });
            } else {
                toast.error('Failed to create organization');
            }
            throw error;
        }
    };

    // --- LEGACY METHODS (To be replaced by specialized Service calls in Phase 2) ---
    // Kept to prevent breaking existing UI components that use these directly
    const addMember = async (_userId: string, _role: 'admin' | 'member' = 'member') => {
        if (!currentOrganization) return;
        // In Phase 1, we should warn or redirect to new Invite System
        // For now, we stub or use direct Supabase calls if urgent, but per plan this is legacy.
        toast.info('Legacy addMember called. Please use the new Invite System (Coming in Phase 2).');
    };

    const removeMember = async (_userId: string) => {
         if (!currentOrganization) return;
         // Check permission first!
         if (!hasPermission('MEMBER_REMOVE')) {
             toast.error('Permission Denied', { description: 'You do not have rights to remove members.' });
             return;
         }
         toast.info('Member removal logic moving to Service...');
    };

    return (
        <OrganizationContext.Provider
            value={{
                organizations,
                currentOrganization,
                setCurrentOrganization,
                isLoading,
                createOrganization,
                refreshOrganizations: fetchOrganizations,
                hasPermission,
                addMember,
                removeMember,
            }}
        >
            {children}
        </OrganizationContext.Provider>
    );
};

export default OrganizationContext;
