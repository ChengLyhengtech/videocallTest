import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, Copy, Check, ChevronDown, ChevronUp, Filter } from 'lucide-react';

export default function LogsConsole({ logs, onClear }) {
  const [filter, setFilter] = useState('ALL'); // ALL, SignalR, WebRTC
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const logsEndRef = useRef(null);

  // Auto-scroll when logs update
  useEffect(() => {
    if (!isCollapsed && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isCollapsed]);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    return log.source.toUpperCase() === filter.toUpperCase();
  });

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.time}] [${l.source}] ${l.message} ${l.data ? JSON.stringify(l.data) : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSourceBadge = (source) => {
    if (source === 'SignalR') {
      return (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
          SignalR
        </span>
      );
    }
    if (source === 'WebRTC') {
      return (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 text-violet-400 border border-violet-800">
          WebRTC
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
        System
      </span>
    );
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-emerald-400';
      case 'error':
        return 'text-rose-400 font-semibold';
      case 'warning':
        return 'text-amber-300';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/70 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200 tracking-wider uppercase font-mono">
            Signaling & Peer Events Log ({logs.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[10px] font-mono">
            {['ALL', 'SignalR', 'WebRTC'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  filter === f
                    ? 'bg-slate-800 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Copy */}
          <button
            type="button"
            onClick={handleCopyLogs}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear all logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Collapse */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand console' : 'Collapse console'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Log list */}
      {!isCollapsed && (
        <div className="p-3 max-h-56 overflow-y-auto space-y-1.5 text-xs font-mono bg-slate-950/90 select-text">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-4 italic">
              No events recorded yet. Connect to SignalR Hub to begin testing.
            </div>
          ) : (
            filteredLogs.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 hover:bg-slate-900/60 p-1 rounded-md transition-colors"
              >
                <span className="text-slate-600 shrink-0 text-[11px]">{item.time}</span>
                <span className="shrink-0">{getSourceBadge(item.source)}</span>
                <span className={`break-all ${getTypeColor(item.type)}`}>
                  {item.message}
                  {item.data && (
                    <span className="block mt-0.5 text-[10px] text-slate-500 font-mono overflow-x-auto max-h-24 bg-slate-900 p-1 rounded border border-slate-800">
                      {typeof item.data === 'object' ? JSON.stringify(item.data, null, 2) : String(item.data)}
                    </span>
                  )}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
