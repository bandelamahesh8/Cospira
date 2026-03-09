import { useState, useEffect, useCallback } from 'react';
import { IdentityService, Asset } from '@/services/IdentityService'; // Fixed: imports
import { useAuth } from '@/hooks/useAuth';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export const IdentityEditor = () => {
  const { user } = useAuth();
  const { profile } = usePlayerProfile();

  const [shopAssets, setShopAssets] = useState<Asset[]>([]);
  const [inventory, setInventory] = useState<Asset[]>([]);
  const [activeTab, setActiveTab] = useState('inventory');
  const [filter, setFilter] = useState<'all' | 'avatar' | 'frame' | 'banner'>('all');

  const loadData = useCallback(async () => {
    if (!user) return;
    const [shop, inv] = await Promise.all([
      IdentityService.getShopAssets(),
      IdentityService.getInventory(user.id),
    ]);
    setShopAssets(shop);
    setInventory(inv);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleBuy = async (asset: Asset) => {
    if (!user || !profile) return;
    try {
      await IdentityService.purchaseAsset(user.id, asset.id, asset.price_coins);
      toast({ title: 'Purchased!', description: `${asset.name} added to inventory.` });
      // refetch(); // Hook doesn't expose refetch yet
      loadData(); // Update inventory
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleEquip = async (asset: Asset) => {
    if (!user) return;
    try {
      await IdentityService.equipAsset(user.id, asset.id, asset.type);
      toast({ title: 'Equipped', description: `${asset.name} is now active.` });
      // refetch(); // Update profile
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to equip.', variant: 'destructive' });
    }
  };

  const getItems = () => {
    const source = activeTab === 'inventory' ? inventory : shopAssets;
    if (filter === 'all') return source;
    return source.filter((a) => a.type === filter);
  };

  const items = getItems();

  // Helper to check ownership
  const isOwned = (assetId: string) => inventory.some((i) => i.id === assetId);

  return (
    <div className='p-8 max-w-5xl mx-auto text-white flex gap-8'>
      {/* Left: Preview */}
      <div className='w-1/3 space-y-4'>
        <Card className='bg-slate-900 border-slate-700 p-6 flex flex-col items-center sticky top-4'>
          <h2 className='text-xl font-bold mb-4'>Preview</h2>

          {/* Banner Preview */}
          <div
            className={`w-full h-32 rounded-t-lg mb-[-40px] ${profile?.equipped_banner_id ? '' : 'bg-slate-800'}`}
          >
            {/* We would fetch the banner URL here if we had full asset data joined on profile, 
                            for now relying on visual logic or we need to fetch equipped asset details. 
                            Ideally PlayerProfile should conform to include equipped asset objects.
                         */}
            <div className='w-full h-full bg-gradient-to-r from-indigo-900 to-purple-900 rounded-lg'></div>
          </div>

          {/* Avatar + Frame */}
          <div className='relative z-10'>
            <div className={`w-24 h-24 rounded-full overflow-hidden border-4 border-slate-900`}>
              <img
                src={profile?.avatarUrl || 'https://github.com/shadcn.png'}
                alt='Avatar'
                className='w-full h-full object-cover'
              />
            </div>
            {/* Frame Overlay - Mockup class application */}
            <div className='absolute inset-[-4px] rounded-full border-4 border-yellow-500/0 pointer-events-none'></div>
          </div>

          <div className='mt-4 text-center'>
            <h3 className='text-lg font-bold'>{profile?.username || 'Player'}</h3>
            <p className='text-slate-400 text-sm'>Level {profile?.level || 1}</p>
          </div>

          <div className='mt-8 w-full bg-slate-800 p-3 rounded flex justify-between'>
            <span className='text-slate-400'>Coins</span>
            <span className='text-yellow-400 font-bold'>{profile?.coins || 0} G</span>
          </div>
        </Card>
      </div>

      {/* Right: Editor */}
      <div className='w-2/3'>
        <div className='flex gap-4 mb-6'>
          <Button
            variant={activeTab === 'inventory' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('inventory')}
            className={activeTab === 'inventory' ? 'bg-indigo-600' : ''}
          >
            My Inventory
          </Button>
          <Button
            variant={activeTab === 'shop' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('shop')}
            className={activeTab === 'shop' ? 'bg-indigo-600' : ''}
          >
            Item Shop
          </Button>
        </div>

        <div className='flex gap-2 mb-6'>
          {['all', 'avatar', 'frame', 'banner'].map((f) => (
            <Button
              key={f}
              size='sm'
              variant='outline'
              onClick={() => setFilter(f as 'all' | 'avatar' | 'frame' | 'banner')}
              className={`capitalize ${filter === f ? 'bg-slate-700 border-indigo-500' : 'bg-slate-900 border-slate-700'}`}
            >
              {f}
            </Button>
          ))}
        </div>

        <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
          {items.map((asset) => (
            <Card
              key={asset.id}
              className='bg-slate-900 border-slate-700 p-4 flex flex-col items-center hover:border-indigo-500/50 transition-all'
            >
              <div className='w-16 h-16 bg-slate-800 rounded-lg mb-3 overflow-hidden'>
                {asset.type === 'avatar' && (
                  <img src={asset.image_url} className='w-full h-full object-cover' />
                )}
                {asset.type === 'frame' && (
                  <div className={`w-full h-full border-4 ${asset.image_url}`}></div>
                )}
              </div>

              <h4 className='font-bold text-sm mb-1'>{asset.name}</h4>
              <span
                className={`text-xs px-2 py-0.5 rounded uppercase font-bold mb-3
                                ${
                                  asset.rarity === 'legendary'
                                    ? 'bg-yellow-500/20 text-yellow-500'
                                    : asset.rarity === 'epic'
                                      ? 'bg-purple-500/20 text-purple-500'
                                      : 'bg-slate-700 text-slate-400'
                                }`}
              >
                {asset.rarity}
              </span>

              {activeTab === 'shop' ? (
                isOwned(asset.id) ? (
                  <Button disabled variant='secondary' className='w-full h-8 text-xs'>
                    Owned
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleBuy(asset)}
                    className='w-full h-8 text-xs bg-green-600 hover:bg-green-700'
                  >
                    {asset.price_coins} G
                  </Button>
                )
              ) : (
                <Button
                  onClick={() => handleEquip(asset)}
                  variant='outline'
                  className='w-full h-8 text-xs border-slate-600'
                >
                  Equip
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
