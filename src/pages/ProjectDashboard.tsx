import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import {
    Zap,
    Activity,
    Box,
    LayoutGrid,
    Settings,
    Users
} from 'lucide-react';
import { toast } from 'sonner';

const ProjectDashboard = () => {

 
  const handleCreateResource = () => {
      toast.success("Resource Provisioning Init", { description: "Cloud Room creation in Project Scope is coming in Phase 3." });
  };

  return (
    <div className='min-h-[100dvh] bg-[#05070a] relative overflow-hidden selection:bg-indigo-500/30 font-sans text-white flex flex-col'>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-[0.02]" />
         <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 h-full">
        <Navbar />
      
        <main className='flex-1 container mx-auto px-4 md:px-8 py-24 max-w-7xl'>
            
            {/* Breadcrumb / Back */}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4 text-emerald-400">
                        <Box className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Project Workspace</span>
                    </div>
                    <h1 className='text-3xl md:text-5xl font-black tracking-tighter text-white mb-2'>
                        {/* {project?.name || 'Project Console'} */}
                        PROJECT CONSOLE
                    </h1>
                    <p className='text-white/40 font-medium max-w-lg'>
                        Secure environment for project-specific resources and team collaboration.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-12 border-white/10 text-white bg-white/5 hover:bg-white/10 gap-2">
                        <Settings className="w-4 h-4" /> Settings
                    </Button>
                    <Button variant="outline" className="h-12 border-white/10 text-white bg-white/5 hover:bg-white/10 gap-2">
                        <Users className="w-4 h-4" /> Team
                    </Button>
                </div>
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Cloud Rooms (Browser) */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative bg-[#0c1016] border border-white/10 rounded-[2.5rem] p-8 overflow-hidden hover:border-indigo-500/30 transition-all"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <LayoutGrid className="w-32 h-32 -rotate-12" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400">
                                <Activity className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Cloud Rooms</h3>
                            <p className="text-white/40 text-sm font-medium mb-8">
                                Deploy ephemeral browser instances and collaborative workspaces.
                            </p>
                        </div>
                        
                        <Button 
                            onClick={handleCreateResource}
                            className="w-full h-12 bg-white text-black hover:bg-indigo-50 font-black uppercase tracking-widest"
                        >
                            <Zap className="w-4 h-4 mr-2" /> Launch Instance
                        </Button>
                    </div>
                </motion.div>

                {/* 2. Database (Placeholder) */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="group relative bg-[#0c1016] border border-white/10 rounded-[2.5rem] p-8 overflow-hidden opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all"
                >
                    <div className="relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white/40">
                            <Box className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Database</h3>
                        <p className="text-white/40 text-sm font-medium mb-8">
                            Managed PostgreSQL containers with automated backups.
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40">
                            Coming Soon
                        </div>
                    </div>
                </motion.div>

            </div>

        </main>
      </div>
    </div>
  );
};

export default ProjectDashboard;
