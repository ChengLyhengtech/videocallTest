# WebRTC Video & Audio Call Tester (React + Vite + Tailwind CSS + SignalR)

A standalone single-page application built with React, Vite, and Tailwind CSS designed for testing real-time WebRTC peer-to-peer **Audio and Video calls** using an ASP.NET Core SignalR backend.

---

## 🚀 Key Capabilities

- **Audio & Video Call Modes**:
  - **Audio Call (Voice Only)**: Initiates an audio-only WebRTC session (`offerToReceiveVideo: false`) with a dedicated voice UI featuring animated soundwave ripples, audio equalizer visualization, caller avatar, and live timer.
  - **Video Call**: Full two-way video + audio peer-to-peer stream with Picture-in-Picture and Side-by-Side Split View modes.
- **Fail-Safe Media Acquisition**:
  - Smart hardware device detection (`navigator.mediaDevices.enumerateDevices`).
  - **Virtual Synthetic Media Stream Fallback**: If no physical webcam or microphone is connected (e.g. desktop PCs or VMs), the app automatically generates an animated canvas radar stream and an oscillator audio track so WebRTC testing **never fails with `NotFoundError: Requested device not found`**.
- **Real Backend Authentication (`POST /api/auth/login`)**:
  - Authenticates with real user credentials (Email, Username, or Cambodian Phone Number).
  - Automatically generates and persists RFC4122 v4 `clientDeviceId` (Guid) in `localStorage`.
  - Displays `userId` (Guid), `username`, and token expiration time.
  - 1-click **Copy User ID** badge for quick peer calling.
- **SignalR Hub Integration (`@microsoft/signalr`)**:
  - Connects to `http://localhost:5201/hubs/videocall` (configurable).
  - Supplies JWT Bearer authentication via `accessTokenFactory` (`?access_token=...` on WebSockets and `Authorization: Bearer` on HTTP negotiation).
  - Configurable Transport mode: **Auto (WebSockets + LongPolling)**, **WebSockets Only**, or **LongPolling Only**.
- **WebRTC Signaling Protocol**:
  - `SendVideoOffer(targetUserId, offer)` ⇄ `ReceiveVideoOffer(senderUserId, offer)`
  - `SendVideoAnswer(targetUserId, answer)` ⇄ `ReceiveVideoAnswer(senderUserId, answer)`
  - `SendIceCandidate(targetUserId, candidate.toJSON())` ⇄ `ReceiveIceCandidate(senderUserId, candidate)`
  - `EndVideoCall(targetUserId)` ⇄ `ReceiveCallEnded(senderUserId)`
  - Queued ICE candidate buffer prevents race conditions before `setRemoteDescription`.

---

## 📁 Project Structure

```
reactjs_VideoCallTest/
├── index.html
├── vite.config.js                     # Configured with proxy to http://localhost:5201
├── package.json
├── README.md
└── src/
    ├── main.jsx
    ├── index.css
    ├── App.jsx                        # Main coordinator & layout
    ├── components/
    │   ├── Header.jsx                 # Top bar with User ID copy & status badges
    │   ├── ConnectionPanel.jsx        # Real login (/api/auth/login), token & transport
    │   ├── CallInitiationPanel.jsx    # Audio Call & Video Call start buttons
    │   ├── VideoGrid.jsx              # Dedicated Voice Call UI & Video Grid canvas
    │   ├── MediaControls.jsx          # Mic Mute, Camera, Screen Share, Hang Up
    │   ├── IncomingCallModal.jsx      # Voice vs Video incoming call dialog
    │   └── LogsConsole.jsx            # Live WebRTC/SignalR event logger
    ├── hooks/
    │   └── useWebRTC.js               # Audio/Video WebRTC peer connection manager
    ├── services/
    │   ├── authService.js             # Real user login API & device binding
    │   └── signalrService.js          # @microsoft/signalr client manager
    └── utils/
        ├── jwtHelper.js               # Token decoder & mock JWT generator
        └── mediaHelper.js             # Hardware detection & synthetic media fallback
```

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Vite Development Server
```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🧪 Testing Audio Calls (2 Browser Windows)

1. **Browser 1 (Account 1):**
   - Open `http://localhost:5173`.
   - Log in with Account 1.
   - Click **Connect to Video Hub**.
2. **Browser 2 (Account 2):**
   - Open an **Incognito / Private Window** at `http://localhost:5173`.
   - Log in with Account 2.
   - Click the **ID badge** in the header to copy Account 2's User ID (Guid).
3. **Start Audio Call:**
   - In Browser 1, paste Account 2's User ID into **Target User ID**.
   - Click **Audio Call** (Cyan button).
   - Browser 2 receives the **Incoming Audio Call** dialog with the `🎙️ Voice Call` badge.
   - Click **Accept Audio**.
   - The dedicated Voice Call screen activates with animated audio equalizer waves and two-way voice streaming!
