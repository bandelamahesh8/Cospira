# Windows Development Guide - Cloud Browser

## ⚠️ Important: Platform Compatibility

The **Cloud Browser** feature requires **Linux** because it uses:

- **Xvfb** (X Virtual Frame Buffer) - Linux-only virtual display
- **PulseAudio** - Linux audio system
- **FFmpeg** - Video encoding
- **Chromium** at `/usr/bin/chromium`

## 🪟 Windows Development Options

### Option 1: Docker Desktop (Recommended)

Docker Desktop provides a Linux environment on Windows:

```powershell
# 1. Install Docker Desktop for Windows
# Download from: https://www.docker.com/products/docker-desktop

# 2. Enable WSL 2 backend (in Docker Desktop settings)

# 3. Build and run
docker-compose up --build

# 4. Access the app
# Open http://localhost:5173
```

**Pros:**

- ✅ Full cloud browser with audio
- ✅ Production-like environment
- ✅ Easy to deploy later

**Cons:**

- ❌ Requires Docker Desktop
- ❌ Uses more resources

### Option 2: WSL2 (Windows Subsystem for Linux)

Run the server in WSL2:

```powershell
# 1. Install WSL2
wsl --install -d Ubuntu

# 2. Enter WSL2
wsl

# 3. Inside WSL2, install dependencies
sudo apt-get update
sudo apt-get install -y xvfb pulseaudio ffmpeg chromium nodejs npm

# 4. Clone your project to WSL2
cd ~
git clone <your-repo>
cd COSPIRA_MAIN

# 5. Install dependencies
npm install
cd server && npm install && cd ..

# 6. Start services
export DISPLAY=:99
Xvfb :99 -screen 0 1280x720x24 &
pulseaudio --start

# 7. Run server (in WSL2)
cd server && npm run dev

# 8. Run client (in Windows PowerShell)
# Open new PowerShell window
npm run dev
```

**Pros:**

- ✅ Full cloud browser with audio
- ✅ Native Linux environment
- ✅ Free

**Cons:**

- ❌ More setup required
- ❌ Need to manage two terminals

### Option 3: Screenshot Mode (Current Fallback)

The server now automatically falls back to screenshot mode on Windows:

```powershell
# Just run normally
npm run dev
```

**What you get:**

- ✅ Virtual browser works
- ✅ Mouse/keyboard input works
- ✅ Most websites work
- ❌ **No audio** (screenshot mode limitation)
- ❌ Lower quality (JPEG vs WebM)
- ❌ Higher latency

**Server logs will show:**

```
⚠️  CloudBrowserManager not available (requires Linux + Chromium)
📸 Falling back to VirtualBrowserManager (screenshot mode)
💡 For full cloud browser with audio, use Docker or deploy to Linux
```

## 🎯 Recommended Workflow

### For Development (Windows)

1. **Use Screenshot Mode** for quick testing

   ```powershell
   npm run dev
   ```

2. **Use Docker** when you need to test audio
   ```powershell
   docker-compose up
   ```

### For Production (Linux Server)

Deploy to a Linux server where full cloud browser works:

```bash
# On Linux server
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Current Status

Your server is now **smart** and will:

1. ✅ **Detect platform** (Windows/Linux)
2. ✅ **Check for Chromium** at Linux paths
3. ✅ **Use CloudBrowserManager** if on Linux with Chromium
4. ✅ **Fall back to VirtualBrowserManager** on Windows
5. ✅ **Log which mode** it's using

## 📝 What to Do Now

### Quick Test (Screenshot Mode)

```powershell
# 1. Restart the server
# Stop current server (Ctrl+C)
npm run dev

# 2. Check server logs
# You should see:
# "📸 Falling back to VirtualBrowserManager (screenshot mode)"

# 3. Test in browser
# - Create/join room
# - Click "Virtual Browser"
# - Navigate to Google (works)
# - Try YouTube (video works, no audio)
```

### Full Test (Docker)

```powershell
# 1. Build Docker image
cd server
docker build -f Dockerfile.browser -t cospira-browser .

# 2. Run with docker-compose
cd ..
docker-compose up

# 3. Test in browser
# - Create/join room
# - Click "Virtual Browser"
# - Navigate to YouTube
# - Audio should work! 🎵
```

## 🎉 Summary

| Mode                | Platform     | Audio  | Quality | Setup   |
| ------------------- | ------------ | ------ | ------- | ------- |
| **Cloud Browser**   | Linux/Docker | ✅ Yes | High    | Complex |
| **Screenshot Mode** | Windows      | ❌ No  | Medium  | Easy    |

**For Windows development:** Use screenshot mode for quick testing, Docker for full features.

**For production:** Always use Linux/Docker for full cloud browser with audio.

## 🚀 Next Steps

1. ✅ **Test screenshot mode** - Already working!
2. ⏭️ **Install Docker Desktop** - For full features
3. ⏭️ **Deploy to Linux** - For production

The fallback is now in place, so your app works on Windows (without audio) and automatically upgrades to full cloud browser when deployed to Linux! 🎊
