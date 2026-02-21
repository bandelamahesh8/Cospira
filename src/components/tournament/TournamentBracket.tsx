import { TournamentMatch } from '@/types/tournament';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TournamentBracketProps {
    matches: TournamentMatch[];
}

export const TournamentBracket = ({ matches }: TournamentBracketProps) => {
    // Group by Round
    const rounds: Record<number, TournamentMatch[]> = {};
    matches.forEach(m => {
        if (!rounds[m.round]) rounds[m.round] = [];
        rounds[m.round].push(m);
    });

    // Ensure sorted keys
    const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

    return (
        <div className="flex gap-16 justify-center items-center py-10 w-full overflow-x-auto min-h-[400px]">
            {roundNumbers.map((r, i) => (
                <div key={r} className="flex flex-col justify-around gap-8 relative" style={{ height: '100%' }}>
                    {/* Round Title */}
                    <div className="absolute -top-10 left-0 right-0 text-center font-bold text-slate-500 uppercase tracking-widest text-xs">
                        {r === roundNumbers.length ? 'Grand Final' : `Round ${r}`}
                    </div>

                    {rounds[r].map((match, idx) => (
                        <div key={match.id} className="relative group">
                            <MatchCard match={match} />
                            
                            {/* Connector Lines (Simple CSS) */}
                            {/* If not final round, draw line to right */}
                            {r !== roundNumbers[roundNumbers.length - 1] && (
                                <div className="absolute top-1/2 -right-8 w-8 h-[2px] bg-slate-700" />
                            )}
                            {/* If not first round, connector adjustment? 
                                Actually, standard brackets are complex to draw perfectly with simple CSS.
                                We'll assume a centered alignment via flex-justify-around which handles vertical spacing naturally like a flex tree.
                            */}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

const MatchCard = ({ match }: { match: TournamentMatch }) => {
    return (
        <Card className="w-48 bg-slate-900 border-slate-700 p-2 flex flex-col gap-1 shadow-lg relative">
            {/* Player 1 */}
            <div className={cn("flex items-center gap-2 p-1 rounded", match.winnerId === match.player1Id && match.winnerId ? "bg-green-900/30 text-green-400" : "")}>
                <Avatar className="w-6 h-6">
                    <AvatarImage src={match.player1?.avatarUrl} />
                    <AvatarFallback className="text-[9px]">{match.player1?.username?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold truncate">{match.player1?.username || 'Waiting...'}</span>
            </div>
            
            <div className="h-px bg-slate-800 w-full" />

            {/* Player 2 */}
            <div className={cn("flex items-center gap-2 p-1 rounded", match.winnerId === match.player2Id && match.winnerId ? "bg-green-900/30 text-green-400" : "")}>
                <Avatar className="w-6 h-6">
                    <AvatarImage src={match.player2?.avatarUrl} />
                    <AvatarFallback className="text-[9px]">{match.player2?.username?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold truncate">{match.player2?.username || 'Waiting...'}</span>
            </div>

            {/* Status Indicator */}
            <div className="absolute top-0 right-0 p-1">
                 {match.status === 'active' && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
            </div>
        </Card>
    );
};
