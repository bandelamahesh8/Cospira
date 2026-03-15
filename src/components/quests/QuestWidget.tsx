/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { QuestService, Quest } from '@/services/QuestService';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Scroll, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const QuestWidget = () => {
  const { user } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadQuests();
  }, [user]);

  const loadQuests = async () => {
    if (!user) return;
    try {
      const data = await QuestService.getDailyQuests(user.id);
      setQuests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (quest: Quest) => {
    if (!user) return;
    try {
      await QuestService.claimInfo(user.id, quest);
      toast({
        title: 'Reward Claimed',
        description: `+${quest.reward_amount} ${quest.reward_type}`,
      });
      loadQuests();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return null;

  return (
    <div className='bg-slate-900/50 p-4 rounded-xl border border-white/5'>
      <h3 className='text-sm font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wider'>
        <Scroll className='w-4 h-4' /> Daily Quests
      </h3>

      <div className='space-y-3'>
        {quests.map((q) => {
          const percent = Math.min(100, (q.current_progress / q.target_count) * 100);
          const canClaim = q.is_completed && !q.is_claimed;

          return (
            <div key={q.id} className='bg-black/20 p-3 rounded-lg border border-white/5'>
              <div className='flex justify-between items-start mb-2'>
                <div className='text-sm font-bold text-white'>{q.title}</div>
                <div className='text-xs font-mono text-yellow-400'>
                  +{q.reward_amount} {q.reward_type.toUpperCase()}
                </div>
              </div>

              <div className='flex items-center gap-3'>
                <div className='flex-1'>
                  <Progress
                    value={percent}
                    className='h-1.5 bg-black/50'
                    indicatorClassName='bg-cyan-500'
                  />
                  <div className='text-[10px] text-slate-500 mt-1 text-right'>
                    {q.current_progress} / {q.target_count}
                  </div>
                </div>

                {q.is_claimed ? (
                  <CheckCircle className='w-4 h-4 text-green-500' />
                ) : canClaim ? (
                  <Button
                    size='sm'
                    onClick={() => handleClaim(q)}
                    className='h-6 text-[10px] bg-yellow-500 text-black hover:bg-yellow-600'
                  >
                    CLAIM
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
