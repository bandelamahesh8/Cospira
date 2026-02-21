import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BrainService } from '@/services/BrainService';
import { DecisionEngine } from '@/services/DecisionEngine';
import { MetaEvolutionService } from '@/services/MetaEvolutionService';
import { SocialGraphService } from '@/services/SocialGraphService';
import { PlatformOptimizer } from '@/services/PlatformOptimizer';
import { CospiraBrainLoop } from '@/services/CospiraBrainLoop';
import { BrainControlService } from '@/services/BrainControlService';
import { ReinforcementService } from '@/services/ReinforcementService';
import { useAuth } from '@/hooks/useAuth';
import { 
    Brain, Activity, Shield, Zap, Globe, FlaskConical, TrendingUp 
} from 'lucide-react';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface DecisionOutcome {
    id: string;
    decision_type: string;
    outcome: 'IMPROVED' | 'WORSENED' | 'NEUTRAL';
    reward_score: number;
}

interface SocialNode {
    id: string;
    influence_score: number;
    cluster_id: string;
}

export const BrainDashboard = () => {
    const { user } = useAuth();
    const [dna, setDna] = useState<any | null>(null);
    const [predictions, setPredictions] = useState<any | null>(null);
    const [decision, setDecision] = useState<any | null>(null);
    const [meta, setMeta] = useState<any[]>([]);
    const [mutations, setMutations] = useState<any[]>([]);
    const [actions, setActions] = useState<any[]>([]);
    const [distributions, setDistributions] = useState<any>(null);
    const [_outcomes, setOutcomes] = useState<DecisionOutcome[]>([]);
    const [_forecast, setForecast] = useState<any[]>([]);
    const [_social, setSocial] = useState<SocialNode | null>(null);
    const [health, setHealth] = useState<any | null>(null);
    const [isLoopRunning, setIsLoopRunning] = useState(false);
    const [simulationLog, _setSimulationLog] = useState<string[]>([]);

    const loadIntel = useCallback(async () => {
        if (!user) return;
        
        try {
            // Trigger analysis first
            await BrainService.analyzePlayer(user.id);
            await BrainService.updateDistributions(user.id);
            
            // Trigger Meta Evolution
            await MetaEvolutionService.evolveMeta('chess');
            
            const d = await BrainService.getPlayerDNA?.(user.id);
            if (d) setDna(d);

            const dist = await BrainService.getProbabilisticState(user.id);
            if (dist) setDistributions(dist);

            const p = await BrainService.getPredictions(user.id);
            if (p) {
                setPredictions(p);
                const dec = await DecisionEngine.decide(user.id);
                setDecision(dec);
                if (dec.action !== 'NONE') {
                    await BrainControlService.executeAction('INTERVENE_PLAYER', user.id, dec);
                    await ReinforcementService.simulateFeedbackLoop(user.id, dec.action);
                }
            }

            const mut = await MetaEvolutionService.getPendingMutations();
            if (mut) {
                setMutations(mut);
                if (mut.length > 0) {
                    await BrainControlService.executeAction('APPLY_MUTATION', mut[0].strategy_key, mut[0].mutation_suggestion);
                }
            }

            const m = await BrainService.getGlobalIntel?.();
            if (m) setMeta(m);

            const log = await BrainControlService.getActionLog();
            if (log) setActions(log);

            const out = await ReinforcementService.getLearningStats();
            if (out) setOutcomes(out);

            const f = await MetaEvolutionService.getMetaForecast();
            if (f) setForecast(f);

            const s = await SocialGraphService.updateSocialMetrics(user.id);
            if (s) setSocial(s);

            const h = await PlatformOptimizer.calculateHealth();
            if (h) setHealth(h);
        } catch (error) {
            console.error('Error loading intelligence:', error);
        }
    }, [user]);

    useEffect(() => {
        loadIntel();
    }, [loadIntel]);

    const runAutonomousLoop = async () => {
        setIsLoopRunning(true);
        await CospiraBrainLoop.runAutonomousCycle();
        await loadIntel();
        setTimeout(() => setIsLoopRunning(false), 2000);
    };

    return (
        <div className="p-6 bg-slate-950 min-h-screen text-slate-200 font-sans selection:bg-purple-500/30">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* HEAD: Autonomous Status */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                         <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 uppercase tracking-tighter">
                             Cospira<span className="text-white">Brain</span>
                         </h1>
                         <div className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-2">
                             STATUS: <span className="text-green-400 animate-pulse">AUTONOMOUS</span> 
                             <span className="text-slate-700">|</span> 
                             VERSION: <span className="text-purple-400">3.0 (GOD_MODE)</span>
                         </div>
                    </div>
                    <div>
                        <button 
                             onClick={runAutonomousLoop}
                             disabled={isLoopRunning}
                             className={cn("px-4 py-2 rounded text-xs font-bold uppercase tracking-wider border transition-all",
                                 isLoopRunning 
                                    ? "bg-indigo-500 text-white border-indigo-500 shadow-[0_0_20px_#6366f1]" 
                                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/50 hover:bg-indigo-500 hover:text-white"
                             )}
                        >
                            {isLoopRunning ? "Processing Cycle..." : "Trigger Autonomous Loop"}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Player DNA */}
                <Card className="bg-slate-900 border-cyan-500/30 p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Activity className="text-cyan-400" /> Player Intelligence
                    </h2>

                    {dna ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Play Style</span>
                                <span className="text-xl font-bold uppercase tracking-widest text-white border-b-2 border-cyan-500">
                                    {dna.play_style}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <span>Aggression Index</span>
                                    <span>{(dna.aggression_index * 100).toFixed(0)}%</span>
                                </div>
                                <Progress value={dna.aggression_index * 100} className="h-2 bg-slate-800" />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <span>Consistency Score</span>
                                    <span>{(dna.consistency_score * 100).toFixed(0)}%</span>
                                </div>
                                <Progress value={dna.consistency_score * 100} className="h-2 bg-slate-800" />
                            </div>
                        </div>
                    ) : (
                        <div className="text-slate-500 italic">Analyzing Match History...</div>
                    )}
                </Card>

                {/* 2. AI Precognition */}
                <Card className="bg-slate-900 border-purple-500/30 p-6 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 shadow-[0_0_10px_#a855f7]"></div>
                     <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Brain className="text-purple-400" /> AI Precognition
                     </h2>
                    
                     {predictions ? (
                         <div className="space-y-6">
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="bg-black/30 p-3 rounded-lg border border-purple-500/20">
                                     <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Tilt Probability</div>
                                     <div className={cn("text-2xl font-mono", predictions.tilt_probability > 0.5 ? "text-red-500" : "text-green-500")}>
                                         {(predictions.tilt_probability * 100).toFixed(1)}%
                                     </div>
                                 </div>
                                 <div className="bg-black/30 p-3 rounded-lg border border-purple-500/20">
                                     <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Churn Risk</div>
                                     <div className={cn("text-2xl font-mono", predictions.churn_probability > 0.5 ? "text-red-500" : "text-green-500")}>
                                         {(predictions.churn_probability * 100).toFixed(1)}%
                                     </div>
                                 </div>
                             </div>
                             
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <span>Forecasted Win Rate</span>
                                    <div className="text-right">
                                        <span className="text-purple-400">{(predictions.win_probability * 100).toFixed(1)}%</span>
                                        {distributions && (
                                            <span className="text-slate-600 ml-2 text-[10px] font-mono">
                                                (σ ±{(distributions.skill_sigma / 20).toFixed(1)}%)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Progress value={predictions.win_probability * 100} className="h-2 bg-slate-800" />
                            </div>
                         </div>
                     ) : <div className="text-slate-500 italic">Running Predictive Models...</div>}
                </Card>

                {/* 3. Decision Engine */}
                <Card className={cn("p-6 relative overflow-hidden border transition-all duration-500", 
                    decision?.action !== 'NONE' ? "bg-red-950/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.1)]" : "bg-slate-900 border-emerald-500/30"
                )}>
                    <div className={cn("absolute top-0 left-0 w-full h-1 shadow-[0_0_10px]", 
                        decision?.action !== 'NONE' ? "bg-red-500 shadow-red-500" : "bg-emerald-500 shadow-emerald-500"
                    )}></div>
                    
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Zap className={cn("w-5 h-5", decision?.action !== 'NONE' ? "text-red-400" : "text-emerald-400")} /> 
                        Cortex Decision Layer
                    </h2>

                    {decision ? (
                        <div className="flex items-center justify-between">
                             <div>
                                 <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Current Protocol</div>
                                 <div className={cn("text-2xl font-black tracking-tight", decision.action !== 'NONE' ? "text-white" : "text-slate-400")}>
                                     {decision.action.replace(/_/g, ' ')}
                                 </div>
                                 <div className="text-sm text-slate-400 mt-2 font-mono">
                                     Reason: <span className="text-white">{decision.reason}</span>
                                 </div>
                             </div>
                             
                             <div className="text-right">
                                 <div className="text-xs text-slate-500 uppercase font-bold mb-1">Confidence</div>
                                 <div className="text-xl font-mono text-cyan-400">{(decision.confidence * 100).toFixed(0)}%</div>
                             </div>
                        </div>
                    ) : (
                        <div className="text-slate-500 italic">Awaiting Cortex Input...</div>
                    )}
                </Card>

                {/* 4. Meta Analysis */}
                <Card className="md:col-span-2 bg-slate-900 border-yellow-500/30 p-6 relative">
                     <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 shadow-[0_0_10px_#eab308]"></div>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <TrendingUp className="text-yellow-400" /> Self-Evolving Meta Engine
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="overflow-x-auto">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Live Strategy Performance</h3>
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-500">
                                        <th className="pb-2 font-bold uppercase">Strategy</th>
                                        <th className="pb-2 font-bold uppercase text-right">Win Rate</th>
                                        <th className="pb-2 font-bold uppercase text-right">Trend</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {meta.slice(0, 5).map((m: any) => (
                                        <tr key={m.strategy_key} className="hover:bg-white/5">
                                            <td className="py-2 text-slate-300 capitalize">{m.strategy_key.replace('_', ' ')}</td>
                                            <td className={cn("py-2 text-right font-mono", m.win_rate > 0.6 ? "text-red-400" : "text-cyan-400")}>
                                                {(m.win_rate * 100).toFixed(1)}%
                                            </td>
                                            <td className="py-2 text-right">
                                                {m.trend_score > 0 ? (
                                                    <span className="text-green-500">▲</span>
                                                ) : (
                                                    <span className="text-red-500">▼</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="border-l border-slate-800 pl-8">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <Activity className="w-3 h-3 text-yellow-500" /> Active Mutations
                            </h3>
                            
                            {mutations && mutations.length > 0 ? (
                                <div className="space-y-3">
                                    {mutations.map((mut: any) => (
                                        <div key={mut.id} className="bg-yellow-950/20 border border-yellow-500/20 p-3 rounded text-sm mb-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-yellow-200 font-bold capitalize">{mut.strategy_key.replace('_', ' ')}</span>
                                                <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded", mut.mutation_suggestion.action === 'nerf' ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400")}>
                                                    {mut.mutation_suggestion.action.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="text-slate-400 text-xs italic">
                                                "{mut.mutation_suggestion.reason}"
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-slate-600 italic text-sm py-4">No active mutations required.</div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* 5. System Command Log */}
                <Card className="md:col-span-1 bg-black border border-slate-800 p-4 font-mono text-xs h-64 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-4 text-slate-500 border-b border-slate-800 pb-2 sticky top-0 bg-black">
                        <Shield className="w-4 h-4" /> SYSTEM_COMMAND_LOG
                    </div>
                    {actions.map((log: any) => (
                        <div key={log.id} className="mb-2 flex gap-3 text-slate-400">
                            <span className="text-slate-600">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                            <span className={cn("font-bold", 
                                log.action_type === 'APPLY_MUTATION' ? "text-yellow-500" :
                                log.action_type === 'INTERVENE_PLAYER' ? "text-red-500" : "text-blue-500"
                            )}>{log.action_type}</span>
                        </div>
                    ))}
                    {actions.length === 0 && <div className="text-slate-700">System monitoring...</div>}
                </Card>

                {/* 6. Global Platform Health */}
                <Card className="md:col-span-2 bg-gradient-to-r from-indigo-900 to-slate-900 border-indigo-500/50 p-6 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_#6366f1]"></div>
                     <div className="flex justify-between items-start mb-6">
                         <div>
                             <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                                 <Globe className="text-indigo-400" /> Global Platform Optimization
                             </h2>
                             <p className="text-xs text-indigo-300 font-mono mt-1 opacity-70">
                                 OBJECTIVE: 0.4*RET + 0.3*QUAL + 0.2*FAIR + 0.1*REV
                             </p>
                         </div>
                         <div className="text-right">
                             <div className="text-3xl font-black text-white tracking-widest">
                                 {health ? (health.total_score * 100).toFixed(1) : "..."}
                             </div>
                             <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Global Health</div>
                         </div>
                     </div>

                     {health ? (
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div className="bg-indigo-950/30 p-3 rounded border border-indigo-500/20 text-center">
                                 <div className="text-lg font-bold text-blue-400">{(health.retention_rate * 100).toFixed(1)}%</div>
                                 <div className="text-[10px] text-slate-500 uppercase">Retention</div>
                             </div>
                             <div className="bg-indigo-950/30 p-3 rounded border border-indigo-500/20 text-center">
                                 <div className="text-lg font-bold text-green-400">{(health.match_quality * 100).toFixed(1)}%</div>
                                 <div className="text-[10px] text-slate-500 uppercase">Match Quality</div>
                             </div>
                             <div className="bg-indigo-950/30 p-3 rounded border border-indigo-500/20 text-center">
                                 <div className="text-lg font-bold text-purple-400">{(health.fairness_index * 100).toFixed(1)}%</div>
                                 <div className="text-[10px] text-slate-500 uppercase">Fairness</div>
                             </div>
                             <div className="bg-indigo-950/30 p-3 rounded border border-indigo-500/20 text-center">
                                 <div className="text-lg font-bold text-yellow-400">${health.revenue_daily.toFixed(0)}</div>
                                 <div className="text-[10px] text-slate-500 uppercase">Daily Revenue</div>
                             </div>
                         </div>
                     ) : (
                         <div className="text-center py-4 text-indigo-300 animate-pulse">Calculating...</div>
                     )}
                </Card>

                {/* 7. Simulation Console */}
                <Card className="md:col-span-3 bg-black border border-green-500/20 p-4 font-mono text-xs">
                     <div className="flex items-center gap-2 mb-2 text-green-500 border-b border-green-900/30 pb-2">
                         <FlaskConical className="w-4 h-4" /> SIMULATION_ENGINE // DIGITAL TWIN
                     </div>
                     <div className="h-32 overflow-y-auto space-y-1">
                         {simulationLog.map((line, i) => (
                             <div key={i} className="text-green-400/80">&gt; {line}</div>
                         ))}
                         {simulationLog.length === 0 && <span className="text-slate-700 animate-pulse">Waiting for policy generation...</span>}
                     </div>
                </Card>
            </div>
        </div>
    </div>
    );
};
