import React from 'react';
import { PhoneCall, Phone, PhoneOff, User, Video, Mic } from 'lucide-react';

export default function IncomingCallModal({
  incomingCall,
  onAccept,
  onReject,
}) {
  if (!incomingCall) return null;

  const { callerId, callType = 'video' } = incomingCall;
  const isAudioCall = callType === 'audio';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl shadow-cyan-500/20 text-center relative overflow-hidden">
        {/* Glowing animated background rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className={`w-48 h-48 rounded-full border ${isAudioCall ? 'border-cyan-400' : 'border-emerald-400'} animate-ping`} />
        </div>

        {/* User avatar circle */}
        <div className={`relative mx-auto w-20 h-20 rounded-full bg-gradient-to-tr ${
          isAudioCall ? 'from-cyan-600 to-blue-600 shadow-cyan-500/30' : 'from-emerald-500 to-teal-600 shadow-emerald-500/30'
        } flex items-center justify-center shadow-xl mb-4 animate-bounce`}>
          {isAudioCall ? <PhoneCall className="w-10 h-10 text-white" /> : <Video className="w-10 h-10 text-white" />}
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-slate-900">
            {isAudioCall ? <Mic className="w-3 h-3 text-slate-950" /> : <PhoneCall className="w-3 h-3 text-slate-950" />}
          </span>
        </div>

        <div className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-[10px] uppercase font-mono font-bold mb-2">
          {isAudioCall ? '🎙️ Voice Call' : '📹 Video Call'}
        </div>

        <h3 className="text-xl font-bold text-slate-100 tracking-tight">
          {isAudioCall ? 'Incoming Audio Call' : 'Incoming Video Call'}
        </h3>
        <p className="text-sm font-mono text-cyan-300 font-semibold mt-1 mb-4 truncate px-2">
          [{callerId}]
        </p>
        <p className="text-xs text-slate-400 mb-6">
          {isAudioCall
            ? 'Peer is calling you via WebRTC real-time voice.'
            : 'Peer is requesting a WebRTC real-time video session.'}
        </p>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onReject}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-rose-900/40 border border-slate-700 hover:border-rose-700 text-rose-300 font-semibold text-sm transition-all cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            Decline
          </button>

          <button
            type="button"
            onClick={onAccept}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Phone className="w-4 h-4 text-slate-950" />
            Accept {isAudioCall ? 'Audio' : 'Video'}
          </button>
        </div>
      </div>
    </div>
  );
}
