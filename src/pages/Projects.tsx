import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganization } from '@/contexts/useOrganization';
import { OrganizationService } from '@/services/OrganizationService';
import { Project } from '@/types/organization';
import { 
    Folder, 
    Plus, 
    Search, 
    Users, 
    ShieldCheck, 
    MoreHorizontal, 
    Trash2,
    Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/Navbar';
import { toast } from 'sonner';

const ProjectsPage = () => {
    const navigate = useNavigate();
    const { currentOrganization, isLoading: isOrgLoading } = useOrganization();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const fetchProjects = async () => {
        if (!currentOrganization) {
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const data = await OrganizationService.getProjects(currentOrganization.id);
            setProjects(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load projects");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [currentOrganization]);

    // Assign Team Modal State
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');

    const fetchTeams = async () => {
        if (!currentOrganization) return;
        const data = await OrganizationService.getTeams(currentOrganization.id);
        setTeams(data);
    };

    const handleAssignTeam = async () => {
        if (!selectedProject || !selectedTeamId) return;
        try {
            await OrganizationService.assignTeamToProject(selectedProject.id, selectedTeamId);
            toast.success("Team assigned to project");
            setIsAssignOpen(false);
            fetchProjects(); // Refresh counts
        } catch (error: any) {
            toast.error("Failed to assign team");
        }
    };

    const openAssignModal = (project: Project) => {
        setSelectedProject(project);
        setIsAssignOpen(true);
        fetchTeams();
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim() || !currentOrganization) return;

        try {
            setIsCreating(true);
            await OrganizationService.createProject(currentOrganization.id, newProjectName);
            toast.success("Project created successfully");
            setNewProjectName('');
            setIsCreateOpen(false);
            fetchProjects();
        } catch (error: any) {
            toast.error(error.message || "Failed to create project");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return;
        
        try {
            // Soft delete
            await OrganizationService.deleteProject(projectId);
            
            // Refresh list
            fetchProjects();

            // Show Undo Option
            toast.success("Project deleted", {
                action: {
                    label: 'Undo',
                    onClick: async () => {
                        try {
                            await OrganizationService.restoreProject(projectId);
                            toast.success("Project restored");
                            fetchProjects(); // Refresh again
                        } catch (err) {
                            toast.error("Failed to restore project");
                        }
                    }
                },
                duration: 5000, // 5 seconds to undo
            });

        } catch (error: any) {
            toast.error("Failed to delete project");
        }
    };

    const [isDeletedModalOpen, setIsDeletedModalOpen] = useState(false);
    const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);

    const fetchDeletedProjects = async () => {
        if (!currentOrganization) return;
        const data = await OrganizationService.getDeletedProjects(currentOrganization.id);
        setDeletedProjects(data);
    };

    const handleRestoreProject = async (projectId: string) => {
        try {
            await OrganizationService.restoreProject(projectId);
            toast.success("Project restored");
            fetchDeletedProjects();
            fetchProjects();
        } catch (error) {
            toast.error("Failed to restore project");
        }
    };

    const handleHardDeleteProject = async (projectId: string) => {
        if (!confirm('This action cannot be undone. Permanently delete?')) return;
        try {
            await OrganizationService.hardDeleteProject(projectId);
            toast.success("Project permanently deleted");
            fetchDeletedProjects();
        } catch (error) {
            toast.error("Failed to delete project");
        }
    };

    // Filter
    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className='min-h-[100dvh] bg-[#05070a] text-white flex flex-col font-sans selection:bg-indigo-500/30'>
            {/* ... (background code omitted for brevity in replace tool, but keep it if full file rewrite. Here using chunk) */}
            <div className="fixed inset-0 pointer-events-none z-0">
                 <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full" />
                 <div className="absolute top-[20%] left-[-10%] w-[30%] h-[30%] bg-purple-600/5 blur-[100px] rounded-full" />
            </div>

            <div className="relative z-10 flex flex-col flex-1">
                <Navbar />
                
                <main className='flex-1 container mx-auto px-4 md:px-8 py-24 max-w-7xl'>
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        {/* ... */}
                         <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4">
                                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Resource Layer</span>
                            </div>
                            <h1 className='text-3xl md:text-5xl font-black tracking-tighter text-white mb-2'>PROJECTS</h1>
                            <p className='text-white/40 font-medium max-w-lg'>
                                Secure containers for your organization's resources.
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-white/20" />
                                <Input 
                                    placeholder="Search..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-12 bg-white/5 border-white/10 rounded-2xl w-[250px] text-white placeholder:text-white/20 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                            
                            <Button 
                                onClick={() => {
                                    setIsDeletedModalOpen(true);
                                    fetchDeletedProjects();
                                }}
                                variant="outline"
                                className="h-12 w-12 rounded-2xl bg-white/5 border-white/10 text-white hover:bg-white/10 p-0 flex items-center justify-center transition-all"
                                title="Recently Deleted"
                            >
                                <Trash2 className="w-5 h-5 text-white/60" />
                            </Button>

                            <Button 
                                onClick={() => setIsCreateOpen(true)}
                                className="h-12 px-6 rounded-2xl bg-white text-black hover:bg-indigo-50 font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden md:inline">New Project</span>
                            </Button>
                        </div>
                    </div>

                    {/* Grid */}
                    {isLoading || isOrgLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1,2,3].map(i => (
                                <div key={i} className="h-48 bg-white/5 rounded-[2rem] animate-pulse" />
                            ))}
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                            <Folder className="w-16 h-16 text-white/10 mb-6" />
                            <h3 className="text-xl font-bold text-white mb-2">No Projects Found</h3>
                            <p className="text-white/30 text-sm mb-8 text-center max-w-xs">
                                Projects act as secure scopes for teams and resources. Create one to get started.
                            </p>
                            <Button 
                                onClick={() => setIsCreateOpen(true)}
                                variant="outline"
                                className="h-12 border-white/10 text-white hover:bg-white/5"
                            >
                                Build First Project
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProjects.map((project) => (
                                <motion.div
                                    key={project.id}
                                    onClick={() => navigate(`/project/${project.id}`)}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="group relative bg-[#0c1016] border border-white/10 rounded-[2rem] p-6 hover:border-indigo-500/30 transition-colors overflow-hidden cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 flex items-center justify-center text-white/30 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all">
                                            <Folder className="w-6 h-6" />
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white rounded-full">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-[#1a1d24] border-white/10 text-white">
                                                <DropdownMenuItem onClick={() => openAssignModal(project)} className="cursor-pointer">
                                                    <Users className="w-4 h-4 mr-2" /> Assign Teams
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteProject(project.id);
                                                    }} 
                                                    className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Project
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
                                    <p className="text-white/40 text-xs line-clamp-2 min-h-[2.5em] mb-6">
                                        {project.description || "No description provided."}
                                    </p>

                                    {/* Scope Metrics */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-[10px] font-bold text-white/60">
                                                {project.teams_count || 0} Teams
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                            <Users className="w-3.5 h-3.5 text-indigo-400" />
                                            <span className="text-[10px] font-bold text-white/60">
                                                {project.members_count || 0} Users
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Status Indicator */}
                                    <div className="absolute bottom-6 right-6">
                                        <div className={`w-2 h-2 rounded-full ${project.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-gray-500'}`} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </main>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="bg-[#0c1016] border-white/10 sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-white">Create Project</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateProject} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Project Name</label>
                                <Input 
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="e.g. Alpha Squad Base"
                                    className="bg-white/5 border-white/10 text-white"
                                    autoFocus
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isCreating} className="bg-white text-black hover:bg-indigo-50">
                                    {isCreating ? 'Creating...' : 'Create Project'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                    <DialogContent className="bg-[#0c1016] border-white/10 sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-white">Assign Team to {selectedProject?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Select Team</label>
                                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                                    <SelectTrigger className="w-full h-12 bg-white/5 border-white/10 rounded-xl text-white">
                                        <SelectValue placeholder="Select Team" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1d24] border-white/10 text-white">
                                        {teams.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAssignTeam} disabled={!selectedTeamId} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                    Assign Access
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Recently Deleted Modal */}
                <Dialog open={isDeletedModalOpen} onOpenChange={setIsDeletedModalOpen}>
                    <DialogContent className="bg-[#0c1016] border-white/10 sm:max-w-[600px] text-white">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-white/60" />
                                Recently Deleted
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                            {deletedProjects.length === 0 ? (
                                <div className="text-center py-10 text-white/30 border border-dashed border-white/10 rounded-2xl">
                                    No deleted projects found.
                                </div>
                            ) : (
                                deletedProjects.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                        <div>
                                            <h4 className="font-bold text-sm">{p.name}</h4>
                                            <p className="text-white/30 text-xs">Deleted</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleRestoreProject(p.id)}
                                                className="border-white/10 hover:bg-white/5 text-white h-8 text-xs font-bold"
                                            >
                                                Restore
                                            </Button>
                                            <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={() => handleHardDeleteProject(p.id)}
                                                className="h-8 text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
                                            >
                                                Delete Forever
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default ProjectsPage;
