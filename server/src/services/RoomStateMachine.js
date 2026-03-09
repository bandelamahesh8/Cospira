/**
 * Room State Machine — Cospira Advanced Neural Controls
 *
 * Manages valid room state transitions and auto-applies permission
 * presets for each state. The room self-governs based on its state.
 *
 * States:  CREATED → WAITING → LIVE → PRESENTATION / DISCUSSION → LOCKED → ENDED
 */

import logger from '../logger.js';

// ─────────────────────────────────────────────
// VALID STATES
// ─────────────────────────────────────────────
export const ROOM_STATES = {
  CREATED:      'CREATED',
  WAITING:      'WAITING',
  LIVE:         'LIVE',
  PRESENTATION: 'PRESENTATION',
  DISCUSSION:   'DISCUSSION',
  LOCKED:       'LOCKED',
  ENDED:        'ENDED',
};

// ─────────────────────────────────────────────
// TRANSITION GRAPH
// ─────────────────────────────────────────────
const TRANSITIONS = {
  CREATED:      ['WAITING', 'LIVE'],
  WAITING:      ['LIVE', 'ENDED'],
  LIVE:         ['PRESENTATION', 'DISCUSSION', 'LOCKED', 'ENDED'],
  PRESENTATION: ['LIVE', 'DISCUSSION', 'ENDED'],
  DISCUSSION:   ['LIVE', 'PRESENTATION', 'ENDED'],
  LOCKED:       ['LIVE', 'ENDED'],
  ENDED:        [], // terminal
};

// ─────────────────────────────────────────────
// PERMISSION PRESETS PER STATE
// Each state automatically enforces these constraints.
// ─────────────────────────────────────────────
const STATE_PRESETS = {
  CREATED: {
    mic:            'host_only',
    video:          'host_only',
    screen_share:   'disabled',
    chat:           'disabled',
    join:           'allowed',
    description:    'Room created — waiting for host to start.',
  },
  WAITING: {
    mic:            'disabled',
    video:          'disabled',
    screen_share:   'disabled',
    chat:           'host_only',
    join:           'lobby',       // goes to waiting lobby
    description:    'Participants in lobby — meeting hasn\'t started.',
  },
  LIVE: {
    mic:            'everyone',
    video:          'everyone',
    screen_share:   'host_cohost',
    chat:           'everyone',
    join:           'allowed',
    description:    'Room is live — open collaboration.',
  },
  PRESENTATION: {
    mic:            'host_speaker', // only HOST, COHOST, SPEAKER roles
    video:          'host_speaker',
    screen_share:   'host_only',
    chat:           'moderated',    // chat allowed but monitored
    join:           'allowed',
    description:    'Presentation mode — host and speakers only.',
  },
  DISCUSSION: {
    mic:            'speakers',     // all SpeakerS + HOST + COHOST
    video:          'everyone',
    screen_share:   'host_cohost',
    chat:           'everyone',
    join:           'allowed',
    description:    'Discussion mode — active participant engagement.',
  },
  LOCKED: {
    mic:            'disabled',
    video:          'disabled',
    screen_share:   'disabled',
    chat:           'host_only',
    join:           'rejected',     // new joins rejected
    description:    'Room is locked — no new participants allowed.',
  },
  ENDED: {
    mic:            'disabled',
    video:          'disabled',
    screen_share:   'disabled',
    chat:           'disabled',
    join:           'rejected',
    description:    'Session has ended.',
  },
};

// ─────────────────────────────────────────────
// STATE MACHINE CLASS
// ─────────────────────────────────────────────
class RoomStateMachine {
  /**
   * Check if a state transition is valid.
   * @param {string} currentState
   * @param {string} newState
   * @returns {{ allowed: boolean, reason: string }}
   */
  canTransition(currentState, newState) {
    const allowed = TRANSITIONS[currentState]?.includes(newState) ?? false;
    return {
      allowed,
      reason: allowed
        ? `Transition ${currentState} → ${newState} is valid.`
        : `Transition ${currentState} → ${newState} is not permitted.`,
    };
  }

  /**
   * Transition a room to a new state.
   * Validates the transition, updates the room document, and returns the preset.
   * @param {object} room  - Mongoose Room document
   * @param {string} newState
   * @param {string} triggeredBy - userId or 'policy_engine' / 'auto'
   * @returns {{ success: boolean, state: string, preset: object, reason?: string }}
   */
  async transition(room, newState, triggeredBy = 'host') {
    const currentState = room.state || ROOM_STATES.LIVE;
    const check = this.canTransition(currentState, newState);

    if (!check.allowed) {
      logger.warn(`[StateMachine] Invalid transition ${currentState} → ${newState} in room ${room.roomId}`);
      return { success: false, reason: check.reason, state: currentState };
    }

    room.state = newState;
    room.lastActiveAt = new Date();

    // Record transition in stateHistory array if it exists
    if (Array.isArray(room.stateHistory)) {
      room.stateHistory.push({
        from: currentState,
        to: newState,
        at: new Date(),
        triggeredBy,
      });
    }

    await room.save();

    const preset = this.getPermissions(newState);

    logger.info(`[StateMachine] Room ${room.roomId} → ${newState} (triggered by ${triggeredBy})`);

    return { success: true, state: newState, preset, previousState: currentState };
  }

  /**
   * Get the permission preset for a given state.
   * @param {string} state
   * @returns {object} preset permission object
   */
  getPermissions(state) {
    return STATE_PRESETS[state] ?? STATE_PRESETS.LIVE;
  }

  /**
   * Resolve whether an action is allowed in the current room state.
   * @param {string} state
   * @param {string} action  - e.g. 'MIC_REQUEST', 'SCREEN_SHARE_START', 'USER_JOIN'
   * @param {string} role    - user's authority role
   * @returns {{ allowed: boolean, reason: string }}
   */
  isActionAllowed(state, action, role = 'LISTENER') {
    const preset = this.getPermissions(state);

    switch (action) {
      case 'USER_JOIN': {
        if (preset.join === 'rejected') return { allowed: false, reason: 'Room is locked or ended.' };
        if (preset.join === 'lobby') return { allowed: true, status: 'LOBBY', reason: 'Please wait in the lobby.' };
        return { allowed: true };
      }

      case 'MIC_REQUEST': {
        const mic = preset.mic;
        if (mic === 'disabled') return { allowed: false, reason: `Microphone disabled in ${state} state.` };
        if (mic === 'host_only' && !['HOST'].includes(role)) return { allowed: false, reason: 'Only host may unmute.' };
        if (mic === 'host_speaker' && !['HOST', 'COHOST', 'SPEAKER'].includes(role)) return { allowed: false, reason: 'Only speakers and hosts may unmute.' };
        if (mic === 'speakers' && !['HOST', 'COHOST', 'MODERATOR', 'SPEAKER'].includes(role)) return { allowed: false, reason: 'Only speakers may unmute.' };
        return { allowed: true };
      }

      case 'SCREEN_SHARE_START': {
        const ss = preset.screen_share;
        if (ss === 'disabled') return { allowed: false, reason: `Screen sharing disabled in ${state} state.` };
        if (ss === 'host_only' && !['HOST'].includes(role)) return { allowed: false, reason: 'Only host may share screen.' };
        if (ss === 'host_cohost' && !['HOST', 'COHOST'].includes(role)) return { allowed: false, reason: 'Only host or co-host may share screen.' };
        return { allowed: true };
      }

      case 'CHAT_MESSAGE': {
        const chat = preset.chat;
        if (chat === 'disabled') return { allowed: false, reason: `Chat disabled in ${state} state.` };
        if (chat === 'host_only' && !['HOST'].includes(role)) return { allowed: false, reason: 'Only host may chat.' };
        return { allowed: true };
      }

      default:
        return { allowed: true };
    }
  }

  /**
   * Get all valid states and their presets (for UI).
   * @returns {object}
   */
  getAllStates() {
    return Object.entries(ROOM_STATES).map(([key, value]) => ({
      state: value,
      preset: STATE_PRESETS[value],
      transitions: TRANSITIONS[value],
    }));
  }

  /**
   * Get default state for a new room.
   * @returns {string}
   */
  getDefaultState() {
    return ROOM_STATES.LIVE;
  }
}

export default new RoomStateMachine();
