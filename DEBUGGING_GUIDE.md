# SFU System Hotfix - Verification & Debugging Guide

This guide ensures that the critical hotfixes for the SFU (video/audio) system are working correctly.

## 🚀 Correct Start Sequence

Always start services in this order:

1.  **Server:**

    ```bash
    cd server
    npm restart
    ```

2.  **Web App:**

    ```bash
    npm run dev
    ```

3.  **Mobile App:**
    ```bash
    cd mobile-app
    npm run android
    # OR
    npm run ios
    ```

---

## 🧪 Verification Protocol

### Test A: Mobile ↔ Web Basic Call

1.  **Open Web App:** Create a room (e.g., "TestRoom").
2.  **Open Mobile App:** Join "TestRoom".
3.  **Mobile:** Enable Mic.
    - _Check:_ Does Web hear audio?
    - _Check:_ Is Camera still OFF on Mobile? (Fixes "Mic turns on camera" bug)
4.  **Mobile:** Turn on Video.
    - _Check:_ Can Web see mobile video?
    - _Check:_ Can Mobile see self-preview?
5.  **Web:** Turn on Video.
    - _Check:_ Can Mobile see web video? (**Critical:** Check for crash here)

### Test B: Stress Test (Hotfix Validation)

1.  **Both devices:** Turn EVERYTHING OFF (Mic/Video).
2.  **Mobile:** Toggle Video ON -> OFF -> ON (Repeat 5 times).
    - _Pass Criteria:_ App does not crash. Video restores every time.
3.  **Cross-Toggle:**
    - Mobile enables Audio ONLY.
    - Web enables Video ONLY.
    - _Pass Criteria:_ Correct types received (Audio-only icon on Web for Mobile user).

---

## 🛠 Troubleshooting

### 1. Mobile Crash on Web Join

- **Cause:** Old `useSFU.js` hook managing tracks incorrectly.
- **Fix Verification:** Check `mobile-app/src/hooks/useSFU.js`. It should have `videoTrackRef` and `audioTrackRef` (separate refs, not just `localStreamRef`).

### 2. Audio Not Hearing

- **Cause:** Producer paused or not resuming.
- **Debug:** Check Server Console:
  ```
  [SFU] New producer: ... kind: audio
  ```
  If you don't see this, the Mobile/Web client didn't send the produce request.

### 3. "Callback is not a function" Error (Server)

- **Cause:** `SFUHandler.js` mismatch with client version.
- **Fix Verification:** Ensure `SFUHandler.js` has `callback({ id: producer.id })` in the produce handler, not `return callback(...)`.

### 4. Video Freezes/Black Screen

- **Cause:** Keyframe request failed.
- **Fix:** Toggle video off/on. The new logic requests a KeyFrame (`sfu:requestKeyFrame`) automatically on consume.

---

## 📜 Logs to Watch

**Server Terminal:**

```
[SFU] Worker created
[SFU] Router created for room ...
[SFU] newTransport ...
[SFU] produce ... kind: video
[SFU] produce ... kind: audio
```

**React Native Logs (`npx react-native log-android`):**

```
[SFU] Send transport connected
[SFU] Produced video: ...
[SFU] Produced audio: ...
```

---

## 🆘 Emergency Rollback

If critical failure occurs, restore previous files (if backed up) or disable SFU Features in `constants.js` if available.
