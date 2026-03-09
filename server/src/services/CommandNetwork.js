/**
 * Command Network — Cospira Advanced Neural Controls
 *
 * Implements a multi-room hierarchy where Command Rooms can observe,
 * broadcast to, lock, and control child (operational) rooms.
 *
 * Architecture:
 *   Command Room
 *     ├─ Operations Room A
 *     ├─ Operations Room B
 *     └─ Operations Room C
 */

import logger from '../logger.js';
import { Room } from '../models/Room.js';
import stateMachine from './RoomStateMachine.js';

class CommandNetwork {
  constructor() {
    // In-memory graph: commandRoomId → Set<childRoomId>
    this.networkGraph = new Map();
    // Reverse index: childRoomId → commandRoomId
    this.childToParent = new Map();
  }

  // ─── Network Setup ────────────────────────

  /**
   * Link child rooms to a command room, creating a network.
   * @param {string} commandRoomId
   * @param {string[]} childRoomIds
   * @returns {Promise<{ success: boolean, linked: string[] }>}
   */
  async createCommandNetwork(commandRoomId, childRoomIds = []) {
    const commandRoom = await Room.findByRoomId(commandRoomId);
    if (!commandRoom) throw new Error(`Command room ${commandRoomId} not found.`);

    // Mark room as command room
    commandRoom.isCommandRoom = true;
    await commandRoom.save();

    if (!this.networkGraph.has(commandRoomId)) {
      this.networkGraph.set(commandRoomId, new Set());
    }

    const linked = [];
    for (const childId of childRoomIds) {
      await this._linkChild(commandRoomId, childId, commandRoom);
      linked.push(childId);
    }

    logger.info(`[CommandNetwork] Command room ${commandRoomId} linked to ${linked.length} child rooms.`);
    return { success: true, commandRoomId, linked };
  }

  /**
   * Add a single child room to an existing command network.
   * @param {string} commandRoomId
   * @param {string} childRoomId
   */
  async addChildRoom(commandRoomId, childRoomId) {
    const commandRoom = await Room.findByRoomId(commandRoomId);
    if (!commandRoom) throw new Error(`Command room ${commandRoomId} not found.`);
    await this._linkChild(commandRoomId, childRoomId, commandRoom);
    return { success: true };
  }

  /**
   * Remove a child room from the network.
   * @param {string} commandRoomId
   * @param {string} childRoomId
   */
  async removeChildRoom(commandRoomId, childRoomId) {
    const children = this.networkGraph.get(commandRoomId);
    if (children) children.delete(childRoomId);
    this.childToParent.delete(childRoomId);

    const childRoom = await Room.findByRoomId(childRoomId);
    if (childRoom) {
      childRoom.parentRoomId = null;
      await childRoom.save();
    }

    return { success: true };
  }

  // ─── Command Operations ───────────────────

  /**
   * Broadcast a message from the command room to ALL child rooms.
   * @param {string} commandRoomId
   * @param {object} message     - { text, type }
   * @param {object} io          - Socket.io server instance
   * @returns {{ success: boolean, broadcastTo: string[] }}
   */
  broadcastToNetwork(commandRoomId, message, io) {
    const children = this.networkGraph.get(commandRoomId);
    if (!children || children.size === 0) {
      return { success: false, reason: 'No child rooms in network.' };
    }

    const broadcastTo = [];
    for (const childRoomId of children) {
      if (io) {
        io.to(childRoomId).emit('command:broadcast', {
          from:      commandRoomId,
          message,
          timestamp: new Date().toISOString(),
        });
      }
      broadcastTo.push(childRoomId);
    }

    logger.info(`[CommandNetwork] Broadcast from ${commandRoomId} to ${broadcastTo.length} rooms.`);
    return { success: true, broadcastTo };
  }

  /**
   * Lock all child rooms in the network (emergency control).
   * @param {string} commandRoomId
   * @param {object} io
   * @returns {Promise<{ lockedRooms: string[] }>}
   */
  async lockNetwork(commandRoomId, io) {
    const children = this.networkGraph.get(commandRoomId);
    if (!children || children.size === 0) return { lockedRooms: [] };

    const lockedRooms = [];

    for (const childRoomId of children) {
      try {
        const room = await Room.findByRoomId(childRoomId);
        if (room && room.state !== 'ENDED') {
          await stateMachine.transition(room, 'LOCKED', commandRoomId);
          if (io) {
            io.to(childRoomId).emit('room:state_changed', {
              state:       'LOCKED',
              triggeredBy: `command_room:${commandRoomId}`,
              reason:      'Emergency lock from command network.',
            });
          }
          lockedRooms.push(childRoomId);
        }
      } catch (err) {
        logger.error(`[CommandNetwork] Failed to lock child room ${childRoomId}: ${err.message}`);
      }
    }

    // Also notify the command room itself
    if (io) {
      io.to(commandRoomId).emit('command:network_locked', { lockedRooms });
    }

    logger.info(`[CommandNetwork] Locked ${lockedRooms.length} rooms from ${commandRoomId}`);
    return { lockedRooms };
  }

  /**
   * End all sessions in the network.
   * @param {string} commandRoomId
   * @param {object} io
   * @returns {Promise<{ endedRooms: string[] }>}
   */
  async endAllSessions(commandRoomId, io) {
    const children = this.networkGraph.get(commandRoomId);
    if (!children || children.size === 0) return { endedRooms: [] };

    const endedRooms = [];

    for (const childRoomId of children) {
      try {
        const room = await Room.findByRoomId(childRoomId);
        if (room) {
          await stateMachine.transition(room, 'ENDED', commandRoomId);
          if (io) {
            io.to(childRoomId).emit('room:ended', {
              reason:    'Session ended by command network.',
              commandBy: commandRoomId,
            });
          }
          endedRooms.push(childRoomId);
        }
      } catch (err) {
        logger.error(`[CommandNetwork] Failed to end child room ${childRoomId}: ${err.message}`);
      }
    }

    if (io) {
      io.to(commandRoomId).emit('command:all_sessions_ended', { endedRooms });
    }

    return { endedRooms };
  }

  /**
   * Inject a speaker from the command room into a child room.
   * The speaker appears in the target room without leaving the command room.
   * @param {string} commandRoomId
   * @param {string} targetRoomId
   * @param {string} userId
   * @param {object} io
   */
  injectSpeaker(commandRoomId, targetRoomId, userId, io) {
    const children = this.networkGraph.get(commandRoomId);
    if (!children?.has(targetRoomId)) {
      return { success: false, reason: 'Target room is not in this command network.' };
    }

    if (io) {
      // Notify target room of injected speaker
      io.to(targetRoomId).emit('command:speaker_injected', {
        userId,
        fromRoomId: commandRoomId,
        timestamp:  new Date().toISOString(),
      });

      // Confirm to command room
      io.to(commandRoomId).emit('command:speaker_injection_confirmed', {
        userId,
        targetRoomId,
      });
    }

    logger.info(`[CommandNetwork] Speaker ${userId} injected into ${targetRoomId} from ${commandRoomId}`);
    return { success: true };
  }

  // ─── Observability ────────────────────────

  /**
   * Get live status of all rooms in the network.
   * @param {string} commandRoomId
   * @returns {Promise<{ rooms: Array, totals: object }>}
   */
  async getNetworkStatus(commandRoomId) {
    const children = this.networkGraph.get(commandRoomId);
    if (!children || children.size === 0) {
      return { rooms: [], totals: { participants: 0, rooms: 0, activeSpeakers: 0 } };
    }

    const rooms = [];
    let totalParticipants = 0;

    for (const childRoomId of children) {
      try {
        const room = await Room.findByRoomId(childRoomId);
        if (room) {
          const activeMembers = room.members?.filter(m => m.status === 'active').length ?? 0;
          totalParticipants += activeMembers;
          rooms.push({
            roomId:          room.roomId,
            name:            room.name,
            state:           room.state ?? 'LIVE',
            participantCount: activeMembers,
            duration:        room.totalDuration ?? 0,
            purpose:         room.purpose,
          });
        }
      } catch (err) {
        logger.error(`[CommandNetwork] Status fetch failed for ${childRoomId}: ${err.message}`);
      }
    }

    return {
      rooms,
      totals: {
        participants: totalParticipants,
        rooms:        rooms.length,
      },
    };
  }

  /**
   * Get the command room for a given child room.
   * @param {string} childRoomId
   * @returns {string|null} commandRoomId or null
   */
  getCommandRoom(childRoomId) {
    return this.childToParent.get(childRoomId) ?? null;
  }

  /**
   * Get all child rooms for a command room.
   * @param {string} commandRoomId
   * @returns {string[]}
   */
  getChildRooms(commandRoomId) {
    return [...(this.networkGraph.get(commandRoomId) ?? [])];
  }

  /**
   * Check if a room is part of any command network.
   * @param {string} roomId
   * @returns {boolean}
   */
  isInNetwork(roomId) {
    return this.networkGraph.has(roomId) || this.childToParent.has(roomId);
  }

  // ─── Helpers ──────────────────────────────

  async _linkChild(commandRoomId, childRoomId, commandRoom) {
    const children = this.networkGraph.get(commandRoomId) ?? new Set();
    children.add(childRoomId);
    this.networkGraph.set(commandRoomId, children);
    this.childToParent.set(childRoomId, commandRoomId);

    // Persist parentRoomId on child document
    const childRoom = await Room.findByRoomId(childRoomId);
    if (childRoom) {
      childRoom.parentRoomId = commandRoomId;
      await childRoom.save();
    }

    logger.debug(`[CommandNetwork] Linked child ${childRoomId} to command ${commandRoomId}`);
  }
}

export default new CommandNetwork();
