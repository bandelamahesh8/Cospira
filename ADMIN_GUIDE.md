# Cospira Admin Dashboard Guide

**Version:** 1.0.0
**Role:** Infrastructure Control & Operations
**Access Route:** `/COSPERA_ADMIN88/login`

## 🔐 Security Overview

Cospira Prime (Admin System) operates as a separate oversight layer atop the realtime mesh. It bypasses standard socket namespaces to deliver direct operational control.

- **Authentication:** Protected by a dedicated `ADMIN_KEY` (currently hardcoded for MVP as `Mahesh@7648`).
- **Authorization:** `x-admin-key` header required for all REST API configuration endpoints.
- **God Mode:** Direct Socket.IO access allows overriding any user session or room state immediately.

---

## ⚡ Command Zone

The Command Zone is a hidden panel (toggle above tabs) granting root-level control over the server's lifecycle.
Actions here require a "Hold-to-Confirm" interaction (3 seconds) to prevent accidental execution.

| Command         | Icon | Impact Level | Description                                                                           |
| :-------------- | :--: | :----------: | :------------------------------------------------------------------------------------ |
| **Force Sync**  |  🔄  |     LOW      | Broadcasts a reload signal to all clients. Useful after minor deployments.            |
| **Lockdown**    |  🔒  |    MEDIUM    | Prevents ALL new sockets from connecting. Existing sessions remain active.            |
| **Release**     |  🔓  |     LOW      | Lifts lockdown and kill-switch states. Resumes normal operations.                     |
| **Kill Switch** |  💀  |   CRITICAL   | **1. Locks System.** **2. Disconnects ALL non-admin users.** Use only in emergencies. |

---

## 👥 Database & Intelligence

The dashboard integrates real-time presence detection with persistent user records.

### Presence States

- **Live User:** Detected in `activeRooms`. Shows a green pulsing indicator.
- **Offline User:** Exists in database but not currently in a room.
- **Guest:** User inside a room without a registered profile.

### Intelligence Features

- **Search:** Instant filtering by Name, Email, or UUID.
- **Filtering:** "Active Only" toggle to see who is online right now.
- **Banishment:** One-click removal of any user from any room directly from the list.

---

## 🛠️ Environment Editor (New)

A built-in editor for the server's `.env` file allows changing configuration without SSH access.

1.  **Tab:** `Config` (Purple Terminal Icon)
2.  **Capabilities:**
    - View current `.env` of the running server.
    - Edit API Keys, Secrets, and Domain configs.
    - **Auto-Backup:** Creates a `.backup` file before every save.
3.  **Warning:** Changes here require a **Manual Server Restart** to take effect.

---

## 🚀 Deployment Notes

When deploying Cospira with these features:

1.  Ensure `ADMIN_KEY` is rotated or moved to an environment variable in production.
2.  The "Environment Editor" gives root access. Secure the `/api/admin/*` routes at the firewall level if necessary.
3.  Redis Persistence is now **Required** (even if emulated in memory) for system flags like `lockdown` to survive restarts.
