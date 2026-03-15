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
import { Switch } from '@/components/ui/switch';
import { useOrganization } from '@/contexts/useOrganization';
import { ModePolicyResolver } from '@/lib/ModePolicyResolver';
import { OrgMode } from '@/types/organization';
import { Building2, Plus } from 'lucide-react';
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
  const [baseMode, setBaseMode] = useState<OrgMode>('PROF');
  const [isLoading, setIsLoading] = useState(false);

  const [lobbyName, setLobbyName] = useState('');
  const [authorizedOnly, setAuthorizedOnly] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    setIsLoading(true);
    try {
      // In a real app, passing all these advanced settings to the backend
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (createOrganization as any)(name, slug, baseMode, {
        lobby_name: lobbyName || `${name} Main Lobby`,
        authorized_only: authorizedOnly,
      });
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
      <DialogContent className='w-[95vw] sm:max-w-[1050px] bg-[#0c1016] border border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl'>
        {/* Header Background Effect */}
        <div className='absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/5 pointer-events-none' />

        <div className='relative z-10 flex flex-col max-h-[85vh]'>
          <div className='p-6 md:p-8 overflow-y-auto custom-scrollbar'>
            <DialogHeader className='mb-6'>
              <div className='flex items-center gap-5'>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className='w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner'
                >
                  <Building2 className='w-7 h-7 text-indigo-400' />
                </motion.div>
                <div>
                  <DialogTitle className='text-3xl font-black uppercase tracking-tighter text-white'>
                    Initialize Organization
                  </DialogTitle>
                  <DialogDescription className='text-white/40 font-medium text-base'>
                    Establish a secure high-integrity domain for your neural operations.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form
              onSubmit={handleSubmit}
              className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10'
            >
              {/* Column 1: Identity & Security */}
              <div className='space-y-5 md:space-y-6'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='h-0.5 w-4 bg-indigo-500' />
                  <span className='text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400'>
                    Core Identity
                  </span>
                </div>

                {/* Organization Name */}
                <div className='space-y-3'>
                  <Label
                    htmlFor='org-name'
                    className='text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-1'
                  >
                    Organization Name
                  </Label>
                  <div className='relative group'>
                    <Building2 className='absolute left-4 top-3.5 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors' />
                    <Input
                      id='org-name'
                      placeholder='ACME CORP'
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!slug || slug === name.toLowerCase().replace(/\s+/g, '-')) {
                          setSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, '-')
                              .replace(/[^a-z0-9-]/g, '')
                          );
                        }
                      }}
                      className='pl-11 h-12 bg-white/5 border-white/10 rounded-xl font-medium text-white placeholder:text-white/20 focus:bg-white/10 focus:border-indigo-500/50 transition-all'
                    />
                  </div>
                </div>

                {/* URL Slug removed per user request */}

                {/* Base Security Type */}

                {/* Base Security Type */}
                <div className='space-y-3'>
                  <Label className='text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-1'>
                    Encryption Protocol
                  </Label>
                  <div className='flex gap-2 p-1 bg-black/20 rounded-[14px] border border-white/5 relative'>
                    {(['FUN', 'PROF', 'ULTRA_SECURE', 'MIXED'] as OrgMode[]).map((mode) => {
                      const badge = ModePolicyResolver.getBadge(mode);
                      const isActive = baseMode === mode;
                      return (
                        <motion.button
                          key={mode}
                          type='button'
                          onClick={() => setBaseMode(mode)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all z-10 ${
                            isActive ? 'text-white' : 'text-white/30 hover:text-white/50'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId='baseModeHighlight'
                              className={`absolute inset-0 rounded-xl bg-white/5 border border-white/10 shadow-[inner_0_0_20px_rgba(255,255,255,0.02)] ${badge.color.split(' ')[0].replace('text-', 'border-')}`}
                              style={{ borderStyle: 'solid', borderWidth: '1px' }}
                              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                          <span className='text-xl mb-1 relative z-20'>{badge.emoji}</span>
                          <span className='text-[9px] font-black uppercase tracking-widest relative z-20'>
                            {badge.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Column 2: Governance & Permissions */}
              <div className='space-y-4 md:space-y-5'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='h-0.5 w-4 bg-cyan-500' />
                  <span className='text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400'>
                    Room configuration
                  </span>
                </div>

                <div className='space-y-6'>
                  <div className='space-y-3'>
                    <Label
                      htmlFor='lobby-name'
                      className='text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-1'
                    >
                      Main Lobby Room Name
                    </Label>
                    <div className='relative group'>
                      <Building2 className='absolute left-4 top-3.5 w-4 h-4 text-white/20 group-focus-within:text-cyan-400 transition-colors' />
                      <Input
                        id='lobby-name'
                        placeholder='e.g. Acme HQ Main Lobby'
                        value={lobbyName}
                        onChange={(e) => setLobbyName(e.target.value)}
                        className='pl-11 h-12 bg-white/5 border-white/10 rounded-xl font-medium text-white placeholder:text-white/20 focus:bg-white/10 focus:border-cyan-500/50 transition-all'
                      />
                    </div>
                  </div>

                  <div className='flex flex-row items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4'>
                    <div className='space-y-0.5'>
                      <Label className='text-sm font-bold text-white'>Authorized Users Only</Label>
                      <p className='text-[10px] text-zinc-400 font-medium uppercase tracking-wider'>
                        No Guest Users Allowed
                      </p>
                    </div>
                    <Switch
                      checked={authorizedOnly}
                      onCheckedChange={setAuthorizedOnly}
                      className='data-[state=checked]:bg-cyan-500'
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>

          <DialogFooter className='bg-black/40 p-5 md:p-6 border-t border-white/5 flex items-center justify-end gap-4 mt-auto shrink-0'>
            <Button
              type='button'
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='text-white/40 hover:text-white hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-widest h-11 px-8'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isLoading || !name || !slug}
              onClick={handleSubmit}
              className='bg-white text-black hover:bg-indigo-50 rounded-xl text-xs font-black uppercase tracking-widest px-10 h-11 shadow-2xl shadow-white/5 group relative overflow-hidden'
            >
              <span className='relative z-10 flex items-center gap-2'>
                {isLoading ? (
                  'INITIALIZING...'
                ) : (
                  <>
                    <Plus className='w-4 h-4 transition-transform group-hover:rotate-90' />
                    ESTABLISH DOMAIN
                  </>
                )}
              </span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
