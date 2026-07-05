import { useState, useRef, useEffect } from 'react';

export type VoiceMaskType = 'none' | 'low' | 'high' | 'robot';

export interface AudioEngineReturn {
  isRecording: boolean;
  isPlaying: boolean;
  amplitude: number;
  micAmplitude: number;
  voiceMask: VoiceMaskType;
  setVoiceMask: (mask: VoiceMaskType) => void;
  startRecording: (onSilenceDetected?: () => void) => Promise<void>;
  stopRecording: () => Promise<Blob>;
  playAudio: (audioBuffer: ArrayBuffer) => Promise<void>;
  stopAudio: () => void;
}

/**
 * Builds a Web Audio processing chain that alters voice characteristics.
 * The ORIGINAL stream is always sent to MediaRecorder (for accurate STT).
 * The MASKED stream is only used for amplitude monitoring (Orb visualizer).
 *
 * Masking types:
 *  - 'low'   → Deep voice (lowpass + gain reduce highs) — sounds like adult male
 *  - 'high'  → High-pitched voice (highpass) — sounds like a child/cartoon
 *  - 'robot' → Robot/metallic voice (bandpass comb + heavy distortion via waveshaper)
 *  - 'none'  → No masking, passthrough
 */
function buildMaskChain(
  ctx: AudioContext,
  source: MediaStreamAudioSourceNode,
  maskType: VoiceMaskType
): { outputNode: AudioNode } {
  if (maskType === 'none') {
    return { outputNode: source };
  }

  if (maskType === 'low') {
    // Simulate deeper voice: lowpass filter at 800Hz + slight pitch-down illusion
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 800;
    lowpass.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.value = 1.4;

    source.connect(lowpass);
    lowpass.connect(gain);
    return { outputNode: gain };
  }

  if (maskType === 'high') {
    // Simulate higher voice: highpass filter + formant boost
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 1800;
    highpass.Q.value = 0.8;

    const peaking = ctx.createBiquadFilter();
    peaking.type = 'peaking';
    peaking.frequency.value = 3000;
    peaking.gain.value = 8;
    peaking.Q.value = 1.5;

    source.connect(highpass);
    highpass.connect(peaking);
    return { outputNode: peaking };
  }

  if (maskType === 'robot') {
    // Robot voice: ring modulation using OscillatorNode as carrier
    // carrier frequency modulates the voice, creating metallic timbre
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 100; // Ring mod carrier frequency

    const ringGain = ctx.createGain();
    ringGain.gain.value = 0;

    oscillator.connect(ringGain.gain);
    oscillator.start();

    const waveshaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + 200) * x) / (Math.PI + 200 * Math.abs(x));
    }
    waveshaper.curve = curve;
    waveshaper.oversample = '4x';

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1200;
    bandpass.Q.value = 2.5;

    source.connect(ringGain);
    ringGain.connect(waveshaper);
    waveshaper.connect(bandpass);

    return { outputNode: bandpass };
  }

  return { outputNode: source };
}

export function useAudioEngine(): AudioEngineReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [micAmplitude, setMicAmplitude] = useState(0);
  const [voiceMask, setVoiceMask] = useState<VoiceMaskType>('none');

  // Refs to prevent stale closures in requestAnimationFrame loops
  const isRecordingRef = useRef(false);
  const isPlayingRef = useRef(false);
  const voiceMaskRef = useRef<VoiceMaskType>('none');

  // Keep voiceMaskRef in sync with state
  useEffect(() => {
    voiceMaskRef.current = voiceMask;
  }, [voiceMask]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackAnimationRef = useRef<number | null>(null);
  const micAnimationRef = useRef<number | null>(null);

  // VAD variables
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenRef = useRef(false);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const startRecording = async (onSilenceDetected?: () => void) => {
    initAudio();
    stopAudio();
    audioChunksRef.current = [];
    hasSpokenRef.current = false;
    isRecordingRef.current = true;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    try {
      // Request RAW microphone stream (no browser-side processing)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // ── STREAM 1: RAW → MediaRecorder → Whisper STT ──────────────────────
      // The ORIGINAL unmasked audio is always what gets recorded and sent to
      // the server. This ensures Whisper receives clean, accurate speech.
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 256000,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // ── STREAM 2: MASKED → Web Audio analyser (Orb visualizer only) ──────
      // The MASKED stream is built here using Web Audio API processing nodes.
      // It is NEVER recorded or sent to any server — only used for amplitude
      // monitoring that drives the Orb visual animation.
      const ctx = audioContextRef.current!;
      const micSource = ctx.createMediaStreamSource(stream);

      const currentMask = voiceMaskRef.current;
      const { outputNode: maskedOutput } = buildMaskChain(ctx, micSource, currentMask);

      // Connect masked output to analyser for amplitude monitoring
      const micAnalyser = ctx.createAnalyser();
      micAnalyser.fftSize = 256;
      maskedOutput.connect(micAnalyser);
      // DO NOT connect to ctx.destination — prevents double audio feedback

      const bufferLength = micAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const monitorMic = () => {
        if (!isRecordingRef.current) return;

        micAnalyser.getByteFrequencyData(dataArray);

        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;
        const normAmp = Math.min(average / 120, 1.0);
        setMicAmplitude(normAmp);

        // VAD (Voice Activity Detection) logic on RAW amplitude
        if (normAmp > 0.05) {
          hasSpokenRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hasSpokenRef.current) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              console.log('[VAD] Silence detected, auto-stopping.');
              if (onSilenceDetected) {
                onSilenceDetected();
              }
            }, 1500);
          }
        }

        micAnimationRef.current = requestAnimationFrame(monitorMic);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      monitorMic();

      if (currentMask !== 'none') {
        console.log(`[VoiceMask] Active mask: "${currentMask}". Raw audio → Whisper. Masked audio → Orb only.`);
      }
    } catch (err) {
      console.error('Gagal mengakses mic:', err);
      isRecordingRef.current = false;
      throw err;
    }
  };

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      isRecordingRef.current = false;

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        reject(new Error('MediaRecorder tidak aktif'));
        return;
      }

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (micAnimationRef.current) {
        cancelAnimationFrame(micAnimationRef.current);
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const stream = mediaRecorder.stream;
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setMicAmplitude(0);
        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  };

  const playAudio = async (arrayBuffer: ArrayBuffer) => {
    initAudio();
    stopAudio();
    isPlayingRef.current = true;

    const ctx = audioContextRef.current!;
    const analyser = analyserRef.current!;

    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);

      sourceNodeRef.current = source;
      setIsPlaying(true);

      source.onended = () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setAmplitude(0);
        if (playbackAnimationRef.current) {
          cancelAnimationFrame(playbackAnimationRef.current);
        }
      };

      source.start(0);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAmplitude = () => {
        if (!isPlayingRef.current) return;

        analyser.getByteFrequencyData(dataArray);
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;
        const normalized = Math.min(average / 120, 1.0);
        setAmplitude(normalized);

        playbackAnimationRef.current = requestAnimationFrame(updateAmplitude);
      };

      updateAmplitude();
    } catch (err) {
      console.error('Gagal decode/play audio:', err);
      isPlayingRef.current = false;
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    isPlayingRef.current = false;
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignored
      }
      sourceNodeRef.current = null;
    }
    if (playbackAnimationRef.current) {
      cancelAnimationFrame(playbackAnimationRef.current);
    }
    setIsPlaying(false);
    setAmplitude(0);
  };

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      isPlayingRef.current = false;
      stopAudio();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isRecording,
    isPlaying,
    amplitude,
    micAmplitude,
    voiceMask,
    setVoiceMask,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
  };
}
