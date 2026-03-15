/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { StoreService, StoreItem } from '@/services/StoreService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Coins, Check, Diamond } from 'lucide-react'; // Diamond as Gems
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const Shop = () => {
  const { user } = useAuth();
  const { profile, refetch } = usePlayerProfile();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const data = await StoreService.getCatalog();
      setItems(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBuy = async (item: StoreItem, currency: 'coins' | 'gems') => {
    if (!user || !profile) return;
    setLoadingId(item.id);

    try {
      const res = await StoreService.purchaseItem(user.id, item, currency);
      if (res.success) {
        toast({ title: 'Purchase Successful!', description: `You bought ${item.name}` });
        refetch(); // Reload profile (balance/inventory)
      }
    } catch (e: any) {
      toast({ title: 'Purchase Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingId(null);
    }
  };

  if (!profile) return <div className='p-8 text-white'>Loading Shop...</div>;

  const inventory = profile.inventory || [];

  return (
    <div className='p-8 max-w-6xl mx-auto'>
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-4xl font-black text-white italic uppercase tracking-tighter'>
            Premium Store
          </h1>
          <p className='text-slate-400'>Exclusive cosmetics and boosters.</p>
        </div>
        <div className='flex gap-4'>
          <div className='bg-slate-800 px-4 py-2 rounded-xl border border-yellow-500/30 flex items-center gap-2'>
            <Coins className='text-yellow-400 w-5 h-5' />
            <span className='text-xl font-bold text-white'>{profile.coins || 0}</span>
          </div>
          <div className='bg-slate-800 px-4 py-2 rounded-xl border border-cyan-500/30 flex items-center gap-2'>
            <Diamond className='text-cyan-400 w-5 h-5' />
            <span className='text-xl font-bold text-white'>{profile.gems || 0}</span>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6'>
        {items.map((item) => {
          const isOwned = inventory.includes(item.id);
          const canAffordCoins = item.price_coins && (profile.coins || 0) >= item.price_coins;
          const canAffordGems = item.price_gems && (profile.gems || 0) >= item.price_gems;

          return (
            <Card
              key={item.id}
              className='bg-slate-900 border-slate-700 overflow-hidden relative group hover:border-indigo-500 transition-all flex flex-col'
            >
              <div className='h-40 bg-slate-950 flex items-center justify-center relative'>
                {item.category === 'frame' ? (
                  <div className='relative'>
                    <Avatar className='w-20 h-20 ring-2 ring-indigo-500'>
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className='absolute inset-0 border-4 border-yellow-400 rounded-full animate-pulse'></div>
                    {/* Simple visual proxy for frame assumption */}
                  </div>
                ) : (
                  <div className='text-5xl'>{item.category === 'boost' ? '⚡' : '📦'}</div>
                )}

                {isOwned && (
                  <div className='absolute top-2 right-2 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1'>
                    <Check className='w-3 h-3' /> OWNED
                  </div>
                )}
              </div>

              <div className='p-4 flex-1 flex flex-col'>
                <div className='mb-4'>
                  <div className='flex justify-between items-start'>
                    <h3 className='text-lg font-bold text-white'>{item.name}</h3>
                    <Badge variant='outline' className='uppercase text-[10px] tracking-wider'>
                      {item.category}
                    </Badge>
                  </div>
                  <p className='text-xs text-slate-400 mt-1'>{item.description}</p>
                </div>

                <div className='mt-auto space-y-2'>
                  {/* Coins Button */}
                  {item.price_coins !== null && (
                    <Button
                      className={cn(
                        'w-full font-bold',
                        isOwned ? 'bg-slate-800' : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                      )}
                      disabled={isOwned || loadingId === item.id || !canAffordCoins}
                      onClick={() => !isOwned && handleBuy(item, 'coins')}
                      size='sm'
                    >
                      {isOwned ? (
                        'Equipped'
                      ) : (
                        <div className='flex items-center gap-1'>
                          {loadingId === item.id ? '...' : 'Buy for'} {item.price_coins}{' '}
                          <Coins className='w-3 h-3 ml-1' />
                        </div>
                      )}
                    </Button>
                  )}

                  {/* Gems Button */}
                  {item.price_gems !== null && (
                    <Button
                      className={cn(
                        'w-full font-bold',
                        isOwned ? 'bg-slate-800' : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                      )}
                      disabled={isOwned || loadingId === item.id || !canAffordGems}
                      onClick={() => !isOwned && handleBuy(item, 'gems')}
                      size='sm'
                    >
                      {isOwned ? (
                        'Equipped'
                      ) : (
                        <div className='flex items-center gap-1'>
                          {loadingId === item.id ? '...' : 'Buy for'} {item.price_gems}{' '}
                          <Diamond className='w-3 h-3 ml-1' />
                        </div>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
