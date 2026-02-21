# COSPIRA Backend API Endpoints Guide

This document outlines all the API endpoints needed to support the mobile app features.

## Authentication Endpoints

### POST /api/auth/register
- **Description**: Register a new user
- **Body**: `{ email, username, displayName, password }`
- **Response**: `{ user, token }`

### POST /api/auth/login
- **Description**: Login user
- **Body**: `{ email, password }`
- **Response**: `{ user, token }`

### POST /api/auth/logout
- **Description**: Logout user
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true }`

### GET /api/auth/me
- **Description**: Get current user profile
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ user }`

## Friends Endpoints

### GET /api/friends
- **Description**: Get user's friends list
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ friends: [{ id, displayName, avatar, presence }] }`

### POST /api/friends/request
- **Description**: Send friend request
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ targetUserId, message? }`
- **Response**: `{ request }`

### GET /api/friends/requests
- **Description**: Get friend requests
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ requests: [{ id, sender, message, createdAt }] }`

### POST /api/friends/accept
- **Description**: Accept friend request
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ requestId }`
- **Response**: `{ friendship }`

### POST /api/friends/decline
- **Description**: Decline friend request
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ requestId }`
- **Response**: `{ success: true }`

### DELETE /api/friends/remove
- **Description**: Remove friend
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ friendId }`
- **Response**: `{ success: true }`

### GET /api/friends/search
- **Description**: Search for users
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `q=<search_query>`
- **Response**: `{ users: [{ id, displayName, username, avatar }] }`

### GET /api/friends/presence
- **Description**: Get friends presence
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ presence: { userId: { status, lastSeen, currentRoom } } }`

### POST /api/friends/invite
- **Description**: Invite friend to room
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ friendId, roomId }`
- **Response**: `{ success: true }`

## Tournament Endpoints

### GET /api/tournaments
- **Description**: Get tournaments list
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `status=<upcoming|live|completed>&gameType=<type>`
- **Response**: `{ tournaments: [{ id, name, gameType, status, startTime, participants }] }`

### POST /api/tournaments
- **Description**: Create tournament
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ name, gameType, maxParticipants, startTime, endTime, entryFee?, prizePool? }`
- **Response**: `{ tournament }`

### GET /api/tournaments/:id
- **Description**: Get tournament details
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ tournament, participants, matches }`

### POST /api/tournaments/:id/join
- **Description**: Join tournament
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, participant }`

### POST /api/tournaments/:id/leave
- **Description**: Leave tournament
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true }`

### GET /api/tournaments/:id/matches
- **Description**: Get tournament matches
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ matches: [{ id, round, players, status, winner }] }`

### GET /api/tournaments/:id/leaderboard
- **Description**: Get tournament leaderboard
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ leaderboard: [{ rank, user, points, wins }] }`

### POST /api/tournaments/matches/:id/result
- **Description**: Submit match result
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ winnerId, score, gameData? }`
- **Response**: `{ success: true }`

## Game Endpoints

### POST /api/games/create
- **Description**: Create game session
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ gameType, roomId?, tournamentMatchId?, players, settings? }`
- **Response**: `{ gameSession }`

### GET /api/games/:id
- **Description**: Get game session details
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ gameSession, moves, currentState }`

### POST /api/games/:id/move
- **Description**: Submit game move
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ move, timeTaken? }`
- **Response**: `{ success: true, gameState }`

### POST /api/games/:id/finish
- **Description**: End game session
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ winner, finalScore, reason }`
- **Response**: `{ success: true }`

### GET /api/games/history
- **Description**: Get user's game history
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `limit=<number>&offset=<number>&gameType=<type>`
- **Response**: `{ games: [{ id, gameType, result, date, opponent }] }`

## AI Endpoints

### POST /api/ai/summary
- **Description**: Generate AI summary
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ type, data, options? }`
- **Response**: `{ summary, confidence }`

### POST /api/ai/analyze
- **Description**: Analyze gameplay
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ gameData, playerData }`
- **Response**: `{ analysis, insights }`

### POST /api/ai/matchmaking
- **Description**: Find optimal match
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ playerProfile, preferences? }`
- **Response**: `{ matches, quality, waitTime }`

### POST /api/ai/moderate
- **Description**: Moderate content
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ content, contentType }`
- **Response**: `{ moderation, action }`

### POST /api/ai/predict
- **Description**: Predict tournament outcome
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ tournamentData, participantData }`
- **Response**: `{ predictions, confidence }`

## Room Endpoints

### GET /api/rooms
- **Description**: Get accessible rooms
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `type=<meeting|game|watch>&limit=<number>`
- **Response**: `{ rooms: [{ id, title, type, participants, isActive }] }`

### POST /api/rooms
- **Description**: Create room
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ title, type, gameType?, isPrivate?, maxParticipants?, settings? }`
- **Response**: `{ room }`

### GET /api/rooms/:id
- **Description**: Get room details
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ room, members, messages }`

### POST /api/rooms/:id/join
- **Description**: Join room
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, member }`

### POST /api/rooms/:id/leave
- **Description**: Leave room
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true }`

## Message Endpoints

### GET /api/rooms/:id/messages
- **Description**: Get room messages
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `limit=<number>&before=<message_id>`
- **Response**: `{ messages: [{ id, sender, content, type, createdAt }] }`

### POST /api/rooms/:id/messages
- **Description**: Send message
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ content, type?, metadata? }`
- **Response**: `{ message }`

## Notification Endpoints

### GET /api/notifications
- **Description**: Get user notifications
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `unread=<true|false>&limit=<number>`
- **Response**: `{ notifications: [{ id, type, title, message, isRead, createdAt }] }`

### POST /api/notifications/:id/read
- **Description**: Mark notification as read
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true }`

### POST /api/notifications/read-all
- **Description**: Mark all notifications as read
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true }`

## User Profile Endpoints

### GET /api/user/profile
- **Description**: Get user profile
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ user, stats, achievements }`

### PUT /api/user/profile
- **Description**: Update user profile
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ displayName?, bio?, avatarUrl? }`
- **Response**: `{ user }`

### GET /api/user/stats
- **Description**: Get user statistics
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ games, wins, losses, rating, achievements }`

### GET /api/user/settings
- **Description**: Get user settings
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ settings }`

### PUT /api/user/settings
- **Description**: Update user settings
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ theme?, language?, notifications?, gamePreferences? }`
- **Response**: `{ settings }`

## Sync Endpoints

### POST /api/sync/friends
- **Description**: Sync friends data
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ lastSync }`
- **Response**: `{ friends, requests, presence }`

### POST /api/sync/tournaments
- **Description**: Sync tournaments data
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ lastSync }`
- **Response**: `{ tournaments, matches, participations }`

### POST /api/sync/ai
- **Description**: Sync AI data
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ lastSync }`
- **Response**: `{ summaries, analysis }`

## Leaderboard Endpoints

### GET /api/leaderboards
- **Description**: Get leaderboards
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `gameType=<type>&period=<daily|weekly|monthly|all_time>`
- **Response**: `{ leaderboard: [{ rank, user, rating, wins, points }] }`

### GET /api/leaderboards/global
- **Description**: Get global leaderboard
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `limit=<number>&offset=<number>`
- **Response**: `{ leaderboard: [{ rank, user, rating, country }] }`

## WebSocket Events

### Connection
- **Event**: `connect`
- **Data**: `{ token }`
- **Response**: `{ userId, socketId }`

### Presence
- **Event**: `update_presence`
- **Data**: `{ status, currentRoom?, metadata? }`

- **Event**: `presence_update`
- **Data**: `{ userId, presence }`

### Friends
- **Event**: `friend_request_received`
- **Data**: `{ request }`

- **Event**: `friend_request_accepted`
- **Data**: `{ friendship }`

### Games
- **Event**: `game_move`
- **Data**: `{ gameId, playerId, move, timestamp }`

- **Event**: `game_update`
- **Data**: `{ gameId, gameState, currentPlayer }`

- **Event**: `game_end`
- **Data**: `{ gameId, winner, result }`

### Tournaments
- **Event**: `tournament_created`
- **Data**: `{ tournament }`

- **Event**: `tournament_updated`
- **Data**: `{ tournament }`

- **Event**: `match_created`
- **Data**: `{ match }`

### Rooms
- **Event**: `room_update`
- **Data**: `{ roomId, update }`

- **Event**: `user_joined`
- **Data**: `{ roomId, user }`

- **Event**: `user_left`
- **Data**: `{ roomId, user }`

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

Common error codes:
- `UNAUTHORIZED` - Invalid or missing token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input data
- `CONFLICT` - Resource conflict
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Rate Limiting

- **Authentication**: 5 requests per minute
- **Friends**: 30 requests per minute
- **Games**: 60 requests per minute
- **Messages**: 100 requests per minute
- **AI**: 10 requests per minute

## Pagination

List endpoints support pagination:
- `limit` - Number of items (default: 20, max: 100)
- `offset` - Number of items to skip (default: 0)

Response format:
```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 100,
    "hasMore": true
  }
}
```

## Implementation Notes

1. All endpoints require authentication except `/api/auth/*`
2. Use JWT tokens for authentication
3. Implement proper input validation
4. Add rate limiting to prevent abuse
5. Use database transactions for complex operations
6. Implement proper error handling and logging
7. Add caching for frequently accessed data
8. Monitor API performance and usage

This API structure supports all the mobile app features and ensures proper data synchronization between frontend and backend.
