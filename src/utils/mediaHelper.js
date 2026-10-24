/**
 * Generates an animated synthetic media stream with video (canvas) and audio (Web Audio API)
 * Allows full WebRTC P2P testing even when NO physical webcam or microphone is connected!
 */
export function createSyntheticMediaStream(label = 'Virtual Device') {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  let animFrameId = null;
  let angle = 0;
  let waveOffset = 0;

  const draw = () => {
    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 640, 480);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < 640; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    for (let y = 0; y < 480; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    // Outer Target Circle
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(320, 240, 140, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(320, 240, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating Radar Sweep
    ctx.save();
    ctx.translate(320, 240);
    ctx.rotate(angle);
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 140);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 140, 0, Math.PI * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(140, 0);
    ctx.stroke();
    ctx.restore();
    angle += 0.04;

    // Moving Audio Wave Simulation
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 80; x < 560; x += 5) {
      const y = 370 + Math.sin(x * 0.05 + waveOffset) * 15 * Math.sin(x * 0.01);
      if (x === 80) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    waveOffset += 0.15;

    // Center Crosshairs
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(310, 240);
    ctx.lineTo(330, 240);
    ctx.moveTo(320, 230);
    ctx.lineTo(320, 250);
    ctx.stroke();

    // Headers & Labels
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WEBRTC TEST STREAM', 320, 60);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillText(`SIMULATED CAMERA • [${label}]`, 320, 90);

    // Live Timestamp
    ctx.fillStyle = '#facc15';
    ctx.font = '16px "JetBrains Mono", monospace';
    const now = new Date();
    const timeStr = `${now.toLocaleTimeString()}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    ctx.fillText(`TIME: ${timeStr}`, 320, 430);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('Active P2P Video Track (30 FPS Canvas Capture)', 320, 455);

    animFrameId = requestAnimationFrame(draw);
  };
  draw();

  // Capture video stream from canvas
  const canvasStream = canvas.captureStream(30);
  const videoTrack = canvasStream.getVideoTracks()[0];

  // Stop canvas animation loop when the video track ends
  videoTrack.addEventListener('ended', () => {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
    }
  });

  // Generate synthetic audio track via Web Audio API (gentle background pulse)
  let audioTrack = null;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const dst = audioCtx.createMediaStreamDestination();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // 440 Hz (A4)
      gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime); // Inaudible gain to prevent annoying feedback

      osc.connect(gainNode);
      gainNode.connect(dst);
      osc.start();

      audioTrack = dst.stream.getAudioTracks()[0];

      // Cleanup audio context when track ends
      if (audioTrack) {
        audioTrack.addEventListener('ended', () => {
          try {
            osc.stop();
            audioCtx.close();
          } catch (e) {
            // ignore
          }
        });
      }
    }
  } catch (err) {
    console.warn('Could not initialize synthetic audio track:', err);
  }

  const tracks = [videoTrack];
  if (audioTrack) {
    tracks.push(audioTrack);
  }

  const combinedStream = new MediaStream(tracks);
  combinedStream._isSynthetic = true;
  combinedStream._label = label;

  return combinedStream;
}

/**
 * Generates an audio-only synthetic media stream (oscillator track)
 */
export function createSyntheticAudioStream(label = 'Virtual Mic') {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const dst = audioCtx.createMediaStreamDestination();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);

      osc.connect(gainNode);
      gainNode.connect(dst);
      osc.start();

      const audioTrack = dst.stream.getAudioTracks()[0];
      const stream = new MediaStream([audioTrack]);
      stream._isSynthetic = true;
      stream._label = label;
      return stream;
    }
  } catch (err) {
    console.warn('Failed to create synthetic audio stream:', err);
  }
  return new MediaStream();
}

/**
 * Smart media acquisition:
 * 1. Checks audioOnly flag
 * 2. Tries hardware devices
 * 3. Falls back cleanly to synthetic animated stream or synthetic audio
 */
export async function getSmartMediaStream(userLabel = 'Local User', options = {}) {
  const { forceVirtual = false, audioOnly = false } = options;

  if (forceVirtual) {
    const stream = audioOnly
      ? createSyntheticAudioStream(userLabel)
      : createSyntheticMediaStream(userLabel);
    return {
      stream,
      isSynthetic: true,
      message: `Using simulated virtual ${audioOnly ? 'audio' : 'video+audio'} stream.`,
    };
  }

  // Audio-only mode requested
  if (audioOnly) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      return {
        stream,
        isSynthetic: false,
        message: 'Using physical microphone (audio call).',
      };
    } catch (err) {
      console.warn('Physical microphone unavailable, falling back to synthetic audio:', err);
      const syntheticAudio = createSyntheticAudioStream(userLabel);
      return {
        stream: syntheticAudio,
        isSynthetic: true,
        message: 'Microphone not found. Activated virtual audio stream for voice call.',
      };
    }
  }

  // Check available media devices
  let hasVideoDevice = false;
  let hasAudioDevice = false;

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      hasVideoDevice = devices.some((d) => d.kind === 'videoinput');
      hasAudioDevice = devices.some((d) => d.kind === 'audioinput');
    } else {
      hasVideoDevice = true;
      hasAudioDevice = true;
    }
  } catch (e) {
    hasVideoDevice = true;
    hasAudioDevice = true;
  }

  // If user clearly has no devices at all
  if (!hasVideoDevice && !hasAudioDevice) {
    const synthetic = createSyntheticMediaStream(userLabel);
    return {
      stream: synthetic,
      isSynthetic: true,
      message: 'No physical camera or microphone detected. Activated virtual synthetic media stream.',
    };
  }

  // Attempt 1: Try both video & audio if both detected
  if (hasVideoDevice && hasAudioDevice) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      return { stream, isSynthetic: false, message: 'Using physical camera and microphone.' };
    } catch (err) {
      console.warn('getUserMedia({ video, audio }) failed, checking single device fallback...', err);
    }
  }

  // Attempt 2: Try video only if video exists
  if (hasVideoDevice) {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const synthetic = createSyntheticMediaStream(userLabel);
      const audioTracks = synthetic.getAudioTracks();
      if (audioTracks.length > 0) {
        videoStream.addTrack(audioTracks[0]);
      }
      return { stream: videoStream, isSynthetic: false, message: 'Using physical camera (microphone not found, simulated audio).' };
    } catch (err) {
      console.warn('getUserMedia({ video }) failed:', err);
    }
  }

  // Attempt 3: Try audio only if audio exists
  if (hasAudioDevice) {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const synthetic = createSyntheticMediaStream(userLabel);
      const videoTracks = synthetic.getVideoTracks();
      if (videoTracks.length > 0) {
        audioStream.addTrack(videoTracks[0]);
      }
      return { stream: audioStream, isSynthetic: false, message: 'Using physical microphone (camera not found, simulated video canvas).' };
    } catch (err) {
      console.warn('getUserMedia({ audio }) failed:', err);
    }
  }

  // Final Fallback: Synthetic Stream
  const synthetic = createSyntheticMediaStream(userLabel);
  return {
    stream: synthetic,
    isSynthetic: true,
    message: 'Hardware camera/microphone not accessible. Using virtual synthetic media stream for WebRTC testing.',
  };
}
