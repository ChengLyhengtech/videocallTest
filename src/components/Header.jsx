import React, { useState } from 'react';
import { Video, ShieldCheck, Copy, Check } from 'lucide-react';
import * as signalR from '@microsoft/signalr';

export default function Header({ hubState, callState, currentUserId, currentUserInfo }) {
  const [copied, setCopied] = useState(false);

  const getHubBadge = () => {
    switch (hubState) {
      case signalR.HubConnectionState.Connected:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            SignalR Online
          </span>
        );
      case signalR.HubConnectionState.Connecting:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            Connecting...
          </span>
        );
      case signalR.HubConnectionState.Reconnecting:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
            Reconnecting
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            SignalR Disconnected
          </span>
        );
    }
  };

  const handleCopyId = () => {
    const idToCopy = currentUserInfo?.userId || currentUserId;
    if (!idToCopy) return;
    navigator.clipboard.writeText(idToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const idToShow = currentUserInfo?.userId || currentUserId;
  const nameToShow = currentUserInfo?.username;

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Video className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
              WebRTC Call Tester
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                P2P
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <span>ASP.NET Core SignalR Signaling</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500 font-mono">v1.1.0</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {idToShow && (
          <div 
            onClick={handleCopyId}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs transition-colors cursor-pointer group"
            title="Click to copy your User ID for peer caller"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 text-left">
              {nameToShow && <span className="font-semibold text-slate-200">{nameToShow}</span>}
              <span className="font-mono text-cyan-300 text-[11px] truncate max-w-[130px] sm:max-w-[180px]">
                {idToShow}
              </span>
            </div>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-slate-500 group-hover:text-cyan-300 transition-colors" />
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          {getHubBadge()}
        </div>
      </div>
    </header>
  );
}
