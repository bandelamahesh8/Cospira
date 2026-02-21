const ROOM_ID_REGEX = /^[a-zA-Z0-9-_]{3,80}$/;

export function sanitizeRoomId(roomId) {
  return typeof roomId === 'string' && ROOM_ID_REGEX.test(roomId) ? roomId : null;
}
