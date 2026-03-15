import { motion } from 'framer-motion';
import { CircularGallery } from '@/components/ui/circular-gallery-2';
import chess from '@/assets/chess_game_poster_1769337462731.png';
import carrom from '@/assets/carrom_poster_v2.png';
import kart from '@/assets/kart_racing_poster.png';
import ludo from '@/assets/ludo_poster_v2.png';
import connect4 from '@/assets/connect4_poster_1769337496441.png';
import tictactoe from '@/assets/tictactoe_poster_1769337515157.png';

const GAMES = [
  { id: 'chess',    text: 'Grand Chess',     image: chess,    elo: 'S-Tier', genre: 'Strategy', players: '2', color: '#6366f1' },
  { id: 'carrom',  text: 'Carrom Elite',    image: carrom,   elo: 'A-Tier', genre: 'Arcade',   players: '4', color: '#8b5cf6' },
  { id: 'kart',    text: 'Kart Racing',     image: kart,     elo: 'A-Tier', genre: 'Racing',   players: '4', color: '#f59e0b' },
  { id: 'ludo',    text: 'Ludo Pro',        image: ludo,     elo: 'B-Tier', genre: 'Board',    players: '4', color: '#10b981' },
  { id: 'connect4', text: 'Connect Four',   image: connect4, elo: 'B-Tier', genre: 'Puzzle',   players: '2', color: '#ef4444' },
  { id: 'xoxo',   text: 'Ultimate XOXO',   image: tictactoe,elo: 'C-Tier', genre: 'Classic',  players: '2', color: '#a78bfa' },
  { id: 'snake',   text: 'Apex Serpents',   image: chess,    elo: 'B-Tier', genre: 'Arcade',   players: '4', color: '#22c55e' },
  { id: 'checkers', text: 'Checkers Pro',    image: chess,    elo: 'B-Tier', genre: 'Strategy', players: '2', color: '#e879f9' },
  { id: 'billiards', text: 'Pro Billiards',  image: carrom,   elo: 'B-Tier', genre: 'Skill',    players: '2', color: '#06b6d4' },
  { id: 'uno',     text: 'Classic UNO',     image: carrom,   elo: 'A-Tier', genre: 'Card',     players: '6', color: '#fb923c' },
];

const GameArcade = () => {
  return (
    <section className="hp-section overflow-hidden" style={{ background: '#05060a' }}>
      <div className="hp-orb absolute top-[10%] left-[-5%] w-[600px] h-[500px]"
        style={{ background: 'rgba(139,92,246,0.05)' }} />

      <div className="hp-container relative z-10 w-full">
        <div className="hp-section-label">
          <span>04</span>
          <div className="hp-section-label-line" />
          <span>Game Arcade</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center mb-0">
          <motion.h2
            className="hp-h2"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            10 games.{' '}
            <span className="hp-grad-violet">One room.</span>
          </motion.h2>
          <motion.p
            className="hp-body"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Launch any game mid-call. ELO ranking, global leaderboards, and tournament
            brackets are built in. Switch games without leaving the room.
          </motion.p>
        </div>

        {/* Circular Gallery Integration with vanishing edges */}
        <div className="relative h-[700px] w-full mt-[-50px] [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent pointer-events-none" />
          <CircularGallery
            items={GAMES}
            bend={3}
            borderRadius={0.08}
            scrollSpeed={2.5}
            scrollEase={0.03}
          />
        </div>

        <div className="flex justify-center gap-12 mt-4 text-white/20 font-mono text-[10px] uppercase tracking-widest">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span>Scroll to explore</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>Tap to select</span>
           </div>
        </div>
      </div>
    </section>
  );
};

export default GameArcade;
