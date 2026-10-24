import React from 'react';
import { 
  Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, LayoutGrid, PictureInPicture 
} from 'lucide-react';
import { CallState } from '../hooks/useWebRTC';

export default function MediaControls({
  isAudioMuted,
  isVideoDisabled,
  isScreenSharing,
  callState,
  callType = 'video',
  layoutMode,
  setLayoutMode,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
}) {
  const isInCall = callState === CallState.CONNECTED || callState === CallState.CALLING;
  const isAudioCall = callType === 'audio';

  return (
    <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl">
      {/* Mic toggle */}
      <button
        type="button"
        onClick={onToggleAudio}
        className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          isAudioMuted
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
        }`}
        title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
      >
        {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Camera toggle (only shown or prioritized in video call) */}
      {!isAudioCall && (
        <button
          type="button"
          onClick={onToggleVideo}
          className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            isVideoDisabled
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>
      )}

      {/* Screen Share toggle (in video mode) */}
      {!isAudioCall && (
        <button
          type="button"
          onClick={onToggleScreenShare}
          className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            isScreenSharing
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          <MonitorUp className="w-5 h-5" />
        </button>
      )}

      {/* Layout Mode toggle (in video mode) */}
      {!isAudioCall && (
        <>
          <div className="w-[1px] h-6 bg-slate-800 my-auto mx-1" />
          <button
            type="button"
            onClick={() => setLayoutMode(layoutMode === 'pip' ? 'grid' : 'pip')}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center justify-center"
            title={layoutMode === 'pip' ? 'Switch to Split View' : 'Switch to Picture-in-Picture'}
          >
            {layoutMode === 'pip' ? (
              <LayoutGrid className="w-5 h-5 text-indigo-400" />
            ) : (
              <PictureInPicture className="w-5 h-5 text-indigo-400" />
            )}
          </button>
        </>
      )}

      {/* End Call button (Hang up) */}
      {isInCall && (
        <button
          type="button"
          onClick={onEndCall}
          className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center animate-pulse"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
