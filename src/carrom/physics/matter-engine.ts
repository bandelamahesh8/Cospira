/**
 * Matter.js Physics Engine Integration for Deterministic Carrom Simulation
 */

import Matter from 'matter-js';
import { FixedVector2, toFixed, fromFixed, vec2FromFixed, vec2ToFixed } from '../fixed-point';
import { PhysicsBody, BoardConfig, CoinType, CarromGameState } from '../types/game-state';

// Matter.js aliases
const { Engine, World, Bodies, Body, Vector } = Matter;

/** Physics simulation constants */
export const PHYSICS_TIMESTEP = 1000 / 60;
export const MAX_LINEAR_VELOCITY = toFixed(30);
export const MAX_ANGULAR_VELOCITY = toFixed(Math.PI * 8);
export const BOARD_RESTITUTION = toFixed(0.7);
export const LINEAR_DRAG = toFixed(0.015);
export const ANGULAR_DRAG = toFixed(0.015);

export enum CollisionCategory {
  COIN = 0x0001,
  STRIKER = 0x0002,
  BOARD = 0x0004,
  POCKET = 0x0008,
}

interface CircleBody extends Matter.Body {
  circleRadius: number;
}

export class CarromPhysicsEngine {
  private engine: Matter.Engine;
  private world: Matter.World;
  private bodies: Map<string, Matter.Body> = new Map();
  private boardBodies: Matter.Body[] = [];

  constructor() {
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.world.gravity.x = 0;
    this.world.gravity.y = 0;

    this.engine.constraintIterations = 2;
    this.engine.positionIterations = 6;
    this.engine.velocityIterations = 4;
  }

  initializeBoard(boardConfig: BoardConfig): void {
    this.boardBodies.forEach(b => World.remove(this.world, b));
    this.boardBodies = [];

    const { width, height, wallThickness, pockets } = boardConfig;
    const w = fromFixed(width);
    const h = fromFixed(height);
    const wt = fromFixed(wallThickness);

    const wallOptions = {
      isStatic: true,
      restitution: fromFixed(BOARD_RESTITUTION),
      friction: 0.1,
      collisionFilter: { category: CollisionCategory.BOARD }
    };

    const walls = [
      Bodies.rectangle(w / 2, -wt / 2, w + wt * 2, wt, wallOptions),
      Bodies.rectangle(w / 2, h + wt / 2, w + wt * 2, wt, wallOptions),
      Bodies.rectangle(-wt / 2, h / 2, wt, h + wt * 2, wallOptions),
      Bodies.rectangle(w + wt / 2, h / 2, wt, h + wt * 2, wallOptions),
    ];

    const pocketBodies = pockets.map(p => {
      const pos = vec2FromFixed(p.position);
      return Bodies.circle(pos.x, pos.y, fromFixed(p.radius), {
        isStatic: true,
        isSensor: true,
        label: `pocket_${p.id}`,
        collisionFilter: { category: CollisionCategory.POCKET }
      });
    });

    this.boardBodies = [...walls, ...pocketBodies];
    World.add(this.world, this.boardBodies);
  }

  createBody(physicsBody: PhysicsBody): Matter.Body {
    const pos = vec2FromFixed(physicsBody.position);
    const body = Bodies.circle(pos.x, pos.y, fromFixed(physicsBody.radius), {
      restitution: fromFixed(physicsBody.restitution),
      frictionAir: fromFixed(physicsBody.linearDrag),
      density: fromFixed(physicsBody.mass),
      label: physicsBody.type,
      collisionFilter: {
        category: physicsBody.type === 'striker' ? CollisionCategory.STRIKER : CollisionCategory.COIN,
        mask: CollisionCategory.BOARD | CollisionCategory.COIN | CollisionCategory.STRIKER | CollisionCategory.POCKET
      }
    });

    Body.setVelocity(body, vec2FromFixed(physicsBody.velocity));
    Body.setAngularVelocity(body, fromFixed(physicsBody.angularVelocity));
    
    this.bodies.set(physicsBody.id, body);
    World.add(this.world, body);
    return body;
  }

  removeBody(id: string): void {
    const body = this.bodies.get(id);
    if (body) {
      World.remove(this.world, body);
      this.bodies.delete(id);
    }
  }

  syncStateFromGameState(state: CarromGameState): void {
    this.syncBody(state.physics.striker);
    state.physics.coins.forEach(c => this.syncBody(c));
  }

  private syncBody(config: PhysicsBody): void {
    let body = this.bodies.get(config.id);
    if (!body && !config.pocketed) {
      body = this.createBody(config);
    }
    
    if (body) {
      if (config.pocketed) {
        this.removeBody(config.id);
      } else {
        const pos = vec2FromFixed(config.position);
        Body.setPosition(body, pos);
        Body.setVelocity(body, vec2FromFixed(config.velocity));
        Body.setAngularVelocity(body, fromFixed(config.angularVelocity));
      }
    }
  }

  applyForce(id: string, force: FixedVector2): void {
    const body = this.bodies.get(id);
    if (body) {
      Body.applyForce(body, body.position, vec2FromFixed(force));
    }
  }

  step(): void {
    this.bodies.forEach(body => {
      const speed = Vector.magnitude(body.velocity);
      if (speed > fromFixed(MAX_LINEAR_VELOCITY)) {
        const limited = Vector.mult(Vector.normalise(body.velocity), fromFixed(MAX_LINEAR_VELOCITY));
        Body.setVelocity(body, limited);
      }
    });

    Engine.update(this.engine, PHYSICS_TIMESTEP);
  }

  getPhysicsState(): { striker: PhysicsBody | null; coins: PhysicsBody[] } {
    let striker: PhysicsBody | null = null;
    const coins: PhysicsBody[] = [];

    this.bodies.forEach((body, id) => {
      const physicsBody: PhysicsBody = {
        id,
        type: body.label as CoinType,
        position: vec2ToFixed(body.position.x, body.position.y),
        velocity: vec2ToFixed(body.velocity.x, body.velocity.y),
        angularVelocity: toFixed(body.angularVelocity),
        pocketed: false,
        radius: toFixed((body as CircleBody).circleRadius || 0),
        mass: toFixed(body.mass),
        restitution: toFixed(body.restitution),
        linearDrag: toFixed(body.frictionAir),
        angularDrag: ANGULAR_DRAG,
      };

      if (physicsBody.type === 'striker') {
        striker = physicsBody;
      } else {
        coins.push(physicsBody);
      }
    });

    return { striker, coins };
  }

  checkPocketCollisions(): Array<{ bodyId: string; pocketId: number }> {
    const collisions: Array<{ bodyId: string; pocketId: number }> = [];
    this.bodies.forEach((body, bodyId) => {
      this.boardBodies.forEach(boardBody => {
        if (boardBody.isSensor && boardBody.label?.startsWith('pocket_')) {
          const dist = Vector.magnitude(Vector.sub(body.position, boardBody.position));
          if (dist < (body as CircleBody).circleRadius + (boardBody as CircleBody).circleRadius) {
            const pocketId = parseInt(boardBody.label.split('_')[1]);
            collisions.push({ bodyId, pocketId });
          }
        }
      });
    });
    return collisions;
  }

  destroy(): void {
    Engine.clear(this.engine);
    this.bodies.clear();
    this.boardBodies = [];
  }
}