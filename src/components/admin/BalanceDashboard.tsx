import { useState, useEffect, useCallback } from 'react';
import { BalanceService } from '@/services/BalanceService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sliders, Save, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const BalanceDashboard = () => {
    const [gameId, setGameId] = useState('chess');
    const [configJson, setConfigJson] = useState('');
    const [loading, setLoading] = useState(false);

    const loadConfig = useCallback(async () => {
        setLoading(true);
        try {
            const data = await BalanceService.getConfig(gameId);
            setConfigJson(JSON.stringify(data, null, 4));
        } catch {
            toast({ title: 'Error', description: 'Failed to load config', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [gameId]); // Now dependent on gameId

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const handleSave = async () => {
        try {
            const parsed = JSON.parse(configJson);
            await BalanceService.updateConfig(gameId, parsed);
            toast({ title: 'Config Updated', description: `New parameters applied to ${gameId}.` });
        } catch (e: unknown) {
             const message = e instanceof Error ? e.message : "Unknown error";
            toast({ title: 'Error', description: 'Invalid JSON or Update Failed: ' + message, variant: 'destructive' });
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto text-white">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
                <Sliders className="w-8 h-8 text-cyan-400" />
                Game Balancing Engine
            </h1>

            <div className="flex gap-4 mb-6">
                <Select value={gameId} onValueChange={setGameId}>
                    <SelectTrigger className="w-[200px] bg-slate-900 border-slate-700">
                        <SelectValue placeholder="Select Game" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                        <SelectItem value="chess">Chess</SelectItem>
                        <SelectItem value="ludo">Ludo</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" onClick={loadConfig} disabled={loading} className="border-slate-700">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card className="bg-slate-900 border-slate-700 p-6">
                <label className="text-sm font-bold text-slate-400 mb-2 block">
                    Configuration (JSON)
                </label>
                <Textarea 
                    value={configJson}
                    onChange={(e) => setConfigJson(e.target.value)}
                    className="font-mono text-sm min-h-[400px] bg-slate-950 border-slate-800 text-green-400"
                />
                
                <div className="mt-4 flex justify-end">
                    <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                        <Save className="w-4 h-4 mr-2" />
                        Apply Changes
                    </Button>
                </div>
            </Card>
        </div>
    );
};
