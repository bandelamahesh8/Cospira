# PHASE 7 IMPLEMENTATION PLAN: AI ASSISTANT

**Status**: 🔴 NOT STARTED
**Last Updated**: 2026-01-10

---

## 🎯 OBJECTIVE

Create a context-aware AI Assistant that acts as a co-host, helping users manage meetings and extract value through natural language commands or explicit interactions.

---

## 🛠️ TASKS

### 1. Command Parser (`AssistantService.js`)

- [ ] Implement robust command detection (NLP or keyword-based).
- [ ] Core Commands:
  - `/summarize` - Summarize the last 10 minutes.
  - `/poll "Question" "Option A" "Option B"` - Create a poll.
  - `/timer 25` - Start a countdown.
  - `/mute-all` - Emergency mute (Host only).

### 2. Context Aggregation

- [ ] Feed the Assistant with:
  - Current Room Mode (Smart Rooms data).
  - Last 5-10 minutes of transcripts.
  - Pending action items.

### 3. Socket Integration (`assistant.socket.js`)

- [ ] Listen for assistant-specific mentions or chat commands.
- [ ] Respond with AI-generated feedback within the chat window.

---

## 🤖 ASSISTANT PERSONA

Helpful, concise, and proactive. Avoids general chit-chat; focuses strictly on room productivity and safety.

---

## ✅ ACCEPTANCE CRITERIA

1. Users can invoke the assistant via chat commands.
2. The assistant successfully creates polls/timers as requested.
3. The assistant can provide a context-aware summary of the current session on demand.
4. Host-exclusive commands are strictly permission-checked.
