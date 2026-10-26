import React, { useState, useCallback, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import Header from './components/Header';
import ConnectionPanel from './components/ConnectionPanel';
import CallInitiationPanel from './components/CallInitiationPanel';
import VideoGrid from './components/VideoGrid';
import MediaControls from './components/MediaControls';
import IncomingCallModal from './components/IncomingCallModal';
import LogsConsole from './components/LogsConsole';
import { useWebRTC, CallState } from './hooks/useWebRTC';
import { signalRService } from './services/signalrService';
import { extractUserIdFromToken } from './utils/jwtHelper';
import { getSavedAuthSession } from './services/authService';
import { ChevronRight, Info } from 'lucide-react';

export default function App() {
  const [hubUrl, setHubUrl] = useState('http://localhost:5201/hubs/videocall');
  const [jwtToken, setJwtToken] = useState(() => {
    const saved = getSavedAuthSession();
    return saved?.accessToken || '';
  });
  const [currentUserInfo, setCurrentUserInfo] = useState(() => getSavedAuthSession());
  const [targetUserId, setTargetUserId] = useState('');
  const [hubState, setHubState] = useState(signalR.HubConnectionState.Disconnected);
  const [logs, setLogs] = useState([]);
  const [layoutMode, setLayoutMode] = useState('pip'); // 'pip' or 'grid'
  const [showGuide, setShowGuide] = useState(false);

  // Central log append handler
  const handleLog = useCallback((logEntry) => {
    setLogs((prev) => [...prev.slice(-300), logEntry]);
  }, []);

  // WebRTC custom hook with smart fallback & synthetic media stream
  const effectiveUserId = currentUserInfo?.userId || extractUserIdFromToken(jwtToken);

  const {
    callState,
    callType,
    activePeerId,
    incomingCall,
    callEndedNotice,
    dismissCallEndedNotice,
    isAudioMuted,
    isVideoDisabled,
    isScreenSharing,
    isSyntheticStream,
    connectionStatus,
    iceStatus,
    localVideoRef,
    remoteVideoRef,
    startLocalStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  } = useWebRTC(handleLog, currentUserInfo?.username || effectiveUserId || 'User');

  // Sync Hub status from service
  useEffect(() => {
    signalRService.setCallbacks({
      onStatusChange: (status) => setHubState(status),
      onLog: handleLog,
    });
  }, [handleLog]);


  // Connect to SignalR
  const handleConnectHub = async (options = {}) => {
    try {
      await signalRService.connect(hubUrl, jwtToken, options);
    } catch (err) {
      handleLog({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        source: 'SignalR',
        message: `Failed to connect: ${err.message}`,
        type: 'error',
      });
    }
  };

  // Disconnect from SignalR
  const handleDisconnectHub = async () => {
    if (callState !== CallState.IDLE) {
      await endCall(true);
    }
    await signalRService.disconnect();
  };

  // Preview local camera without calling
  const handlePreviewCamera = async () => {
    try {
      await startLocalStream();
    } catch (err) {
      // Logged in hook
    }
  };

  // Start call (Supports 'audio' and 'video')
  const handleStartCall = async (type = 'video') => {
    try {
      await startCall(targetUserId, type);
    } catch (err) {
      // Handled and logged in hook
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        hubState={hubState}
        callState={callState}
        currentUserId={effectiveUserId}
        currentUserInfo={currentUserInfo}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col gap-6">
        {/* Quick Guide Banner (Collapsible) */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowGuide(!showGuide)}>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Info className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                How to test: Real Backend Login vs Dev Mock
              </span>
            </div>
            <button
              type="button"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              {showGuide ? 'Hide Guide' : 'Show Instructions'}
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showGuide ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {showGuide && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-cyan-400 font-mono">
                  <span>1.</span> Real Login (/api/auth/login)
                </div>
                <p className="text-slate-400">
                  Select <strong className="text-slate-200">Real User Login</strong>. Enter your account (Email/Username/Phone) and password. On click, the app automatically posts to <code className="text-cyan-300">/api/auth/login</code>, stores the Bearer token, and connects to the SignalR Hub.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-400 font-mono">
                  <span>2.</span> Call Target User
                </div>
                <p className="text-slate-400">
                  Open an incognito window and log into account #2. Click the user badge to copy Account #2's <strong className="text-slate-200">User ID</strong> (GUID). Paste it into Account #1's <code className="text-indigo-300">Target User ID</code> field.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 font-mono">
                  <span>3.</span> Real-time P2P Video Call
                </div>
                <p className="text-slate-400">
                  Click <strong className="text-emerald-400">Start Video Call</strong>. The second browser receives an instant <strong className="text-slate-200">Incoming Video Call</strong> modal with caller ID. Click <strong className="text-emerald-400">Accept</strong> to start the WebRTC stream!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Main Section: Video Grid & Media Controls (8 cols on lg) */}
          <section className="lg:col-span-8 flex flex-col gap-4">
            {/* The Video / Audio Display Component */}
            <VideoGrid
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
              callState={callState}
              callType={callType}
              activePeerId={activePeerId}
              currentUserId={effectiveUserId}
              isAudioMuted={isAudioMuted}
              isVideoDisabled={isVideoDisabled}
              isSyntheticStream={isSyntheticStream}
              layoutMode={layoutMode}
              callEndedNotice={callEndedNotice}
              onDismissNotice={dismissCallEndedNotice}
            />

            {/* Media Control Toolbar (Bottom of video) */}
            <div className="flex justify-center -mt-2">
              <MediaControls
                isAudioMuted={isAudioMuted}
                isVideoDisabled={isVideoDisabled}
                isScreenSharing={isScreenSharing}
                callState={callState}
                callType={callType}
                layoutMode={layoutMode}
                setLayoutMode={setLayoutMode}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onToggleScreenShare={toggleScreenShare}
                onEndCall={() => endCall(true)}
              />
            </div>

            {/* Event Logs Console (Docked under video) */}
            <LogsConsole logs={logs} onClear={() => setLogs([])} />
          </section>

          {/* Right Section: Connection & Call Panels (4 cols on lg) */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            {/* Connection & Auth Panel */}
            <ConnectionPanel
              hubUrl={hubUrl}
              setHubUrl={setHubUrl}
              jwtToken={jwtToken}
              setJwtToken={setJwtToken}
              hubState={hubState}
              onConnect={handleConnectHub}
              onDisconnect={handleDisconnectHub}
              onLog={handleLog}
              currentUserId={effectiveUserId}
              setCurrentUserInfo={setCurrentUserInfo}
            />

            {/* Call Initiation Panel */}
            <CallInitiationPanel
              targetUserId={targetUserId}
              setTargetUserId={setTargetUserId}
              currentUserId={effectiveUserId}
              hubState={hubState}
              callState={callState}
              callType={callType}
              activePeerId={activePeerId}
              connectionStatus={connectionStatus}
              iceStatus={iceStatus}
              onStartCall={handleStartCall}
              onEndCall={() => endCall(true)}
              onPreviewCamera={handlePreviewCamera}
            />
          </aside>
        </div>
      </main>

      {/* Incoming Call Modal Popup */}
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={acceptCall}
        onReject={rejectCall}
      />
    </div>
  );
}
