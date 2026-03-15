/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { SeasonService, Season, PlayerProgress } from '@/services/SeasonService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Calendar, Lock, Gift } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { QuestWidget } from '@/components/quests/QuestWidget';

export const SeasonHub = () => {
  const { user } = useAuth();
  const [season, setSeason] = useState<Season | null>(null);
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const s = await SeasonService.getActiveSeason();
      if (s) {
        setSeason(s);
        const p = await SeasonService.getPlayerProgress(user.id, s.id);
        setProgress(p);
      }
    } catch (e) {
      // console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (level: number, type: string, value: string) => {
    if (!user || !season) return;
    try {
      await SeasonService.claimReward(user.id, season.id, level, type, value);
      toast({ title: 'Reward Claimed!', description: `You received ${value} ${type}.` });
      loadData(); // Refresh state
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className='text-white p-8'>Loading Season...</div>;
  if (!season || !progress) return <div className='text-white p-8'>No Active Season</div>;

  // Calculate progression
  const currentXpInLevel = progress.current_xp % 1000;
  const progressPercent = (currentXpInLevel / 1000) * 100;

  return (
    <div className='p-8 max-w-6xl mx-auto text-white'>
      {/* Hero */}
      <div className='relative rounded-xl overflow-hidden bg-gradient-to-r from-indigo-900 to-purple-900 p-8 mb-8 border border-white/10 shadow-[0_0_50px_rgba(99,102,241,0.2)]'>
        <div className='relative z-10 flex justify-between items-end'>
          <div>
            <div className='flex items-center gap-2 text-indigo-300 mb-2 font-bold tracking-widest uppercase text-sm'>
              <Calendar className='w-4 h-4' />
              Active Season
            </div>
            <h1 className='text-5xl font-black italic mb-2 tracking-tighter'>{season.name}</h1>
            <p className='text-indigo-200 max-w-lg'>{season.description}</p>
          </div>
          <div className='text-right'>
            <div className='text-6xl font-black text-white/90'>{progress.level}</div>
            <div className='text-sm font-bold text-indigo-300 uppercase'>Current Level</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className='mt-8'>
          <div className='flex justify-between text-xs font-bold mb-1 opacity-70'>
            <span>{currentXpInLevel} XP</span>
            <span>1000 XP</span>
          </div>
          <Progress value={progressPercent} className='h-4 bg-black/40' />
        </div>
      </div>

      {/* Rewards Track & Quests Container */}
      <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
        <div className='lg:col-span-3'>
          <h2 className='text-2xl font-bold mb-4 flex items-center gap-2'>
            <Gift className='w-6 h-6 text-yellow-500' />
            Battle Pass Rewards
          </h2>

          <div className='flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent'>
            {season.levels?.map((lvl) => {
              const isUnlocked = progress.level >= lvl.level;
              const isClaimed = progress.claimed_levels?.includes(lvl.level);
              const canClaim = isUnlocked && !isClaimed;

              return (
                <Card
                  key={lvl.level}
                  className={`min-w-[160px] p-4 flex flex-col items-center border-slate-700 relative
                                        ${isClaimed ? 'bg-slate-900/40 opacity-50' : 'bg-slate-900'}
                                        ${canClaim ? 'ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]' : ''}
                                    `}
                >
                  <div className='absolute top-2 right-2 text-xs font-bold text-slate-500'>
                    Lvl {lvl.level}
                  </div>

                  <div className='w-16 h-16 rounded-lg bg-slate-800 mb-3 mt-4 flex items-center justify-center text-3xl'>
                    {lvl.reward_type === 'coins' ? '💰' : '🎁'}
                  </div>

                  <div className='font-bold text-sm mb-1 capitalize'>{lvl.reward_type}</div>
                  <div className='text-xs text-slate-400 mb-4'>{lvl.reward_value}</div>

                  {isClaimed ? (
                    <Button disabled size='sm' variant='ghost' className='w-full text-green-500'>
                      Claimed
                    </Button>
                  ) : canClaim ? (
                    <Button
                      onClick={() => handleClaim(lvl.level, lvl.reward_type, lvl.reward_value)}
                      size='sm'
                      className='w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold'
                    >
                      Claim
                    </Button>
                  ) : (
                    <div className='flex items-center gap-1 text-xs text-slate-500 font-bold uppercase py-2'>
                      <Lock className='w-3 h-3' /> Locked
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Dummy placeholders for visual length */}
            {[6, 7, 8, 9, 10].map((i) => (
              <Card
                key={i}
                className='min-w-[160px] p-4 flex flex-col items-center bg-slate-900 border-slate-700 opacity-50'
              >
                <div className='absolute top-2 right-2 text-xs font-bold text-slate-500'>
                  Lvl {i}
                </div>
                <div className='w-16 h-16 rounded-lg bg-slate-800 mb-3 mt-4 flex items-center justify-center'>
                  ?
                </div>
                <div className='flex items-center gap-1 text-xs text-slate-500 font-bold uppercase py-2'>
                  Coming Soon
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className='lg:col-span-1'>
          <QuestWidget />
        </div>
      </div>
    </div>
  );
};
