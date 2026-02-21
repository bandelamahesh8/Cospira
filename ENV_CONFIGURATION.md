# Environment Configuration Guide

This document details all the environment variables required to run Cospira.
You must create a `.env` file in the **root directory** of the project (where `package.json` is located).

---

## ⚠️ Important Note

**NEVER commit your `.env` file to GitHub.** It contains sensitive API keys and secrets. This file is already ignored by `.gitignore` by default.

---

## 1. Client-Side Variables (Frontend)

These variables are bundled with the React application. They **must** start with `VITE_`.

| Variable                        | Description                                   | Value to Change?                          |
| :------------------------------ | :-------------------------------------------- | :---------------------------------------- |
| `VITE_SUPABASE_URL`             | The unique URL for your Supabase project.     | **YES** (Get from Supabase Dashboard)     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public API key for your Supabase project.     | **YES** (Get from Supabase Dashboard)     |
| `VITE_API_URL`                  | The address of your local/production backend. | **NO** (Default: `http://localhost:8080`) |
| `VITE_SITE_URL`                 | The address of your frontend (for redirects). | **NO** (Default: `http://localhost:5173`) |

---

## 2. Server-Side Variables (Backend)

These variables configure the Node.js server and are **not** visible to the browser.

| Variable     | Description                                      | Value to Change?                           |
| :----------- | :----------------------------------------------- | :----------------------------------------- |
| `PORT`       | The port the backend server listens on.          | **Optional** (Default: `8080`)             |
| `CLIENT_URL` | The URL of the frontend (for CORS).              | **NO** (Default: `http://localhost:5173`)  |
| `NODE_ENV`   | Environment mode (`development` / `production`). | **Automated** (Usually handled by scripts) |

---

## 3. Database & Services (Advanced)

| Variable       | Description                                     | Value to Change?                                   |
| :------------- | :---------------------------------------------- | :------------------------------------------------- |
| `REDIS_URL`    | Connection string for Redis (optional for dev). | **YES** (If using Redis for scaling)               |
| `ADMIN_SECRET` | Secret key for the Admin Panel.                 | **HIGHLY RECOMMENDED** (Default: Hardcoded in dev) |

---

## 4. Complete `.env` Template

Copy and paste the code below into a file named `.env` in your root folder.

```ini
# ------------------------------
# FRONTEND CONFIGURATION (Vite)
# ------------------------------

# 1. Supabase Connection (REQUIRED)
# Go to Supabase > Project Settings > API
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-anon-key-here

# 2. API Connection
# Point this to your backend server
VITE_API_URL=http://localhost:8080
VITE_SITE_URL=http://localhost:5173

# ------------------------------
# BACKEND CONFIGURATION
# ------------------------------

# 1. Server Settings
PORT=8080
CLIENT_URL=http://localhost:5173

# 2. Virtual Browser Config (Optional)
# If using external browserless.io service instead of local Docker
# BROWSER_WS_ENDPOINT=wss://chrome.browserless.io?token=YOUR-TOKEN

# 3. Security
# Secret key for admin actions (Phase 2 implementation)
ADMIN_SECRET_KEY=change_this_to_something_secure
```

---

## 5. How to Get Your Supabase Keys

1.  Log in to [Supabase](https://supabase.com/).
2.  Create a new project (e.g., "Cospira-Dev").
3.  Go to **Settings (Gear Icon)** -> **API**.
4.  Copy the **Project URL**.
5.  Copy the **Project API Key** (service_role or anon/public). Use `anon` / `public` for `VITE_SUPABASE_ANON_KEY`.

---

## 6. Local Network Testing (Mobile/Laptop)

If you want to test the app on your phone while running it on your PC:

1.  Find your PC's local IP address (e.g., `192.168.1.5`).
2.  Update `.env`:
    ```ini
    VITE_API_URL=http://192.168.1.5:8080
    CLIENT_URL=http://192.168.1.5:5173
    ```
3.  Restart the development server (`npm run dev`).
