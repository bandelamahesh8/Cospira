#!/bin/bash
set -e

echo "🚀 Starting Cloud Browser Container..."

# Start PulseAudio
echo "🔊 Starting PulseAudio..."
pulseaudio --start --exit-idle-time=-1 --log-target=stderr &
sleep 2

# Start Xvfb (Virtual Display)
echo "🖥️ Starting Xvfb on display :99..."
Xvfb :99 -screen 0 1280x720x24 -ac +extension GLX +render -noreset &
sleep 2

# Start window manager (optional, helps with some sites)
echo "🪟 Starting Fluxbox window manager..."
DISPLAY=:99 fluxbox &
sleep 1

echo "✅ Cloud Browser environment ready!"
echo "   - Display: $DISPLAY"
echo "   - PulseAudio: $PULSE_SERVER"

# Execute the main command
exec "$@"
