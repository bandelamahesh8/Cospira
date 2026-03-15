import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Users, Trophy, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KartLauncherPanelProps {
  onStartRace: () => void;
  players: { userId: string; username: string; ready: boolean }[];
  isHost: boolean;
}

export function KartLauncherPanel({ onStartRace, players, isHost }: KartLauncherPanelProps) {
  return (
    <Card className='w-full max-w-4xl mx-auto bg-slate-950 border-slate-800 shadow-[0_0_100px_rgba(244,63,94,0.3)] relative overflow-hidden flex flex-col p-8 md:p-12 rounded-[4rem] border-2'>
      {/* AMBIENT BACKGROUND GLOW */}
      <div className='absolute top-0 left-0 w-full h-full pointer-events-none opacity-30'>
        <div className='absolute -top-1/4 -left-1/4 w-3/4 h-3/4 bg-rose-600 blur-[150px] rounded-full' />
        <div className='absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 bg-orange-600 blur-[150px] rounded-full' />
      </div>

      <div className='relative z-10 flex flex-col md:flex-row gap-12'>
        {/* Left Side: Game Info */}
        <div className='flex-1 space-y-8'>
          <div className='flex items-center gap-6'>
            <div className='w-20 h-20 bg-gradient-to-br from-rose-600 to-orange-600 rounded-[2rem] flex items-center justify-center shadow-2xl rotate-6 transition-all hover:rotate-0 hover:scale-110'>
              <Zap className='w-10 h-10 text-white fill-white/20' />
            </div>
            <div>
              <h1 className='text-5xl font-black text-white tracking-tighter italic uppercase leading-none'>
                KART <span className='text-rose-500'>RACING</span>
              </h1>
              <div className='flex items-center gap-2 mt-2'>
                <div className='w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse' />
                <span className='text-xs font-black text-slate-500 uppercase tracking-widest'>
                  Ready for Ignition
                </span>
              </div>
            </div>
          </div>

          <p className='text-slate-400 text-lg leading-relaxed font-medium'>
            Welcome to the Apex Circuit. High-stakes multiplayer racing where precision meets velocity. 
            Ensure your engines are primed and your focus is absolute.
          </p>

          <div className='grid grid-cols-2 gap-4'>
            <div className='p-6 rounded-[2rem] bg-white/5 border border-white/10'>
              <Trophy className='w-8 h-8 text-rose-500 mb-3' />
              <h3 className='text-white font-black uppercase text-xs tracking-widest'>Tournament</h3>
              <p className='text-slate-500 text-[10px] font-bold uppercase mt-1'>Standard Grand Prix</p>
            </div>
            <div className='p-6 rounded-[2rem] bg-white/5 border border-white/10'>
              <Users className='w-8 h-8 text-rose-500 mb-3' />
              <h3 className='text-white font-black uppercase text-xs tracking-widest'>Capacity</h3>
              <p className='text-slate-500 text-[10px] font-bold uppercase mt-1'>Up to 6 Combatants</p>
            </div>
          </div>
        </div>

        {/* Right Side: Lobby */}
        <div className='w-full md:w-[350px] space-y-6'>
          <div className='flex items-center justify-between px-2'>
            <h3 className='text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2'>
              <Users className='w-4 h-4' />
              Active Lobby
            </h3>
            <span className='px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-rose-400 uppercase tracking-widest'>
              {players.length} / 6
            </span>
          </div>

          <div className='space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2'>
            <AnimatePresence>
              {players.map((player, idx) => (
                <motion.div
                  key={player.userId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className='p-4 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all'
                >
                  <div className='flex items-center gap-4'>
                    <div className='w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 font-black group-hover:bg-rose-500 group-hover:text-white transition-colors'>
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className='text-sm font-bold text-white uppercase'>{player.username}</p>
                      <p className='text-[9px] text-slate-500 font-black tracking-widest uppercase'>Combatant</p>
                    </div>
                  </div>
                  <div className={cn(
                    'px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tight',
                    player.ready ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  )}>
                    {player.ready ? 'Ready' : 'Waiting'}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className='pt-6'>
            {isHost ? (
              <Button
                onClick={onStartRace}
                className='w-full h-16 rounded-[2rem] bg-gradient-to-r from-rose-600 to-orange-600 text-white font-black uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(244,63,94,0.3)] hover:scale-[1.02] transition-all group'
              >
                Launch Protocol
                <Play className='w-5 h-5 ml-2 fill-white group-hover:translate-x-1 transition-transform' />
              </Button>
            ) : (
              <div className='w-full h-16 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-slate-500 text-xs font-black uppercase tracking-widest'>
                <Loader2 className='w-4 h-4 animate-spin' />
                Waiting for Host...
              </div>
            )}
            <p className='text-center mt-4 text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]'>
              All systems nominal
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}