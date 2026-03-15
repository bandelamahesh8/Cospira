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
import { useOrganization } from '@/contexts/useOrganization';
import { OrganizationService } from '@/services/OrganizationService';
import { supabase } from '@/integrations/supabase/client';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Trash2, UserPlus, User, ShieldCheck, XCircle, Settings, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { copyToClipboard } from '@/utils/clipboard';
// ... (lines 17-18)
// ...

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  OrganizationRole,
  OrganizationInvite,
  Permission,
  Team,
  OrganizationUser,
  TeamMember,
} from '@/types/organization';
import { toast } from 'sonner';

interface OrganizationSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OrganizationSettingsModal: React.FC<OrganizationSettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { currentOrganization, removeMember } = useOrganization();
  const { updateRoomSettings, autoApprove, stopJoiningTime: currentStopJoiningTime } = useWebSocket();

  // Data State
  const [members, setMembers] = useState<OrganizationUser[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [roles, setRoles] = useState<OrganizationRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState('members');
  const [isLoading, setIsLoading] = useState(false);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  // Role Management State
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<OrganizationRole | null>(null);
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, string[]>>({}); // roleId -> permissionIds[]
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePriority, setNewRolePriority] = useState([50]); // Default slider

  // Team Management State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMember[]>([]); // Detailed members
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [addMemberToTeamId, setAddMemberToTeamId] = useState(''); // Member ID to add

  // Danger Zone State
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Global Settings State
  const [autoApproveParticipants, setAutoApproveParticipants] = useState(false);
  const [stopJoiningTime, setStopJoiningTime] = useState<number>(0); // minutes until close
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentOrganization) return;
    setIsLoading(true);
    try {
      // 1. Members (Use Secure RPC to bypass RLS recursion limits)
      const { data: membersData, error: membersError } = await (
        supabase as unknown as {
          rpc: (name: string, args: object) => Promise<{ data: unknown; error: unknown }>;
        }
      ).rpc('get_organization_members_secure', {
        p_org_id: currentOrganization.id,
      });

      if (membersError) throw membersError;

      // RPC returns flattened structure, map correctly to UI state
      if (Array.isArray(membersData)) {
        setMembers(
          (membersData.map((m: unknown) => {
            const member = m as {
              user_id: string;
              role_id: string;
              status: string;
              joined_at: string;
              organization_roles?: { name: string };
              profiles?: Record<string, unknown>;
            };
            return {
              user_id: member.user_id,
              role_id: member.role_id,
              status: member.status,
              joined_at: member.joined_at,
              role_name: member.organization_roles?.name || 'Unknown',
              role: member.organization_roles,
              profiles: member.profiles,
              user: {
                id: member.user_id,
                ...(member.profiles || {}),
              },
            };
          }) as unknown as OrganizationUser[]) || []
        );
      } else {
        setMembers([]);
      }

      // 2. Invites
      setInvites(await OrganizationService.getPendingInvites(currentOrganization.id));

      // 3. Roles
      const rolesData = await OrganizationService.getRoles(currentOrganization.id);
      // Sort by priority (asc means higher power usually, so Owner=0 is top)
      setRoles(rolesData.sort((a, b) => a.priority - b.priority));

      if (rolesData.length > 0 && !selectedRoleId) {
        const memberRole = rolesData.find((r) => r.name === 'Member');
        setSelectedRoleId(memberRole ? memberRole.id : rolesData[0].id);
      }

      // 4. Permissions (Master List)
      const allPerms = await OrganizationService.getAllPermissions(); // Service handles sorting
      setPermissions(allPerms);

      // 5. Role Permissions (Pivot)
      const { data: rpData } = await supabase
        .from('role_permissions')
        .select('role_id, permission_id')
        .in(
          'role_id',
          rolesData.map((r) => r.id)
        );

      const map: Record<string, string[]> = {};
      rolesData.forEach((r) => (map[r.id] = []));
      rpData?.forEach((rp) => {
        if (map[rp.role_id]) map[rp.role_id].push(rp.permission_id);
      });
      setRolePermissionsMap(map);

      // 6. Teams (Phase 6)
      const teamsData = await OrganizationService.getTeams(currentOrganization.id);
      setTeams(teamsData);
    } catch {
      toast.error('Failed to load organization data');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization, selectedRoleId]);

  // Fetch team members when a team is selected
  useEffect(() => {
    if (selectedTeam) {
      OrganizationService.getTeamMembers(selectedTeam.id).then(setSelectedTeamMembers);
    } else {
      setSelectedTeamMembers([]);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (open && currentOrganization) {
      fetchData();
      setAutoApproveParticipants(autoApprove || false);
      setStopJoiningTime(currentStopJoiningTime || 0);
    }
  }, [open, currentOrganization, fetchData, autoApprove, currentStopJoiningTime]);

  // --- Actions ---

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !selectedRoleId || !currentOrganization) return;
    if (!inviteEmail.includes('@')) {
      toast.error('Invalid email');
      return;
    }

    try {
      setIsLoading(true);
      const token = await OrganizationService.inviteMember(
        currentOrganization.id,
        inviteEmail,
        selectedRoleId
      );

      // Clipboard Copy for Phase 2
      const inviteLink = `${window.location.origin}/join?token=${token}`;
      const success = await copyToClipboard(inviteLink);
      if (success) {
        toast.success(`Invitation generated! Link copied to clipboard.`);
      }

      setInviteEmail('');
      fetchData();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to send invite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      await OrganizationService.revokeInvite(inviteId);
      toast.success('Invitation revoked');
      fetchData();
    } catch {
      toast.error('Failed to revoke');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member?')) return;
    try {
      await removeMember(userId);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName || !currentOrganization) return;
    try {
      setIsLoading(true);
      await OrganizationService.createRole(currentOrganization.id, newRoleName, newRolePriority[0]);
      toast.success('Role created successfully');
      setNewRoleName('');
      setIsCreatingRole(false);
      fetchData();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to create role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    try {
      await OrganizationService.deleteRole(roleId);
      toast.success('Role deleted');
      fetchData();
      if (selectedRoleForEdit?.id === roleId) setSelectedRoleForEdit(null);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to delete role');
    }
  };

  const handlePermissionToggle = async (roleId: string, permId: string, isChecked: boolean) => {
    // Optimistic UI
    const currentPerms = rolePermissionsMap[roleId] || [];
    const newPerms = isChecked
      ? [...currentPerms, permId]
      : currentPerms.filter((id) => id !== permId);

    setRolePermissionsMap((prev) => ({ ...prev, [roleId]: newPerms }));

    try {
      await OrganizationService.updateRolePermissions(roleId, newPerms);
    } catch {
      toast.error('Failed to update permission');
      // Revert on error
      setRolePermissionsMap((prev) => ({ ...prev, [roleId]: currentPerms }));
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName || !currentOrganization) return;
    try {
      setIsLoading(true);
      const team = await OrganizationService.createTeam(currentOrganization.id, newTeamName);
      toast.success('Team created');
      setNewTeamName('');
      setIsCreatingTeam(false);
      setTeams((prev) => [...prev, { ...team, members_count: 0 }]); // Optimistic add
      fetchData(); // Refresh to be safe
    } catch {
      toast.error('Failed to create team');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTeamMember = async () => {
    if (!selectedTeam || !addMemberToTeamId) return;
    try {
      await OrganizationService.addTeamMember(selectedTeam.id, addMemberToTeamId);
      toast.success('Member added to team');
      // Refresh detailed list
      const updatedMembers = await OrganizationService.getTeamMembers(selectedTeam.id);
      setSelectedTeamMembers(updatedMembers);
      // Refresh counts
      fetchData();
    } catch {
      toast.error('Failed to add member');
    }
  };

  const handleRemoveTeamMember = async (userId: string) => {
    if (!selectedTeam) return;
    try {
      await OrganizationService.removeTeamMember(selectedTeam.id, userId);
      toast.success('Member removed from team');
      const updatedMembers = await OrganizationService.getTeamMembers(selectedTeam.id);
      setSelectedTeamMembers(updatedMembers);
      fetchData();
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      updateRoomSettings(
        undefined,
        undefined,
        undefined,
        undefined,
        autoApproveParticipants,
        stopJoiningTime
      );
      toast.success('Organization room settings updated successfully!');
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (!currentOrganization) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[800px] bg-[#0c1016] border border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[700px] flex flex-col'>
        <div className='p-8 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent shrink-0'>
          <DialogHeader>
            <div className='flex items-center gap-4 mb-2'>
              <div className='w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center'>
                <ShieldCheck className='w-6 h-6 text-indigo-400' />
              </div>
              <div>
                <DialogTitle className='text-2xl font-black uppercase tracking-tighter text-white'>
                  {currentOrganization.name}
                </DialogTitle>
                <DialogDescription className='text-white/40 font-medium text-xs font-mono uppercase tracking-widest'>
                  Organization Management
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className='flex-1 overflow-hidden flex flex-col'>
          <Tabs
            defaultValue='members'
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex-1 flex flex-col'
          >
            <div className='px-8 pt-6'>
              <TabsList className='bg-white/5 border border-white/5 rounded-xl p-1 w-full h-auto'>
                <TabsTrigger
                  value='members'
                  className='flex-1 h-10 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all'
                >
                  Members
                </TabsTrigger>
                <TabsTrigger
                  value='invites'
                  className='flex-1 h-10 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all'
                >
                  Invites
                </TabsTrigger>
                <TabsTrigger
                  value='roles'
                  className='flex-1 h-10 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all'
                >
                  Roles & Permissions
                </TabsTrigger>
                <TabsTrigger
                  value='teams'
                  className='flex-1 h-10 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all'
                >
                  Teams
                </TabsTrigger>
                <TabsTrigger
                  value='settings'
                  className='flex-1 h-10 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all'
                >
                  Settings
                </TabsTrigger>
                {currentOrganization?.owner_id ===
                  (supabase as unknown as { auth?: { user?: { id: string } } }).auth?.user?.id && (
                  <TabsTrigger
                    value='danger'
                    className='flex-1 h-10 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-red-500 data-[state=active]:text-white transition-all'
                  >
                    Danger Zone
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* MEMBERS TAB */}
            <TabsContent
              value='members'
              className='flex-1 overflow-hidden p-0 m-0 data-[state=active]:flex flex-col'
            >
              <div className='p-8 overflow-y-auto custom-scrollbar flex-1'>
                <div className='space-y-2'>
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className='flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl'
                    >
                      <div className='flex items-center gap-4'>
                        <div className='w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40'>
                          <User className='w-5 h-5' />
                        </div>
                        <div>
                          <p className='font-bold text-sm text-white'>
                            {member.profiles?.display_name || 'Unknown'}
                          </p>
                          <p className='text-[10px] text-white/30 font-mono'>
                            ID: {member.user_id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center gap-3'>
                        <span className='text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-white/10 text-white/50'>
                          {member.role_name}
                        </span>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-white/20 hover:text-red-400'
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* INVITES TAB */}
            <TabsContent
              value='invites'
              className='flex-1 overflow-hidden p-0 m-0 data-[state=active]:flex flex-col'
            >
              <div className='p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8'>
                <div className='space-y-4 bg-white/[0.02] border border-white/5 p-6 rounded-3xl'>
                  <Label className='text-[10px] font-black uppercase tracking-widest text-indigo-400 pl-1 flex items-center gap-2'>
                    <UserPlus className='w-3 h-3' /> Execute Invitation
                  </Label>
                  <form onSubmit={handleInvite} className='gap-3 flex flex-col md:flex-row'>
                    <div className='flex-1 space-y-2'>
                      <Input
                        placeholder='agent@example.com'
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className='h-12 bg-white/5 border-white/10 rounded-xl text-white focus:border-indigo-500/50'
                      />
                    </div>
                    <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                      <SelectTrigger className='w-[180px] h-12 bg-white/5 border-white/10 rounded-xl text-white'>
                        <SelectValue placeholder='Select Role' />
                      </SelectTrigger>
                      <SelectContent className='bg-[#1a1d24] border-white/10 text-white'>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type='submit'
                      disabled={isLoading || !inviteEmail}
                      className='h-12 px-6 bg-white text-black hover:bg-indigo-50 rounded-xl font-bold uppercase tracking-widest text-[10px]'
                    >
                      {isLoading ? 'Sending...' : 'Invite'}
                    </Button>
                  </form>
                </div>
                <div className='space-y-2'>
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className='flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl'
                    >
                      <div>
                        <p className='font-bold text-sm text-white'>{invite.email}</p>

                        <span className='text-[9px] bg-white/5 text-white/50 px-1.5 py-0.5 rounded uppercase font-bold'>
                          {(invite as unknown as { role?: { name: string } }).role?.name ||
                            'Unknown'}
                        </span>
                      </div>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleRevoke(invite.id)}
                        className='text-red-400 hover:text-red-300'
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ROLES TAB (Enterprise Matrix) */}
            <TabsContent
              value='roles'
              className='flex-1 overflow-hidden p-0 m-0 data-[state=active]:flex'
            >
              {/* ... Content of roles tab stays same ... */}
              <div className='flex w-full h-full'>
                {/* Left: Roles List */}
                <div className='w-1/3 border-r border-white/5 p-6 flex flex-col gap-4 overflow-y-auto'>
                  <div className='flex items-center justify-between'>
                    <h4 className='text-[10px] font-black uppercase tracking-widest text-white/40'>
                      Roles
                    </h4>
                    <Button
                      onClick={() => setIsCreatingRole(!isCreatingRole)}
                      size='sm'
                      variant='ghost'
                      className='h-6 w-6 p-0 rounded-full bg-white/10 hover:bg-white/20'
                    >
                      <UserPlus className='w-3 h-3 text-white' />
                    </Button>
                  </div>

                  {isCreatingRole && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className='space-y-3 bg-white/5 p-4 rounded-xl border border-white/10'
                    >
                      <Input
                        placeholder='Role Name'
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        className='h-8 text-xs bg-black/50 border-white/10'
                      />
                      <div className='space-y-2'>
                        <div className='flex justify-between text-[10px] text-white/40 uppercase'>
                          <span>Priority</span>
                          <span>{newRolePriority}</span>
                        </div>
                        <Slider
                          value={newRolePriority}
                          onValueChange={setNewRolePriority}
                          min={10}
                          max={90}
                          step={5}
                          className='py-1'
                        />
                      </div>
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          onClick={handleCreateRole}
                          disabled={isLoading}
                          className='flex-1 h-7 text-[10px] bg-indigo-500 hover:bg-indigo-600'
                        >
                          Create
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => setIsCreatingRole(false)}
                          className='h-7 w-7 p-0'
                        >
                          <XCircle className='w-4 h-4' />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  <div className='space-y-1'>
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        onClick={() => setSelectedRoleForEdit(role)}
                        className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                          selectedRoleForEdit?.id === role.id
                            ? 'bg-indigo-500/20 border-indigo-500/50'
                            : 'bg-transparent border-transparent hover:bg-white/5'
                        }`}
                      >
                        <div className='flex items-center gap-3'>
                          {role.is_system_role ? (
                            <Lock className='w-3 h-3 text-white/30' />
                          ) : (
                            <Settings className='w-3 h-3 text-white/30' />
                          )}
                          <div>
                            <p
                              className={`text-sm font-bold ${selectedRoleForEdit?.id === role.id ? 'text-indigo-300' : 'text-white'}`}
                            >
                              {role.name}
                            </p>
                            <p className='text-[9px] text-white/30 font-mono'>P-{role.priority}</p>
                          </div>
                        </div>
                        {!role.is_system_role && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-6 w-6 text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role.id);
                            }}
                          >
                            <Trash2 className='w-3 h-3' />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Permission Matrix */}
                <div className='flex-1 p-6 bg-[#080a0e] overflow-y-auto'>
                  {selectedRoleForEdit ? (
                    <div className='space-y-6'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <h3 className='text-lg font-bold text-white flex items-center gap-2'>
                            {selectedRoleForEdit.name}
                            <span className='text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded font-mono'>
                              {selectedRoleForEdit.is_system_role ? 'System' : 'Custom'}
                            </span>
                          </h3>
                          <p className='text-xs text-white/30'>
                            {selectedRoleForEdit.is_system_role
                              ? 'Core permissions logic is protected.'
                              : 'Configure granular access logic.'}
                          </p>
                        </div>
                      </div>

                      <div className='grid grid-cols-1 gap-1'>
                        {permissions.map((perm) => {
                          const isAssigned = (
                            rolePermissionsMap[selectedRoleForEdit.id] || []
                          ).includes(perm.id);
                          const isLocked = selectedRoleForEdit.is_editable === false;

                          return (
                            <div
                              key={perm.id}
                              className='flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/5 transition-colors'
                            >
                              <div>
                                <p className='text-xs font-bold text-white/80'>{perm.key}</p>
                                <p className='text-[10px] text-white/30'>{perm.description}</p>
                              </div>
                              <Checkbox
                                checked={isAssigned}
                                disabled={isLocked || isLoading}
                                onCheckedChange={(checked) =>
                                  handlePermissionToggle(
                                    selectedRoleForEdit.id,
                                    perm.id,
                                    checked as boolean
                                  )
                                }
                                className='border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500'
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className='h-full flex flex-col items-center justify-center text-white/20 text-xs uppercase tracking-widest text-center'>
                      <Settings className='w-8 h-8 mb-4 opacity-50' />
                      Select a role to configure permissions
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TEAMS TAB (Enterprise Resource) */}
            <TabsContent
              value='teams'
              className='flex-1 overflow-hidden p-0 m-0 data-[state=active]:flex'
            >
              <div className='flex w-full h-full'>
                {/* Left: Teams List */}
                <div className='w-1/3 border-r border-white/5 p-6 flex flex-col gap-4 overflow-y-auto'>
                  <div className='flex items-center justify-between'>
                    <h4 className='text-[10px] font-black uppercase tracking-widest text-white/40'>
                      Teams
                    </h4>
                    <Button
                      onClick={() => setIsCreatingTeam(!isCreatingTeam)}
                      size='sm'
                      variant='ghost'
                      className='h-6 w-6 p-0 rounded-full bg-white/10 hover:bg-white/20'
                    >
                      <UserPlus className='w-3 h-3 text-white' />
                    </Button>
                  </div>

                  {isCreatingTeam && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className='space-y-3 bg-white/5 p-4 rounded-xl border border-white/10'
                    >
                      <Input
                        placeholder='Team Name'
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className='h-8 text-xs bg-black/50 border-white/10'
                        autoFocus
                      />
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          onClick={handleCreateTeam}
                          disabled={isLoading || !newTeamName}
                          className='flex-1 h-7 text-[10px] bg-indigo-500 hover:bg-indigo-600'
                        >
                          Create
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => setIsCreatingTeam(false)}
                          className='h-7 w-7 p-0'
                        >
                          <XCircle className='w-4 h-4' />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  <div className='space-y-1'>
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        onClick={() => setSelectedTeam(team)}
                        className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                          selectedTeam?.id === team.id
                            ? 'bg-indigo-500/20 border-indigo-500/50'
                            : 'bg-transparent border-transparent hover:bg-white/5'
                        }`}
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${selectedTeam?.id === team.id ? 'bg-indigo-500/50 text-white' : 'bg-white/5 text-white/50'}`}
                          >
                            {team.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p
                              className={`text-sm font-bold ${selectedTeam?.id === team.id ? 'text-indigo-300' : 'text-white'}`}
                            >
                              {team.name}
                            </p>
                            <p className='text-[9px] text-white/30 font-mono'>
                              {team.members_count} Members
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {teams.length === 0 && !isCreatingTeam && (
                      <div className='text-center p-4 text-[10px] text-white/30 italic'>
                        No teams yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Team Details */}
                <div className='flex-1 p-6 bg-[#080a0e] overflow-y-auto'>
                  {selectedTeam ? (
                    <div className='space-y-8'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <h3 className='text-xl font-bold text-white mb-1'>{selectedTeam.name}</h3>
                          <p className='text-xs text-white/40'>Manage members and scope access.</p>
                        </div>
                      </div>

                      <div className='bg-white/[0.02] border border-white/5 rounded-2xl p-6'>
                        <div className='flex items-center gap-2 mb-4'>
                          <Label className='text-[10px] font-black uppercase tracking-widest text-indigo-400'>
                            Add Member
                          </Label>
                        </div>
                        <div className='flex gap-2'>
                          <Select value={addMemberToTeamId} onValueChange={setAddMemberToTeamId}>
                            <SelectTrigger className='flex-1 h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs'>
                              <SelectValue placeholder='Select User to Add' />
                            </SelectTrigger>
                            <SelectContent className='bg-[#1a1d24] border-white/10 text-white'>
                              {members
                                .filter(
                                  (m) => !selectedTeamMembers.find((tm) => tm.user_id === m.user_id)
                                )
                                .map((m) => (
                                  <SelectItem key={m.user_id} value={m.user_id}>
                                    {m.profiles?.display_name || m.user_id.slice(0, 8)} (
                                    {m.profiles?.email || 'No Email'})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleAddTeamMember}
                            disabled={!addMemberToTeamId}
                            className='h-10 bg-white text-black hover:bg-indigo-50 rounded-xl text-xs font-bold uppercase tracking-wider'
                          >
                            Add
                          </Button>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <h4 className='text-[10px] font-black uppercase tracking-widest text-white/30 pl-1'>
                          Team Members
                        </h4>
                        {selectedTeamMembers.length === 0 ? (
                          <div className='p-4 text-center text-xs text-white/20 border border-dashed border-white/5 rounded-xl'>
                            No members in this team.
                          </div>
                        ) : (
                          selectedTeamMembers.map((tm) => (
                            <div
                              key={tm.user_id}
                              className='flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5'
                            >
                              <div className='flex items-center gap-3'>
                                <div className='w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xs font-bold'>
                                  {tm.user?.display_name?.slice(0, 1) || '?'}
                                </div>
                                <div>
                                  <p className='text-sm font-bold text-white'>
                                    {tm.user?.display_name || 'Unknown'}
                                  </p>
                                  <p className='text-[10px] text-white/30'>{tm.user?.email}</p>
                                </div>
                              </div>
                              <Button
                                variant='ghost'
                                size='icon'
                                onClick={() => handleRemoveTeamMember(tm.user_id)}
                                className='h-8 w-8 text-white/10 hover:text-red-400'
                              >
                                <Trash2 className='w-4 h-4' />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className='h-full flex flex-col items-center justify-center text-white/20 text-xs uppercase tracking-widest text-center'>
                      <ShieldCheck className='w-12 h-12 mb-4 opacity-50' />
                      Select a team to manage
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent
              value='settings'
              className='flex-1 overflow-hidden p-0 m-0 data-[state=active]:flex flex-col'
            >
              <div className='p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8'>
                <div className='space-y-6 max-w-2xl mx-auto'>
                  <div className='bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <h4 className='text-white font-bold mb-1'>Auto-Approve Participants</h4>
                        <p className='text-white/40 text-[10.5px]'>
                          When active, all external participants are automatically approved to join
                          sessions upon request without landing in the waiting lobby.
                        </p>
                      </div>
                      <Button
                        variant={autoApproveParticipants ? 'default' : 'outline'}
                        onClick={() => setAutoApproveParticipants(!autoApproveParticipants)}
                        className={`transition-all ${autoApproveParticipants ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent' : 'border-white/10 text-white/40 hover:text-white'}`}
                      >
                        {autoApproveParticipants ? 'Active' : 'Disabled'}
                      </Button>
                    </div>
                  </div>

                  <div className='bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6'>
                    <div>
                      <h4 className='text-white font-bold mb-1'>Stop Joining (Entry Closed)</h4>
                      <p className='text-white/40 text-[10.5px]'>
                        Automatically close the organization room to new participants after a set
                        time. Existing participants will not be affected.
                      </p>
                    </div>

                    <div className='flex flex-col gap-4'>
                      <div className='flex items-center gap-4'>
                        <div className='flex-1 space-y-2'>
                          <div className='flex justify-between text-[10px] text-white/40 uppercase font-black'>
                            <span>Close After</span>
                            <span className='text-indigo-400'>
                              {stopJoiningTime === 0 ? 'Never' : `${stopJoiningTime} Minutes`}
                            </span>
                          </div>
                          <Slider
                            value={[stopJoiningTime]}
                            onValueChange={(val) => setStopJoiningTime(val[0])}
                            min={0}
                            max={120}
                            step={5}
                            className='py-1'
                          />
                        </div>
                      </div>
                      <div className='flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5'>
                        <p className='text-[10px] uppercase font-bold text-white/30 tracking-widest flex items-center gap-2'>
                          <Lock className='w-3 h-3' /> Entry Lock Status
                        </p>
                        {stopJoiningTime > 0 ? (
                          <span className='text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border text-amber-400 bg-amber-500/10 border-amber-500/20'>
                            Closes implicitly
                          </span>
                        ) : (
                          <span className='text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border text-emerald-400 bg-emerald-500/10 border-emerald-500/20'>
                            Open
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-end pt-4'>
                    <Button
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className='bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8'
                    >
                      {isSavingSettings ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* DANGER ZONE TAB */}
            <TabsContent
              value='danger'
              className='flex-1 overflow-hidden p-0 m-0 data-[state=active]:flex flex-col'
            >
              <div className='p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8'>
                <div className='space-y-4 bg-red-500/5 border border-red-500/20 p-8 rounded-[32px]'>
                  <div className='flex items-center gap-4 mb-2'>
                    <div className='w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500'>
                      <Trash2 className='w-6 h-6' />
                    </div>
                    <div>
                      <h3 className='text-xl font-black uppercase tracking-tighter text-white'>
                        Delete Organization
                      </h3>
                      <p className='text-sm text-white/40 font-medium'>
                        This action is irreversible and will delete all associated data.
                      </p>
                    </div>
                  </div>

                  <div className='space-y-6 pt-4'>
                    <div className='space-y-2'>
                      <Label className='text-[10px] font-black uppercase tracking-widest text-red-400/60 pl-1'>
                        Confirm with Slug
                      </Label>
                      <p className='text-[10px] text-white/20 mb-2 italic'>
                        Type{' '}
                        <span className='text-white/60 font-bold'>{currentOrganization?.slug}</span>{' '}
                        to confirm.
                      </p>
                      <Input
                        placeholder='ENTER SLUG'
                        value={deleteConfirmSlug}
                        onChange={(e) => setDeleteConfirmSlug(e.target.value.toLowerCase())}
                        className='h-14 bg-black/40 border-red-500/20 text-white focus:border-red-500/50 rounded-2xl font-mono text-center tracking-[0.2em]'
                      />
                    </div>

                    <Button
                      variant='destructive'
                      disabled={deleteConfirmSlug !== currentOrganization?.slug || isDeleting}
                      onClick={async () => {
                        if (!currentOrganization) return;
                        setIsDeleting(true);
                        try {
                          await OrganizationService.deleteOrganization(currentOrganization.id);
                          toast.success('Organization decommissioned successfully');
                          onOpenChange(false);
                          // Context will handle the redirect/refresh
                          window.location.href = '/dashboard/organizations';
                        } catch (_error) {
                          toast.error('Decommissioning failed');
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                      className='w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs bg-red-600 hover:bg-red-500 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)]'
                    >
                      {isDeleting ? 'Processing...' : 'Decommission Sector'}
                    </Button>
                  </div>
                </div>

                <div className='p-6 border border-white/5 rounded-2xl bg-white/[0.01]'>
                  <h4 className='text-[10px] font-black uppercase tracking-widest text-white/40 mb-2'>
                    Protocol Note
                  </h4>
                  <p className='text-[10px] text-white/20 leading-relaxed font-medium'>
                    Hard deletion of data nodes across the distributed mesh may take up to 24 hours
                    to propagate fully. Encryption keys for this sector will be immediately revoked
                    upon confirmation.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
