import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, UserPlus, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

interface OrganizationSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type Member = {
    user_id: string;
    role: 'owner' | 'admin' | 'member';
    profiles?: {
        display_name: string | null;
        email?: string; // Not usually available in profiles unless public
    };
};

export const OrganizationSettingsModal: React.FC<OrganizationSettingsModalProps> = ({
    open,
    onOpenChange,
}) => {
    const { currentOrganization, addMember, removeMember } = useOrganization();
    const [members, setMembers] = useState<Member[]>([]);
    const [newMemberId, setNewMemberId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchMembers = useCallback(async () => {
        if (!currentOrganization) return;
        try {
            const { data, error } = await supabase
                .from('organization_members')
                .select(`
          user_id,
          role,
          profiles:user_id (
            display_name
          )
        `)
                .eq('organization_id', currentOrganization.id);

            if (error) throw error;
            setMembers(data as unknown as Member[]);
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    }, [currentOrganization]);

    useEffect(() => {
        if (open && currentOrganization) {
            fetchMembers();
        }
    }, [open, currentOrganization, fetchMembers]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemberId) return;

        setIsLoading(true);
        try {
            await addMember(newMemberId);
            setNewMemberId('');
            fetchMembers();
        } catch (error) {
            // Error handled in context
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return;
        try {
            await removeMember(userId);
            fetchMembers();
        } catch (error) {
            // Error handled in context
        }
    };

    if (!currentOrganization) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Organization Settings</DialogTitle>
                    <DialogDescription>
                        Manage members for {currentOrganization.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Add Member</h4>
                        <form onSubmit={handleAddMember} className="flex gap-2">
                            <div className="flex-1">
                                <Label htmlFor="user-id" className="sr-only">User ID</Label>
                                <Input
                                    id="user-id"
                                    placeholder="Enter User ID to add..."
                                    value={newMemberId}
                                    onChange={(e) => setNewMemberId(e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={isLoading}>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add
                            </Button>
                        </form>
                        <p className="text-xs text-muted-foreground">
                            Ask the user for their User ID (found in their profile/dashboard).
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Members ({members.length})</h4>
                        <div className="border rounded-lg divide-y">
                            {members.map((member) => (
                                <div key={member.user_id} className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-full">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">
                                                {member.profiles?.display_name || 'Unknown User'}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {member.user_id}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${member.role === 'owner' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {member.role}
                                        </span>
                                        {member.role !== 'owner' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive/90"
                                                onClick={() => handleRemoveMember(member.user_id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
