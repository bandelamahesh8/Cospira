import { useState, useEffect } from 'react';
import { ClanService, Clan } from '@/services/ClanService';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Users, Plus, LogOut, Crown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const ClanManager = () => {
    const { user } = useAuth();
    const [myClan, setMyClan] = useState<any | null>(null);
    const [allClans, setAllClans] = useState<Clan[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({ name: '', tag: '', description: '' });

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        const clan = await ClanService.getUserClan(user.id);
        if (clan) {
            const details = await ClanService.getClan(clan.id);
            setMyClan(details);
        } else {
            setMyClan(null);
            const clans = await ClanService.getAllClans();
            setAllClans(clans);
        }
    };

    const handleCreate = async () => {
        if (!user) return;
        try {
            await ClanService.createClan(formData.name, formData.tag, formData.description, user.id);
            toast({ title: 'Success', description: 'Clan created!' });
            setIsCreating(false);
            loadData();
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
        }
    };

    const handleJoin = async (clanId: string) => {
        if (!user) return;
        try {
            await ClanService.joinClan(clanId, user.id);
            toast({ title: 'Joined!', description: 'You are now a member.' });
            loadData();
        } catch (e: any) {
             toast({ title: 'Error', description: 'Failed to join. You might already be in a clan.', variant: 'destructive' });
        }
    };

    const handleLeave = async () => {
         if (!user || !myClan) return;
         try {
             await ClanService.leaveClan(myClan.id, user.id);
             toast({ title: 'Left Clan', description: 'You are now a freelancer.' });
             setMyClan(null);
             loadData();
         } catch (e) {
             toast({ title: 'Error', description: 'Failed to leave.', variant: 'destructive' });
         }
    };

    if (myClan) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-white">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Shield className="text-yellow-500 w-8 h-8" />
                            [{myClan.tag}] {myClan.name}
                        </h1>
                        <p className="text-slate-400 mt-1">{myClan.description}</p>
                    </div>
                    <Button variant="destructive" onClick={handleLeave}>
                        <LogOut className="w-4 h-4 mr-2" /> Leave Clan
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-slate-900 border-slate-700 p-6 text-center">
                        <p className="text-slate-400 text-sm">Level</p>
                        <p className="text-3xl font-bold text-yellow-500">{myClan.level}</p>
                    </Card>
                    <Card className="bg-slate-900 border-slate-700 p-6 text-center">
                        <p className="text-slate-400 text-sm">Members</p>
                        <p className="text-3xl font-bold text-blue-400">{myClan.members?.length || 1}</p>
                    </Card>
                    <Card className="bg-slate-900 border-slate-700 p-6 text-center">
                        <p className="text-slate-400 text-sm">XP</p>
                        <p className="text-3xl font-bold text-green-400">{myClan.xp}</p>
                    </Card>
                </div>

                <h3 className="text-xl font-bold mb-4 mt-8 flex items-center gap-2">
                    <Shield className="text-red-500" /> Active Wars
                </h3>
                <ClanWarsList clanId={myClan.id} isLeader={myClan.members.find((m: any) => m.user_id === user.id)?.role === 'leader'} />

                <h3 className="text-xl font-bold mb-4 mt-8">Members</h3>
                <div className="space-y-2">
                    {myClan.members?.map((m: any) => (
                        <div key={m.user_id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                {m.role === 'leader' && <Crown className="w-4 h-4 text-yellow-500" />}
                                <span className="font-medium text-white">{m.profile?.username || 'Unknown'}</span>
                            </div>
                            <span className="text-xs uppercase text-slate-500 font-bold">{m.role}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto text-white">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Users className="text-indigo-500" /> Clans
            </h1>

            {!isCreating ? (
                <>
                    <div className="flex justify-end mb-6">
                        <Button onClick={() => setIsCreating(true)} className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-2" /> Create Clan
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allClans.map(clan => (
                            <Card key={clan.id} className="bg-slate-900 border-slate-700 p-5 hover:border-indigo-500/50 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-white">[{clan.tag}] {clan.name}</h3>
                                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-yellow-500 font-bold">Lvl {clan.level}</span>
                                </div>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{clan.description || 'No description'}</p>
                                <Button className="w-full" variant="outline" onClick={() => handleJoin(clan.id)}>
                                    Join Clan
                                </Button>
                            </Card>
                        ))}
                    </div>
                </>
            ) : (
                <Card className="max-w-md mx-auto bg-slate-900 border-slate-700 p-6">
                    <h2 className="text-xl font-bold mb-4">Initialise New Clan</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400">Clan Name</label>
                            <Input 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g. The Avengers"
                                className="bg-slate-800 border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Clan Tag (3-4 chars)</label>
                            <Input 
                                value={formData.tag} 
                                max={4}
                                onChange={e => setFormData({...formData, tag: e.target.value.toUpperCase()})}
                                placeholder="AVG"
                                className="bg-slate-800 border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Description</label>
                            <Input 
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                placeholder="We play to win."
                                className="bg-slate-800 border-slate-700"
                            />
                        </div>
                        <div className="flex gap-2 justify-end mt-4">
                            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                            <Button onClick={handleCreate} className="bg-indigo-600">Create</Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

// Sub-component for Wars List
const ClanWarsList = ({ clanId, isLeader }: { clanId: string, isLeader: boolean }) => {
    const [wars, setWars] = useState<any[]>([]);
    
    useEffect(() => {
        import('@/services/ClanWarService').then(({ ClanWarService }) => {
            ClanWarService.getClanWars(clanId).then(setWars);
        });
    }, [clanId]);

    const handleRespond = async (warId: string, accept: boolean) => {
        const { ClanWarService } = await import('@/services/ClanWarService');
        await ClanWarService.respondToChallenge(warId, accept);
        const data = await ClanWarService.getClanWars(clanId);
        setWars(data);
    };

    if (wars.length === 0) return <div className="text-slate-500 italic">No active wars</div>;

    return (
        <div className="space-y-3">
            {wars.map(war => {
                const isChallenger = war.challenger_clan_id === clanId;
                const opponent = isChallenger ? war.defender : war.challenger;
                
                return (
                    <Card key={war.id} className="bg-slate-800/50 border-slate-700 p-4 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${war.status === 'active' ? 'text-green-400' : 'text-slate-400'}`}>
                                    {war.status.toUpperCase()}
                                </span>
                                <span className="text-white font-bold">VS [{opponent?.tag}] {opponent?.name}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                Score: <span className="text-blue-400">{war.challenger_score}</span> - <span className="text-red-400">{war.defender_score}</span>
                            </div>
                        </div>
                        
                        {war.status === 'pending' && !isChallenger && isLeader && (
                            <div className="flex gap-2">
                                <Button size="sm" variant="destructive" onClick={() => handleRespond(war.id, false)}>Decline</Button>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleRespond(war.id, true)}>Accept</Button>
                            </div>
                        )}
                        {war.status === 'pending' && isChallenger && (
                            <span className="text-xs text-slate-500">Waiting for response...</span>
                        )}
                    </Card>
                );
            })}
        </div>
    );
};
