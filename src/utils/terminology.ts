/**
 * COSPIRA TERMINOLOGY CONSTANTS
 * Single source of truth for UI text to ensure consistency.
 * Reference: .agent/TERMINOLOGY_GOVERNANCE.md
 */

export const TERMINOLOGY = {
  // Entities
  ROOM: 'Room',
  HOST: 'Host',
  SUPER_HOST: 'Super Host',
  PARTICIPANT: 'Participant',
  SESSION: 'Session',
  INTELLIGENCE: 'Intelligence', // Not "Summary"

  // Actions
  END_SESSION: 'End Session',
  DISBAND_ROOM: 'Disband Room',
  PRESENT: 'Present',

  // UI Elements
  COMMAND_DECK: 'Command Deck',
  VIRTUAL_BROWSER: 'Virtual Browser',

  // Feedback
  CONNECTING: 'Establishing Link',
  WAITING_FOR_HOST: 'Waiting for Host',
} as const;

export const UI_TEXT = {
  // Room Status
  STATUS_LIVE: 'Live Room',
  STATUS_UPCOMING: 'Upcoming',
  STATUS_PAUSED: 'Paused',
  STATUS_ENDED: 'Ended',

  // Modal Titles
  INTELLIGENCE_REPORT: 'Intelligence Report', // vs "Meeting Summary"

  // Placeholders
  CHAT_PLACEHOLDER: 'Send a message...',
} as const;
