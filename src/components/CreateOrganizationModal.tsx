import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/contexts/useOrganization';
import { Building2, Link, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface CreateOrganizationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
    open,
    onOpenChange,
}) => {
    const { createOrganization } = useOrganization();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !slug) return;

        setIsLoading(true);
        try {
            await createOrganization(name, slug);
            onOpenChange(false);
            setName('');
            setSlug('');
        } catch {
            // Error handled in context
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-[#0c1016] border border-white/10 rounded-[2rem] p-0 overflow-hidden shadow-2xl">
                 {/* Header Background Effect */}
                 <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
                
                <div className="p-8 relative z-10">
                    <DialogHeader className="mb-6">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-inner"
                        >
                            <Building2 className="w-6 h-6 text-indigo-400" />
                        </motion.div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white">Create Organization</DialogTitle>
                        <DialogDescription className="text-white/40 font-medium text-base">
                            Establish a new secure domain for your team.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="org-name" className="text-[10px] font-black uppercase tracking-widest text-indigo-400/80 pl-1">Organization Name</Label>
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-3.5 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                                <Input
                                    id="org-name"
                                    placeholder="ACME CORP"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (!slug || slug === name.toLowerCase().replace(/\s+/g, '-')) {
                                            setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                                        }
                                    }}
                                    className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl font-medium text-white placeholder:text-white/20 focus:bg-white/10 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="org-slug" className="text-[10px] font-black uppercase tracking-widest text-indigo-400/80 pl-1">URL Slug</Label>
                            <div className="relative group">
                                <Link className="absolute left-4 top-3.5 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                                <Input
                                    id="org-slug"
                                    placeholder="acme-corp"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                                    className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl font-mono text-sm text-white placeholder:text-white/20 focus:bg-white/10 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                            <p className="text-[10px] text-white/30 font-medium pl-1">
                                This will be your unique identifier on the network.
                            </p>
                        </div>
                    </form>
                </div>
                
                <DialogFooter className="bg-black/20 p-6 border-t border-white/5 flex items-center justify-end gap-3">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wider"
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={isLoading || !name || !slug}
                        onClick={handleSubmit} 
                        className="bg-white text-black hover:bg-indigo-50 rounded-xl text-xs font-black uppercase tracking-widest px-6 h-10 shadow-lg shadow-white/5"
                    >
                         {isLoading ? (
                            <span className="flex items-center gap-2">Creating...</span>
                         ) : (
                            <span className="flex items-center gap-2">
                                <Plus className="w-3 h-3" /> Create
                            </span>
                         )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
