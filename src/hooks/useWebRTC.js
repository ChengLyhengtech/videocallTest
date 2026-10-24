import { useState, useRef, useEffect, useCallback } from 'react';
import { signalRService } from '../services/signalrService';
import { getSmartMediaStream } from '../utils/mediaHelper';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const CallState = {
  IDLE: 'idle',
  CALLING: 'calling',
  RINGING: 'ringing', // Callee received offer
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
};

export function useWebRTC(onLog, userLabel = 'Local User') {
  const [callState, setCallState] = useState(CallState.IDLE);
  const [callType, setCallType] = useState('video'); // 'video' | 'audio'
  const [activePeerId, setActivePeerId] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null); // { callerId, offer, callType }
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSyntheticStream, setIsSyntheticStream] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('new');
  const [iceStatus, setIceStatus] = useState('new');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const activePeerIdRef = useRef(null);
  const callTypeRef = useRef('video');

  // Keep refs synchronized with state to avoid stale closures in event handlers
  useEffect(() => {
    activePeerIdRef.current = activePeerId;
  }, [activePeerId]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  const log = useCallback(
    (message, type = 'info', data = null) => {
      if (onLog) {
        onLog({
          id: Math.random().toString(36).substring(2, 9),
          time: new Date().toLocaleTimeString(),
          source: 'WebRTC',
          message,
          type,
          data,
        });
      }
      console.log(`[WebRTC] ${message}`, data || '');
    },
    [onLog]
  );

  /**
   * Initializes local user camera and/or microphone
   */
  const startLocalStream = useCallback(
    async (options = {}) => {
      const { forceVirtual = false, audioOnly = false } = options;
      try {
        if (!forceVirtual && localStreamRef.current && localStreamRef.current.active) {
          // If already active, check if we need to adjust video tracks
          if (audioOnly) {
            localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
            setIsVideoDisabled(true);
            return localStreamRef.current;
          }
        }

        log(`Acquiring ${audioOnly ? 'microphone (Audio only)' : 'camera & microphone'}...`, 'info');
        const { stream, isSynthetic, message } = await getSmartMediaStream(userLabel, {
          forceVirtual,
          audioOnly,
        });

        localStreamRef.current = stream;
        setIsSyntheticStream(isSynthetic);
        setIsVideoDisabled(audioOnly);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        if (isSynthetic) {
          log(message, 'warning');
        } else {
          log(message, 'success');
        }

        return stream;
      } catch (err) {
        log(`Failed to acquire media stream: ${err.message}`, 'error', err);
        throw err;
      }
    },
    [log, userLabel]
  );

  /**
   * Stops local media tracks
   */
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      log('Local media tracks stopped', 'info');
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    }
  }, [log]);

  /**
   * Helper to parse SDP or ICE candidates safely (whether JSON string or object)
   */
  const parsePayload = (data) => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  };

  /**
   * Flushes queued ICE candidates after setRemoteDescription
   */
  const flushCandidateQueue = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    if (candidateQueueRef.current.length > 0) {
      log(`Draining ${candidateQueueRef.current.length} queued ICE candidate(s)...`, 'info');
      while (candidateQueueRef.current.length > 0) {
        const candidate = candidateQueueRef.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          log('Queued ICE Candidate added successfully', 'info');
        } catch (err) {
          log(`Failed to add queued candidate: ${err.message}`, 'error');
        }
      }
    }
  };

  /**
   * Creates and configures the RTCPeerConnection instance
   */
  const createPeerConnection = useCallback(
    (targetUserId) => {
      if (peerConnectionRef.current) {
        log('Closing existing peer connection before creating new one', 'warning');
        peerConnectionRef.current.close();
      }

      log(`Creating RTCPeerConnection with STUN: ${RTC_CONFIG.iceServers[0].urls}`, 'info');
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;
      candidateQueueRef.current = [];

      // Add local media tracks to send to the other user
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
          log(`Added local track [${track.kind}] to PeerConnection`, 'info');
        });
      }

      // Handle ICE Candidates generated locally
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          log(`Generated local ICE candidate: ${event.candidate.type || 'candidate'}`, 'info');
          const candidateData = event.candidate.toJSON
            ? event.candidate.toJSON()
            : event.candidate;
          signalRService
            .sendIceCandidate(targetUserId, candidateData)
            .catch((err) => log(`Failed to send ICE candidate: ${err.message}`, 'error'));
        } else {
          log('ICE candidate gathering complete', 'info');
        }
      };

      // Stream received from remote peer
      pc.ontrack = (event) => {
        log(`Remote track received: [${event.track.kind}]`, 'success');
        if (remoteVideoRef.current) {
          if (event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          } else {
            const inboundStream = new MediaStream([event.track]);
            remoteVideoRef.current.srcObject = inboundStream;
          }
        }
      };

      // State monitoring
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        log(`Peer connection state: ${state}`, state === 'connected' ? 'success' : 'info');
        setConnectionStatus(state);
        if (state === 'connected') {
          setCallState(CallState.CONNECTED);
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          if (callState === CallState.CONNECTED) {
            setCallState(CallState.DISCONNECTED);
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        log(`ICE connection state: ${iceState}`, iceState === 'connected' ? 'success' : 'info');
        setIceStatus(iceState);
      };

      return pc;
    },
    [callState, log]
  );

  /**
   * Action: Start call to a target user ID (Supports 'video' and 'audio' call types)
   */
  const startCall = async (targetUserId, type = 'video') => {
    if (!targetUserId || !targetUserId.trim()) {
      throw new Error('Please enter a Target User ID to call');
    }

    try {
      setCallType(type);
      callTypeRef.current = type;
      setCallState(CallState.CALLING);
      setActivePeerId(targetUserId.trim());
      log(`Starting ${type.toUpperCase()} call to target [${targetUserId}]...`, 'info');

      // 1. Ensure local stream is running
      const isAudioOnly = type === 'audio';
      await startLocalStream({ audioOnly: isAudioOnly });

      // 2. Create WebRTC Peer Connection
      const pc = createPeerConnection(targetUserId.trim());

      // 3. Create WebRTC Offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: !isAudioOnly,
      });

      // 4. Set local description
      await pc.setLocalDescription(offer);
      log(`Set local description (${type} Offer)`, 'info');

      // 5. Send offer to target user via SignalR with callType metadata
      const offerPayload = {
        type: offer.type,
        sdp: offer.sdp,
        callType: type,
      };
      await signalRService.sendVideoOffer(targetUserId.trim(), offerPayload);

      log(`${type.toUpperCase()} offer sent to [${targetUserId}]. Waiting for answer...`, 'info');
    } catch (err) {
      log(`Failed to initiate ${type} call: ${err.message}`, 'error');
      setCallState(CallState.IDLE);
      setActivePeerId(null);
      throw err;
    }
  };

  /**
   * Action: Callee accepts incoming call
   */
  const acceptCall = async () => {
    if (!incomingCall) return;
    const { callerId, offer, callType: incomingType } = incomingCall;
    const isAudioOnly = incomingType === 'audio';

    try {
      log(`Accepting ${isAudioOnly ? 'AUDIO' : 'VIDEO'} call from [${callerId}]...`, 'info');
      setCallState(CallState.CONNECTED);
      setActivePeerId(callerId);
      setCallType(incomingType || 'video');
      callTypeRef.current = incomingType || 'video';

      // 1. Ensure local stream is running
      await startLocalStream({ audioOnly: isAudioOnly });

      // 2. Create peer connection
      const pc = createPeerConnection(callerId);

      // 3. Set Caller's offer as remote description
      const parsedOffer = parsePayload(offer);
      const sessionDesc = new RTCSessionDescription(
        parsedOffer.sdp ? parsedOffer : { type: 'offer', sdp: parsedOffer }
      );
      await pc.setRemoteDescription(sessionDesc);
      log('Set remote description (Offer from caller)', 'success');

      // 4. Drain queued ICE candidates
      await flushCandidateQueue();

      // 5. Create WebRTC Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      log('Set local description (Answer)', 'info');

      // 6. Send answer back to caller via SignalR
      const answerPayload = {
        type: answer.type,
        sdp: answer.sdp,
        callType: incomingType || 'video',
      };
      await signalRService.sendVideoAnswer(callerId, answerPayload);

      log(`Sent ${isAudioOnly ? 'audio' : 'video'} answer to [${callerId}]. Call established!`, 'success');
      setIncomingCall(null);
    } catch (err) {
      log(`Failed to accept call: ${err.message}`, 'error');
      endCall(true);
      throw err;
    }
  };

  /**
   * Action: Callee rejects incoming call
   */
  const rejectCall = async () => {
    if (!incomingCall) return;
    const { callerId } = incomingCall;
    log(`Rejecting incoming call from [${callerId}]`, 'warning');

    try {
      await signalRService.endVideoCall(callerId);
    } catch (err) {
      log(`Failed to signal call rejection: ${err.message}`, 'error');
    } finally {
      setIncomingCall(null);
      setCallState(CallState.IDLE);
    }
  };

  /**
   * Action: End ongoing call
   */
  const endCall = useCallback(
    async (notifyPeer = true) => {
      const peerId = activePeerIdRef.current;
      log(`Terminating call (notifyPeer=${notifyPeer}, peer=${peerId || 'none'})...`, 'warning');

      if (notifyPeer && peerId) {
        try {
          await signalRService.endVideoCall(peerId);
        } catch (err) {
          log(`Error sending end call notice: ${err.message}`, 'error');
        }
      }

      // Close WebRTC peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.oniceconnectionstatechange = null;
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Clear remote video element
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      candidateQueueRef.current = [];
      setCallState(CallState.IDLE);
      setActivePeerId(null);
      setIncomingCall(null);
      setConnectionStatus('closed');
      setIceStatus('closed');

      log('Call ended and resources cleaned up', 'info');
    },
    [log]
  );

  /**
   * SignalR Handler: Receive video/audio offer
   */
  const handleReceiveVideoOffer = useCallback(
    (senderUserId, offer) => {
      const parsed = parsePayload(offer);
      const isAudioOnly =
        parsed?.callType === 'audio' ||
        (parsed?.sdp && parsed.sdp.includes('m=video 0')) ||
        (parsed?.sdp && !parsed.sdp.includes('m=video'));
      const detectedType = isAudioOnly ? 'audio' : 'video';

      log(`Incoming ${detectedType.toUpperCase()} call request from [${senderUserId}]`, 'info');
      setCallType(detectedType);
      callTypeRef.current = detectedType;
      setIncomingCall({ callerId: senderUserId, offer: parsed, callType: detectedType });
      setCallState(CallState.RINGING);
    },
    [log]
  );

  /**
   * SignalR Handler: Receive video/audio answer
   */
  const handleReceiveVideoAnswer = useCallback(
    async (senderUserId, answer) => {
      log(`Received call answer from [${senderUserId}]`, 'info');
      const pc = peerConnectionRef.current;
      if (!pc) {
        log('PeerConnection is not available to handle answer', 'error');
        return;
      }

      try {
        const parsed = parsePayload(answer);
        if (parsed.callType) {
          setCallType(parsed.callType);
          callTypeRef.current = parsed.callType;
        }
        const sessionDesc = new RTCSessionDescription(
          parsed.sdp ? parsed : { type: 'answer', sdp: parsed }
        );
        await pc.setRemoteDescription(sessionDesc);
        log('Set remote description (Answer from peer)', 'success');

        await flushCandidateQueue();
        setCallState(CallState.CONNECTED);
      } catch (err) {
        log(`Failed to process video answer: ${err.message}`, 'error');
      }
    },
    [log]
  );

  /**
   * SignalR Handler: Receive ICE candidate
   */
  const handleReceiveIceCandidate = useCallback(
    async (senderUserId, candidateData) => {
      const pc = peerConnectionRef.current;
      const parsedCandidate = parsePayload(candidateData);

      if (!parsedCandidate) {
        log('Received empty or invalid ICE candidate', 'warning');
        return;
      }

      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(parsedCandidate));
          log('Successfully added incoming ICE candidate', 'info');
        } catch (err) {
          console.error('Error adding received ICE candidate', err);
          log(`Failed to add ICE candidate: ${err.message}`, 'error');
        }
      } else {
        // Queue candidates until remote description is applied
        log('Queueing ICE candidate until remote description is set', 'info');
        candidateQueueRef.current.push(parsedCandidate);
      }
    },
    [log]
  );

  /**
   * SignalR Handler: Peer ended call
   */
  const handleReceiveCallEnded = useCallback(
    (senderUserId) => {
      log(`Peer [${senderUserId}] has ended the call`, 'warning');
      endCall(false);
    },
    [endCall, log]
  );

  /**
   * Toggle Audio Mute
   */
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const newState = !audioTracks[0].enabled;
        audioTracks.forEach((t) => (t.enabled = newState));
        setIsAudioMuted(!newState);
        log(newState ? 'Microphone unmuted' : 'Microphone muted', 'info');
      }
    }
  };

  /**
   * Toggle Video Disable
   */
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const newState = !videoTracks[0].enabled;
        videoTracks.forEach((t) => (t.enabled = newState));
        setIsVideoDisabled(!newState);
        log(newState ? 'Camera enabled' : 'Camera disabled', 'info');
      }
    }
  };

  /**
   * Toggle Screen Sharing
   */
  const toggleScreenShare = async () => {
    const pc = peerConnectionRef.current;

    if (isScreenSharing) {
      // Revert to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }

      if (localStreamRef.current && pc) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      setIsScreenSharing(false);
      log('Screen sharing stopped, switched back to camera', 'info');
    } else {
      try {
        log('Requesting screen share stream...', 'info');
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];

        // When user stops screen sharing from browser bar
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        if (pc) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);
        log('Screen sharing active', 'success');
      } catch (err) {
        log(`Screen sharing cancelled or failed: ${err.message}`, 'warning');
      }
    }
  };

  // Wire up SignalR listener callbacks
  useEffect(() => {
    signalRService.setCallbacks({
      onReceiveVideoOffer: handleReceiveVideoOffer,
      onReceiveVideoAnswer: handleReceiveVideoAnswer,
      onReceiveIceCandidate: handleReceiveIceCandidate,
      onReceiveCallEnded: handleReceiveCallEnded,
    });
  }, [
    handleReceiveVideoOffer,
    handleReceiveVideoAnswer,
    handleReceiveIceCandidate,
    handleReceiveCallEnded,
  ]);

  // Teardown when component unmounts
  useEffect(() => {
    return () => {
      stopLocalStream();
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [stopLocalStream]);

  return {
    callState,
    callType,
    activePeerId,
    incomingCall,
    isAudioMuted,
    isVideoDisabled,
    isScreenSharing,
    isSyntheticStream,
    connectionStatus,
    iceStatus,
    localVideoRef,
    remoteVideoRef,
    startLocalStream,
    stopLocalStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  };
}
