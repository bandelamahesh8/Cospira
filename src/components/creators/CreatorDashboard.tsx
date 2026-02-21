import React, { useEffect, useState } from 'react';
import { CreatorService, CreatorProfile } from '@/services/CreatorService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, DollarSign, Copy, Star } from 'lucide-react';

export const CreatorDashboard = ({ userId }: { userId: string }) => {
    const [profile, setProfile] = useState<CreatorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [applyCode, setApplyCode] = useState('');
    const [applyName, setApplyName] = useState('');

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        const data = await CreatorService.getDashboard(userId);
        setProfile(data);
        setLoading(false);
    };

    const handleApply = async () => {
        try {
            await CreatorService.apply(userId, applyCode, applyName);
            loadData();
        } catch (e) {
            console.error(e);
            alert("Application failed. Code might be taken.");
        }
    };

    if (loading) return <div className="p-8 text-center text-cyan-400 animate-pulse">Loading Creator Data...</div>;

    // 1. Application Form
    if (!profile) {
        return (
            <div className="max-w-2xl mx-auto p-6 space-y-6">
                <Card className="bg-black/80 border border-purple-500/30 p-8 text-center backdrop-blur-md">
                    <Star className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                        Become a Cospira Partner
                    </h1>
                    <p className="text-slate-400 mb-8">
                        Earn revenue from every purchase your followers make.
                        Join the elite circle of chaos architects.
                    </p>

                    <div className="space-y-4 text-left max-w-md mx-auto">
                        <div>
                            <label className="text-xs text-purple-400 font-mono">DISPLAY NAME</label>
                            <Input 
                                value={applyName}
                                onChange={e => setApplyName(e.target.value)}
                                className="bg-slate-900 border-purple-900" 
                                placeholder="e.g. Ninja" 
                            />
                        </div>
                        <div>
                             <label className="text-xs text-purple-400 font-mono">REQUESTED CODE</label>
                            <Input 
                                value={applyCode}
                                onChange={e => setApplyCode(e.target.value)}
                                className="bg-slate-900 border-purple-900 font-mono uppercase" 
                                placeholder="e.g. NINJA" 
                            />
                        </div>
                        <Button 
                            onClick={handleApply}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                        >
                            Submit Application
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // 2. Pending State
    if (profile.status === 'PENDING') {
        return (
            <div className="p-8 text-center">
                <Card className="bg-black/50 border border-yellow-500/30 p-8 inline-block">
                    <h2 className="text-xl text-yellow-400 mb-2">Application Under Review</h2>
                    <p className="text-slate-400">Code: <span className="font-mono text-white">{profile.creator_code}</span></p>
                </Card>
            </div>
        );
    }

    // 3. Dashboard
    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">{profile.display_name}</h1>
                    <div className="flex items-center gap-2 text-cyan-400 font-mono text-sm">
                        CODE: {profile.creator_code}
                        <Copy className="w-4 h-4 cursor-pointer hover:text-white" />
                    </div>
                </div>
                <div className="bg-purple-900/40 px-4 py-2 rounded-full border border-purple-500/30 text-xs text-purple-300">
                    PARTNER STATUS: {profile.status}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-black/60 border border-green-500/20 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-500/10 text-green-400">
                            <DollarSign className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Total Earnings</p>
                            <p className="text-2xl font-bold text-white">${profile.total_earnings_usd.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="bg-black/60 border border-blue-500/20 p-6">
                     <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Supporters</p>
                            <p className="text-2xl font-bold text-white">{profile.follower_count}</p>
                        </div>
                    </div>
                </Card>

                <Card className="bg-black/60 border border-purple-500/20 p-6">
                     <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-purple-500/10 text-purple-400">
                            <Star className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Revenue Share</p>
                            <p className="text-2xl font-bold text-white">{(profile.revenue_share_pct * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                </Card>
            </div>
            
            {/* Recent Activity / Graph Placeholder */}
            <Card className="bg-black/40 border border-white/10 p-6 h-64 flex items-center justify-center text-slate-500">
                [Earnings Graph - Coming Soon]
            </Card>
        </div>
    );
};
