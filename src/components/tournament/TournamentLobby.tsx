/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { TournamentService } from '@/services/TournamentService';
import { Tournament, TournamentMatch } from '@/types/tournament';
import { TournamentBracket } from './TournamentBracket';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Trophy, Users, Plus, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export const TournamentLobby = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [bracketMatches, setBracketMatches] = useState<TournamentMatch[]>([]);
  const [view, setView] = useState<'list' | 'bracket'>('list');

  // Create Form State
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    const data = await TournamentService.getTournaments();
    setTournaments(data);
  };

  const handleCreate = async () => {
    if (!newName) return;
    const id = await TournamentService.createTournament(newName, 'chess', 8);
    if (id) {
      toast({ title: 'Tournament Created' });
      loadTournaments();
      setNewName('');
    }
  };

  const handleJoin = async (id: string) => {
    const success = await TournamentService.joinTournament(id);
    if (success) {
      toast({ title: 'Joined successfully!' });
      loadTournaments();
    } else {
      toast({ title: 'Failed to join' });
    }
  };

  const handleStart = async (id: string) => {
    const res = await TournamentService.startTournament(id);
    if (res.error) {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: 'Tournament Started!', description: 'Bracket generated.' });
      loadTournaments();
      viewBracket(id);
    }
  };

  const viewBracket = async (id: string) => {
    setSelectedTournament(id);
    const matches = await TournamentService.getBracket(id);
    setBracketMatches(matches);
    setView('bracket');
  };

  return (
    <div className='p-8 max-w-6xl mx-auto text-white'>
      {/* Header */}
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-4xl font-black italic uppercase flex items-center gap-3'>
            <Trophy className='text-yellow-500 w-10 h-10' />
            Tournaments
          </h1>
          <p className='text-slate-400'>Compete for glory and prizes.</p>
        </div>

        {view === 'bracket' && (
          <Button variant='outline' onClick={() => setView('list')}>
            Back to Lobby
          </Button>
        )}

        {view === 'list' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className='bg-yellow-500 hover:bg-yellow-600 text-black font-bold'>
                <Plus className='w-4 h-4 mr-2' /> Create Tournament
              </Button>
            </DialogTrigger>
            <DialogContent className='bg-slate-900 border-slate-700 text-white'>
              <h2 className='text-xl font-bold mb-4'>Create Tournament</h2>
              <Input
                placeholder='Tournament Name'
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className='bg-slate-800 border-slate-600 mb-4'
              />
              <Button onClick={handleCreate} className='w-full bg-yellow-500 text-black'>
                Create
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Content */}
      {view === 'list' ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {tournaments.map((t) => (
            <Card
              key={t.id}
              className='bg-slate-900 border-slate-700 p-6 flex flex-col gap-4 hover:border-indigo-500 transition-colors'
            >
              <div className='flex justify-between items-start'>
                <div>
                  <h3 className='text-xl font-bold'>{t.name}</h3>
                  <div className='flex gap-2 mt-1'>
                    <span className='text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded uppercase'>
                      {t.gameType}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded uppercase ${t.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
                <Trophy className='text-slate-700 w-8 h-8' />
              </div>

              <div className='flex items-center gap-2 text-slate-400 text-sm'>
                <Users className='w-4 h-4' />
                <span>
                  {t.currentPlayers} / {t.maxPlayers} Players
                </span>
              </div>

              <div className='mt-auto flex gap-2'>
                {t.status === 'registration' && (
                  <>
                    <Button className='flex-1' onClick={() => handleJoin(t.id)}>
                      Join
                    </Button>
                    {/* Only creator should see this really */}
                    {t.createdBy === user?.id && (
                      <Button
                        variant='secondary'
                        className='px-3'
                        onClick={() => handleStart(t.id)}
                      >
                        <Play className='w-4 h-4' />
                      </Button>
                    )}
                  </>
                )}
                {(t.status === 'active' || t.status === 'completed') && (
                  <Button variant='secondary' className='w-full' onClick={() => viewBracket(t.id)}>
                    View Bracket
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {tournaments.length === 0 && (
            <p className='text-slate-500'>No active tournaments. Create one!</p>
          )}
        </div>
      ) : (
        <TournamentBracket matches={bracketMatches} />
      )}
    </div>
  );
};
