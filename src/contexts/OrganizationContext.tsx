import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Moved Organization type to a separate file or just keep it here if we accept the warning for now, 
// but to fix the warning we should probably move it. 
// However, for now I will just fix the 'any' errors.
export type Organization = {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    created_at: string;
    role?: 'owner' | 'admin' | 'member';
};

type OrganizationContextType = {
    organizations: Organization[];
    currentOrganization: Organization | null;
    setCurrentOrganization: (org: Organization | null) => void;
    isLoading: boolean;
    createOrganization: (name: string, slug: string) => Promise<void>;
    refreshOrganizations: () => Promise<void>;
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
            const { data, error } = await supabase
                .from('organizations')
                .select(`
          *,
          organization_members!inner (
            role
          )
        `)
                .eq('organization_members.user_id', user.id);

            if (error) throw error;

            const orgs = (data as unknown[]).map((org: unknown) => {
                const o = org as Organization & { organization_members: { role: 'owner' | 'admin' | 'member' }[] };
                return {
                    ...o,
                    role: o.organization_members[0]?.role,
                };
            });

            setOrganizations(orgs);

            // Restore selected org from local storage or default to first
            const savedOrgId = localStorage.getItem('selectedOrgId');
            if (savedOrgId) {
                const savedOrg = orgs.find((o: Organization) => o.id === savedOrgId);
                if (savedOrg) setCurrentOrganization(savedOrg);
                else if (orgs.length > 0) setCurrentOrganization(orgs[0]);
            } else if (orgs.length > 0) {
                setCurrentOrganization(orgs[0]);
            }
        } catch (error) {
            console.error('Error fetching organizations:', error);
            toast.error('Failed to load organizations');
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

    const createOrganization = async (name: string, slug: string) => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('organizations')
                .insert({
                    name,
                    slug,
                    owner_id: user.id,
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Organization created successfully');
            await fetchOrganizations();
            setCurrentOrganization({ ...data, role: 'owner' }); // Optimistic update
        } catch (error: unknown) {
            console.error('Error creating organization:', error);
            if ((error as { code?: string }).code === '23505') { // Unique violation
                toast.error('Organization slug already exists');
            } else {
                toast.error('Failed to create organization');
            }
            throw error;
        }
    };

    const addMember = async (userId: string, role: 'admin' | 'member' = 'member') => {
        if (!currentOrganization) return;
        try {
            const { error } = await supabase
                .from('organization_members')
                .insert({
                    organization_id: currentOrganization.id,
                    user_id: userId,
                    role,
                });

            if (error) throw error;
            toast.success('Member added successfully');
            await fetchOrganizations();
        } catch (error) {
            console.error('Error adding member:', error);
            toast.error('Failed to add member');
            throw error;
        }
    };

    const removeMember = async (userId: string) => {
        if (!currentOrganization) return;
        try {
            const { error } = await supabase
                .from('organization_members')
                .delete()
                .eq('organization_id', currentOrganization.id)
                .eq('user_id', userId);

            if (error) throw error;
            toast.success('Member removed successfully');
            await fetchOrganizations();
        } catch (error) {
            console.error('Error removing member:', error);
            toast.error('Failed to remove member');
            throw error;
        }
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
                addMember,
                removeMember,
            }}
        >
            {children}
        </OrganizationContext.Provider>
    );
};

export const useOrganization = () => {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
};
