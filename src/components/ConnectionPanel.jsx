import React, { useState, useEffect } from 'react';
import { 
  Server, Key, Link2, Unlink, Eye, EyeOff, Sparkles, AlertCircle, 
  CheckCircle2, User, Lock, Mail, Smartphone, Copy, Check, LogOut, 
  ChevronDown, ChevronUp, Radio
} from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import { decodeJwt, extractUserIdFromToken, generateMockJwt } from '../utils/jwtHelper';
import { loginUser, getOrCreateDeviceId, saveAuthSession, clearAuthSession, getSavedAuthSession } from '../services/authService';

export default function ConnectionPanel({
  hubUrl,
  setHubUrl,
  jwtToken,
  setJwtToken,
  hubState,
  onConnect,
  onDisconnect,
  onLog,
  currentUserId,
  setCurrentUserInfo,
}) {
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'token'
  const [showToken, setShowToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [showTransportSettings, setShowTransportSettings] = useState(false);
  const [transportMode, setTransportMode] = useState('auto'); // 'auto', 'WebSocketsOnly', 'LongPollingOnly'

  // Form fields for real user login
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:5201');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [autoConnectHub, setAutoConnectHub] = useState(true);
  const [clientDeviceId, setClientDeviceId] = useState(() => getOrCreateDeviceId());
  const [deviceName, setDeviceName] = useState('Chrome Web Browser');
  const [platform, setPlatform] = useState('Web');
  const [deviceModel, setDeviceModel] = useState('Desktop');

  // Active logged-in user details
  const [activeUser, setActiveUser] = useState(() => getSavedAuthSession());

  // Check saved session on initial load
  useEffect(() => {
    const saved = getSavedAuthSession();
    if (saved && saved.accessToken) {
      setActiveUser(saved);
      setJwtToken(saved.accessToken);
      if (setCurrentUserInfo) {
        setCurrentUserInfo(saved);
      }
    }
  }, []);

  const isConnected = hubState === signalR.HubConnectionState.Connected;
  const isPending = isConnecting || hubState === signalR.HubConnectionState.Connecting;

  // Handle Real User Login via /api/auth/login
  const handleRealLogin = async (e) => {
    if (e) e.preventDefault();
    if (!account.trim() || !password) {
      setLoginError('Please enter both account and password.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    if (onLog) {
      onLog({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        source: 'Auth',
        message: `Attempting login for account: [${account.trim()}]...`,
        type: 'info'
      });
    }

    try {
      const result = await loginUser(apiBaseUrl, {
        account: account.trim(),
        password,
        clientDeviceId,
        deviceName,
        platform,
        deviceModel,
        appVersion: '1.0.0'
      });

      if (result.success && result.data) {
        const { userId, username, accessToken, accessTokenExpire } = result.data;
        setActiveUser(result.data);
        setJwtToken(accessToken);
        if (setCurrentUserInfo) {
          setCurrentUserInfo(result.data);
        }

        if (onLog) {
          onLog({
            id: Math.random().toString(36).substring(2, 9),
            time: new Date().toLocaleTimeString(),
            source: 'Auth',
            message: `Login successful! User ID: [${userId}], Account: [${username}]`,
            type: 'success',
            data: { userId, username, expires: accessTokenExpire }
          });
        }

        // Auto-connect to SignalR Hub if option selected
        if (autoConnectHub) {
          setTimeout(() => {
            onConnect();
          }, 200);
        }
      } else {
        setLoginError(result.message || 'Login failed. Invalid credentials.');
        if (onLog) {
          onLog({
            id: Math.random().toString(36).substring(2, 9),
            time: new Date().toLocaleTimeString(),
            source: 'Auth',
            message: `Login failed: ${result.message}`,
            type: 'error'
          });
        }
      }
    } catch (err) {
      setLoginError(err.message);
      if (onLog) {
        onLog({
          id: Math.random().toString(36).substring(2, 9),
          time: new Date().toLocaleTimeString(),
          source: 'Auth',
          message: `Network/CORS error: ${err.message}`,
          type: 'error'
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Sign out / clear credentials
  const handleSignOut = () => {
    clearAuthSession();
    setActiveUser(null);
    setJwtToken('');
    setPassword('');
    if (setCurrentUserInfo) {
      setCurrentUserInfo(null);
    }
    if (isConnected) {
      onDisconnect();
    }
    if (onLog) {
      onLog({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        source: 'Auth',
        message: 'Signed out and cleared local authentication session',
        type: 'info'
      });
    }
  };

  const handleCopyUserId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleConnectClick = async () => {
    setIsConnecting(true);
    try {
      await onConnect({ transport: transportMode });
    } catch (err) {
      // Error handled by SignalR service
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGenerateMock = (userId) => {
    const mock = generateMockJwt(userId);
    setJwtToken(mock);
    setActiveUser({
      userId,
      username: userId,
      accessToken: mock,
    });
    if (onLog) {
      onLog({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        source: 'System',
        message: `Generated Mock JWT for [${userId}]`,
        type: 'info'
      });
    }
  };

  const displayUserId = activeUser?.userId || currentUserId || extractUserIdFromToken(jwtToken);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold text-slate-100 text-sm tracking-wide uppercase">
            Authentication & SignalR
          </h2>
        </div>
        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
          isConnected
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : isPending
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            : 'bg-slate-800 text-slate-400 border-slate-700'
        }`}>
          {hubState}
        </span>
      </div>

      {/* Logged in User Profile Banner (when active) */}
      {displayUserId && (
        <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-800/40 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <span>{activeUser?.username || 'Authenticated User'}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <span>ID:</span>
                  <span className="text-cyan-300 font-bold truncate max-w-[150px] sm:max-w-[180px]">
                    {displayUserId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyUserId(displayUserId)}
                    className="p-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    title="Copy User ID for peer caller"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 border border-slate-700 transition-all cursor-pointer"
              title="Sign Out & Clear Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Auth Mode Tabs */}
      <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800/90 mb-4 text-xs font-medium">
        <button
          type="button"
          onClick={() => setAuthMode('login')}
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            authMode === 'login'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Real User Login
        </button>
        <button
          type="button"
          onClick={() => setAuthMode('token')}
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            authMode === 'token'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          Token / Mock Dev
        </button>
      </div>

      {/* TAB 1: REAL USER LOGIN FORM */}
      {authMode === 'login' && (
        <form onSubmit={handleRealLogin} className="space-y-3.5">
          {/* API Base URL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Backend API Base URL
            </label>
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(e) => {
                const val = e.target.value;
                setApiBaseUrl(val);
                // Also update hub URL default path
                setHubUrl(`${val.replace(/\/$/, '')}/hubs/videocall`);
              }}
              placeholder="http://localhost:5201"
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono transition-all"
            />
          </div>

          {/* Account Field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Account <span className="text-slate-500 text-[10px]">(Email, Username, or Phone)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="user@example.com or username"
                required
                className="w-full bg-slate-950/70 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-3 pr-3 py-2 text-xs text-slate-100 transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                required
                className="w-full bg-slate-950/70 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Device Settings Accordion (Optional details sent in LoginRequest) */}
          <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowDeviceSettings(!showDeviceSettings)}
              className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3 h-3 text-cyan-400" />
                Device Binding Info (Guid)
              </span>
              {showDeviceSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showDeviceSettings && (
              <div className="p-3 border-t border-slate-800/80 space-y-2 text-[11px]">
                <div>
                  <span className="text-slate-500">clientDeviceId:</span>
                  <input
                    type="text"
                    value={clientDeviceId}
                    onChange={(e) => setClientDeviceId(e.target.value)}
                    className="w-full mt-0.5 bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-[10px] text-slate-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">platform:</span>
                    <input
                      type="text"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500">deviceName:</span>
                    <input
                      type="text"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      className="w-full mt-0.5 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auto connect checkbox */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              type="checkbox"
              id="autoConnectHub"
              checked={autoConnectHub}
              onChange={(e) => setAutoConnectHub(e.target.checked)}
              className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="autoConnectHub" className="text-xs text-slate-400 cursor-pointer">
              Automatically connect to SignalR Hub on login
            </label>
          </div>

          {/* Error Message Alert */}
          {loginError && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="break-all">{loginError}</span>
            </div>
          )}

          {/* Login Submit Button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoggingIn ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Authenticating via /api/auth/login...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-slate-950" />
                Log In with Real Credentials
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 2: MANUAL / MOCK TOKEN */}
      {authMode === 'token' && (
        <div className="space-y-3.5">
          {/* Mock Buttons */}
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-slate-400">Quick Dev Mocks:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleGenerateMock('user_alice')}
                disabled={isConnected}
                className="text-[10px] font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <Sparkles className="w-2.5 h-2.5" />
                Mock Alice
              </button>
              <button
                type="button"
                onClick={() => handleGenerateMock('user_bob')}
                disabled={isConnected}
                className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/80 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <Sparkles className="w-2.5 h-2.5" />
                Mock Bob
              </button>
            </div>
          </div>

          {/* Token text field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              JWT Bearer Token
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={jwtToken}
                onChange={(e) => setJwtToken(e.target.value)}
                disabled={isConnected || isPending}
                placeholder="Paste Bearer token (eyJhbGciOi...)"
                className="w-full bg-slate-950/70 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl p-2.5 text-xs text-slate-100 font-mono disabled:opacity-50 disabled:cursor-not-allowed transition-all resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* SIGNALR HUB CONNECTION SECTION */}
      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-300">
              SignalR Hub URL
            </label>
            <button
              type="button"
              onClick={() => setShowTransportSettings(!showTransportSettings)}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
            >
              {showTransportSettings ? 'Hide Options' : 'Transport: ' + transportMode}
              <ChevronDown className={`w-3 h-3 transition-transform ${showTransportSettings ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <input
            type="text"
            value={hubUrl}
            onChange={(e) => setHubUrl(e.target.value)}
            disabled={isConnected || isPending}
            placeholder="http://localhost:5201/hubs/videocall"
            className="w-full bg-slate-950/70 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />

          {showTransportSettings && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-[11px]">
              <span className="text-slate-400 font-medium block">Transport Protocol:</span>
              <div className="grid grid-cols-1 gap-1 font-mono text-[10px]">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-900">
                  <input
                    type="radio"
                    name="transportMode"
                    value="auto"
                    checked={transportMode === 'auto'}
                    onChange={() => setTransportMode('auto')}
                    className="text-cyan-500"
                  />
                  <span>Auto (WebSockets + LongPolling Fallback) [Recommended]</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-900">
                  <input
                    type="radio"
                    name="transportMode"
                    value="WebSocketsOnly"
                    checked={transportMode === 'WebSocketsOnly'}
                    onChange={() => setTransportMode('WebSocketsOnly')}
                    className="text-cyan-500"
                  />
                  <span>WebSockets Only (Skip Negotiation)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-900">
                  <input
                    type="radio"
                    name="transportMode"
                    value="LongPollingOnly"
                    checked={transportMode === 'LongPollingOnly'}
                    onChange={() => setTransportMode('LongPollingOnly')}
                    className="text-cyan-500"
                  />
                  <span>LongPolling Only (HTTP Fallback)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Connect / Disconnect button */}
        {!isConnected ? (
          <button
            type="button"
            onClick={handleConnectClick}
            disabled={isPending || !hubUrl.trim() || !jwtToken?.trim()}
            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                Connecting to Hub...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 text-cyan-400" />
                Connect to Video Hub
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onDisconnect}
            className="w-full bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 hover:text-rose-100 font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
          >
            <Unlink className="w-3.5 h-3.5" />
            Disconnect from SignalR
          </button>
        )}
      </div>
    </div>
  );
}
