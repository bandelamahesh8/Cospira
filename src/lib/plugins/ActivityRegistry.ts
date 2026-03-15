import React, { lazy } from 'react';

export interface ActivityManifest {
  id: string;
  name: string;
  category: 'game' | 'utility' | 'ai';
  component: React.LazyExoticComponent<React.ComponentType<unknown>>;
  poster?: string;
  icon?: string;
}

class ActivityRegistry {
  private activities: Map<string, ActivityManifest> = new Map();

  register(manifest: ActivityManifest) {
    this.activities.set(manifest.id, manifest);
  }

  getActivity(id: string): ActivityManifest | undefined {
    return this.activities.get(id);
  }

  getAllActivities(): ActivityManifest[] {
    return Array.from(this.activities.values());
  }

  getActivitiesByCategory(category: ActivityManifest['category']): ActivityManifest[] {
    return this.getAllActivities().filter((a) => a.category === category);
  }
}

const registry = new ActivityRegistry();

// Lazy load all games
registry.register({
  id: 'chess',
  name: 'Grand Chess',
  category: 'game',
  component: lazy(() => import('@/components/games/ChessGame')),
});

registry.register({
  id: 'carrom',
  name: 'Carrom Elite',
  category: 'game',
  component: lazy(() => import('@/components/games/CarromGame')),
});

registry.register({
  id: 'connect4',
  name: 'Connect Four',
  category: 'game',
  component: lazy(() => import('@/components/games/ConnectFourGame')),
});

registry.register({
  id: 'ludo',
  name: 'Ludo Pro',
  category: 'game',
  component: lazy(() => import('@/components/games/ludo/LudoGame')),
});

registry.register({
  id: 'snakeladder',
  name: 'Apex Serpents',
  category: 'game',
  component: lazy(() => import('@/components/games/snakeladder/SnakeLadderBoard')),
});

registry.register({
  id: 'xoxo',
  name: 'Tic-Tac-Toe',
  category: 'game',
  component: lazy(() => import('@/components/games/TicTacToe')),
});

registry.register({
  id: 'kart-racing',
  name: 'Apex Karts',
  category: 'game',
  component: lazy(() => import('@/components/games/KartGame')),
});

export default registry;
