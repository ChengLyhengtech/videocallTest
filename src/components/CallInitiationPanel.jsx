import React from 'react';
import { Phone, PhoneCall, PhoneOff, Video, Activity, Radio, Mic } from 'lucide-react';
import { CallState } from '../hooks/useWebRTC';
import * as signalR from '@microsoft/signalr';

export default function CallInitiationPanel({
  targetUserId,
  setTargetUserId,
  currentUserId,
  hubState,
  callState,
  callType,
  activePeerId,
  connectionStatus,
  iceStatus,
  onStartCall,
  onEndCall,
  onPreviewCamera,
}) {
  const isSignalRConnected = hubState === signalR.HubConnectionState.Connected;
  const isInCall = callState === CallState.CONNECTED;
  const isCalling = callState === CallState.CALLING;

  // Suggest counterpart user if using dev conventions
  const counterpartId =
    currentUserId === 'user_alice'
      ? 'user_bob'
      : currentUserId === 'user_bob'
      ? 'user_alice'
      : null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-emerald-400" />
          <h2 className="font-semibold text-slate-100 text-sm tracking-wide uppercase">
            Call Initiation
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {isInCall && (
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              {callType}
            </span>
          )}
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
              isInCall
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : isCalling
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {callState.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Target User ID input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-300">
              Target User ID (Guid) <span className="text-rose-400">*</span>
            </label>
            {counterpartId && !isInCall && !isCalling && (
              <button
                type="button"
                onClick={() => setTargetUserId(counterpartId)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-mono cursor-pointer"
              >
                Call {counterpartId}
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              disabled={isInCall || isCalling || !isSignalRConnected}
              placeholder="Paste Peer User Guid (e.g. 9ef6a83d...)"
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {!isInCall && !isCalling ? (
            <div className="grid grid-cols-2 gap-2">
              {/* Start Audio Call */}
              <button
                type="button"
                onClick={() => onStartCall('audio')}
                disabled={!isSignalRConnected || !targetUserId.trim()}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-bold py-2.5 px-3 rounded-xl shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-1.5 text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Start Voice/Audio Call"
              >
                <Phone className="w-4 h-4 text-slate-950" />
                Audio Call
              </button>

              {/* Start Video Call */}
              <button
                type="button"
                onClick={() => onStartCall('video')}
                disabled={!isSignalRConnected || !targetUserId.trim()}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold py-2.5 px-3 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Start Video Call"
              >
                <Video className="w-4 h-4 text-slate-950" />
                Video Call
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onEndCall}
              className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 text-xs transition-all cursor-pointer animate-pulse"
            >
              <PhoneOff className="w-4 h-4" />
              End {callType.toUpperCase()} Call ({activePeerId || targetUserId})
            </button>
          )}

          {/* Camera preview button */}
          <button
            type="button"
            onClick={onPreviewCamera}
            className="w-full bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-300 font-medium py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
          >
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            Preview Local Media Stream
          </button>
        </div>

        {/* Live Diagnostics */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              Peer:
            </span>
            <span
              className={`font-semibold ${
                connectionStatus === 'connected' ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {connectionStatus}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1">
              <Radio className="w-3 h-3 text-violet-400" />
              ICE:
            </span>
            <span
              className={`font-semibold ${
                iceStatus === 'connected' || iceStatus === 'completed'
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {iceStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
