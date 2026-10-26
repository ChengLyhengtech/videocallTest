import React, { useState, useEffect } from 'react';
import { 
  Video, VideoOff, MicOff, Mic, User, Radio, Maximize2, Sparkles, PhoneCall, Volume2, PhoneOff, X 
} from 'lucide-react';
import { CallState } from '../hooks/useWebRTC';

export default function VideoGrid({
  localVideoRef,
  remoteVideoRef,
  callState,
  callType = 'video',
  activePeerId,
  currentUserId,
  isAudioMuted,
  isVideoDisabled,
  isSyntheticStream,
  layoutMode,
  callEndedNotice,
  onDismissNotice,
}) {
  const [callDuration, setCallDuration] = useState(0);

  // Timer for connected call
  useEffect(() => {
    let interval = null;
    if (callState === CallState.CONNECTED) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isConnected = callState === CallState.CONNECTED;
  const isCalling = callState === CallState.CALLING;
  const isAudioCall = callType === 'audio';

  // Toggle fullscreen on container
  const handleFullscreen = () => {
    const container = document.getElementById('video-canvas-container');
    if (container) {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch((err) => console.log(err));
      } else {
        document.exitFullscreen().catch((err) => console.log(err));
      }
    }
  };

  return (
    <div
      id="video-canvas-container"
      className="relative w-full aspect-video bg-slate-950 rounded-3xl border border-slate-800/90 overflow-hidden shadow-2xl flex items-center justify-center group"
    >
      {/* Background Cyber Grid Accent */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.4) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Disconnection Alert Banner */}
      {callEndedNotice && (
        <div className="absolute top-4 inset-x-4 z-40 p-3 sm:p-4 rounded-2xl bg-rose-950/90 border border-rose-500/60 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs text-rose-200 animate-bounce-once">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
              <PhoneOff className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-100 flex items-center gap-2">
                <span>Call Terminated</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900 text-rose-300 font-mono font-bold">
                  {callEndedNotice.type === 'peer_disconnected' ? 'Peer Disconnected / Refreshed' : 'Connection Closed'}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                {callEndedNotice.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismissNotice}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-100 hover:bg-rose-900/50 transition-colors cursor-pointer shrink-0"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden/Active HTML Video Elements for WebRTC audio playback */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={isAudioCall ? 'hidden' : `w-full h-full object-cover transition-opacity duration-300 ${isConnected ? 'opacity-100' : 'opacity-0 absolute'}`}
      />

      {/* 1. AUDIO CALL VIEW (Dedicated Voice Call UI) */}
      {isAudioCall ? (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-6 space-y-6">
          {/* Animated Audio Ripple Circles */}
          <div className="relative flex items-center justify-center">
            {isConnected && (
              <>
                <div className="absolute w-44 h-44 rounded-full border-2 border-cyan-500/30 animate-ping opacity-60 pointer-events-none" />
                <div className="absolute w-36 h-36 rounded-full border border-cyan-400/20 animate-pulse pointer-events-none" />
              </>
            )}

            <div className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all ${
              isConnected
                ? 'bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 border-2 border-cyan-400 shadow-cyan-500/30'
                : 'bg-slate-800 border border-slate-700 text-slate-500'
            }`}>
              <PhoneCall className={`w-12 h-12 ${isConnected ? 'text-white animate-pulse' : 'text-slate-400'}`} />
            </div>
          </div>

          {/* Caller Details & State */}
          <div className="text-center space-y-1.5 z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-mono">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span>{isConnected ? 'Voice Call Connected' : isCalling ? 'Calling Voice Peer...' : 'Voice Call Idle'}</span>
            </div>

            <h3 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
              {activePeerId || 'Target Peer'}
            </h3>

            {isConnected ? (
              <p className="text-sm font-mono text-cyan-400 font-bold">
                {formatDuration(callDuration)}
              </p>
            ) : (
              <p className="text-xs text-slate-400 max-w-sm">
                {isCalling
                  ? 'Signaling audio session via SignalR Hub...'
                  : 'Click Audio Call to initiate a real-time peer-to-peer voice stream.'}
              </p>
            )}
          </div>

          {/* Simulated Audio Sound Waves */}
          {isConnected && (
            <div className="flex items-center gap-1.5 h-8">
              {[40, 75, 100, 60, 90, 45, 80, 60, 95, 50, 85, 30].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-cyan-500 to-emerald-400 rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 100}ms`,
                    animationDuration: '800ms'
                  }}
                />
              ))}
            </div>
          )}

          {/* Local Audio Indicator */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md text-xs font-mono">
            <span>You ({currentUserId || 'Local'})</span>
            {isAudioMuted ? (
              <span className="flex items-center gap-1 text-rose-400">
                <MicOff className="w-3.5 h-3.5" /> Muted
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <Mic className="w-3.5 h-3.5" /> Mic On
              </span>
            )}
          </div>

          {/* Synthetic Audio Badge */}
          {isSyntheticStream && (
            <div className="absolute top-4 left-4 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
              <Sparkles className="w-3 h-3" />
              Virtual Audio Track
            </div>
          )}
        </div>
      ) : (
        /* 2. VIDEO CALL VIEW */
        <div className={`w-full h-full relative flex items-center justify-center transition-all ${
          layoutMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3 p-3' : ''
        }`}>
          {/* Remote Video Container */}
          <div className={`relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden rounded-2xl ${
            layoutMode === 'grid' ? 'border border-slate-800' : ''
          }`}>
            {/* Fallback View when Remote Peer is NOT connected */}
            {!isConnected && (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400">
                    <User className="w-12 h-12 text-slate-500" />
                  </div>
                  {isCalling && (
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-200">
                    {isCalling
                      ? `Calling [${activePeerId}]...`
                      : 'Awaiting WebRTC Peer Connection'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    {isCalling
                      ? 'Transmitting WebRTC Offer via SignalR Hub. Awaiting answer...'
                      : 'Enter Target User ID and click Audio or Video Call to initiate session.'}
                  </p>
                </div>

                {isCalling && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 text-xs font-mono">
                    <Radio className="w-3.5 h-3.5 animate-spin" />
                    <span>Gathering ICE candidates & negotiating SDP</span>
                  </div>
                )}
              </div>
            )}

            {/* Remote Peer Overlay Badge */}
            {isConnected && (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-medium text-slate-200">
                  Peer: {activePeerId || 'Connected'}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-xs font-mono text-cyan-400">
                  {formatDuration(callDuration)}
                </span>
              </div>
            )}
          </div>

          {/* Local Video Container (Supports PiP or Split Grid) */}
          <div
            className={`overflow-hidden transition-all duration-300 ${
              layoutMode === 'pip'
                ? 'absolute bottom-4 right-4 z-20 w-48 sm:w-56 md:w-64 aspect-video rounded-2xl border-2 border-slate-700/80 bg-slate-900 shadow-2xl hover:border-cyan-500/80 hover:scale-105'
                : 'relative w-full h-full bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center'
            }`}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted // Muted to prevent local acoustic feedback!
              className="w-full h-full object-cover"
            />

            {/* Local overlay when video track disabled */}
            {isVideoDisabled && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-slate-400">
                <VideoOff className="w-8 h-8 text-rose-400 mb-1" />
                <span className="text-[10px] uppercase font-mono tracking-wider">Camera Off</span>
              </div>
            )}

            {/* Synthetic Virtual Stream Notice */}
            {isSyntheticStream && !isVideoDisabled && (
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono backdrop-blur-sm">
                <Sparkles className="w-2.5 h-2.5" />
                Virtual Test Feed
              </div>
            )}

            {/* Local Peer Label */}
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 backdrop-blur-md text-[10px] font-mono text-slate-300">
              <span>You ({currentUserId || 'Local'})</span>
              {isAudioMuted && <MicOff className="w-3 h-3 text-rose-400" />}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Button */}
      <button
        type="button"
        onClick={handleFullscreen}
        className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-100 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        title="Toggle Fullscreen"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
}
