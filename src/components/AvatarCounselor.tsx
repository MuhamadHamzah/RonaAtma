import React, { useEffect, useRef } from 'react';

interface AvatarCounselorProps {
  emotion: 'calm' | 'concerned' | 'encouraging' | 'alert';
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  amplitude: number; // 0-1 from AudioEngine
  size?: number;
}

export default function AvatarCounselor({
  emotion = 'calm',
  state = 'idle',
  amplitude = 0,
  size = 280,
}: AvatarCounselorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const emotionRef = useRef(emotion);
  const amplitudeRef = useRef(amplitude);

  useEffect(() => {
    stateRef.current = state;
    emotionRef.current = emotion;
    amplitudeRef.current = amplitude;
  }, [state, emotion, amplitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotationAngle = 0;
    let morphPhase = 0;

    const getEmotionColors = (emo: typeof emotion) => {
      switch (emo) {
        case 'concerned':
          return {
            core: '#8B5CF6',
            outer: '#3B82F6',
            accent: '#EC4899',
            glow: 'rgba(139, 92, 246, 0.4)',
          };
        case 'encouraging':
          return {
            core: '#F59E0B',
            outer: '#EF4444',
            accent: '#10B981',
            glow: 'rgba(245, 158, 11, 0.4)',
          };
        case 'alert':
          return {
            core: '#EF4444',
            outer: '#F97316',
            accent: '#7F1D1D',
            glow: 'rgba(239, 68, 68, 0.5)',
          };
        case 'calm':
        default:
          return {
            core: '#3ECFB2',
            outer: '#6366F1',
            accent: '#8B5CF6',
            glow: 'rgba(62, 207, 178, 0.4)',
          };
      }
    };

    const render = () => {
      const currentEmotion = emotionRef.current;
      const currentState = stateRef.current;
      const currentAmp = amplitudeRef.current;
      const colors = getEmotionColors(currentEmotion);

      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      
      // Dynamic radius based on state and sound amplitude
      let baseRadius = size * 0.25;
      if (currentState === 'speaking') {
        baseRadius += currentAmp * size * 0.08;
      } else if (currentState === 'listening') {
        baseRadius += Math.sin(Date.now() * 0.008) * size * 0.02;
      }

      // Update morphing animation phases
      const speed = currentState === 'thinking' ? 0.04 : currentState === 'speaking' ? 0.025 : 0.012;
      rotationAngle += speed;
      morphPhase += speed * 1.5;

      // 1. Render Background Halo Glow
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.3,
        centerX,
        centerY,
        baseRadius * 2.0
      );
      glowGrad.addColorStop(0, colors.glow);
      glowGrad.addColorStop(0.5, `${colors.outer}1A`);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Render Morphing Waves (Neural Fluid Layers)
      const drawFluidLayer = (
        scale: number,
        waveCount: number,
        waveHeight: number,
        color1: string,
        color2: string,
        angleOffset: number
      ) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotationAngle * angleOffset);

        const gradient = ctx.createLinearGradient(
          -baseRadius,
          -baseRadius,
          baseRadius,
          baseRadius
        );
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);

        ctx.fillStyle = gradient;
        ctx.beginPath();

        const points: { x: number; y: number }[] = [];
        const totalSteps = 60;

        for (let i = 0; i <= totalSteps; i++) {
          const angle = (i / totalSteps) * Math.PI * 2;
          // Calculate organic wave variation using multiple sinusoids
          const waveFactor =
            Math.sin(angle * waveCount + morphPhase) * 0.5 +
            Math.cos(angle * (waveCount - 1) - morphPhase * 0.7) * 0.3;
          
          const currentRadius = baseRadius * scale + waveFactor * waveHeight;
          const x = Math.cos(angle) * currentRadius;
          const y = Math.sin(angle) * currentRadius;
          points.push({ x, y });
        }

        // Draw smooth path using bezier approximation
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      // Draw 3 layers of fluid waves with glassmorphic overlay mixing
      ctx.globalCompositeOperation = 'screen';
      
      // Layer 1: Deep Background Wave
      drawFluidLayer(
        0.95,
        5,
        15 + (currentState === 'speaking' ? currentAmp * 25 : 0),
        `${colors.outer}CC`,
        `${colors.accent}44`,
        -0.8
      );

      // Layer 2: Middle Wave
      drawFluidLayer(
        0.85,
        6,
        12 + (currentState === 'speaking' ? currentAmp * 20 : 0),
        `${colors.core}E6`,
        `${colors.outer}66`,
        1.2
      );

      // Layer 3: Foreground Bright Core Wave
      drawFluidLayer(
        0.75,
        4,
        10 + (currentState === 'speaking' ? currentAmp * 15 : 0),
        `${colors.accent}FF`,
        `${colors.core}99`,
        -0.5
      );

      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';

      // 4. Inner Bright Spherical Glow (Cosmic Center)
      const innerGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.15,
        centerY - baseRadius * 0.15,
        baseRadius * 0.05,
        centerX,
        centerY,
        baseRadius * 0.6
      );
      innerGrad.addColorStop(0, '#FFFFFF');
      innerGrad.addColorStop(0.3, `${colors.core}EE`);
      innerGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // 5. Draw Particle Ring (if AI is thinking)
      if (currentState === 'thinking') {
        const particleCount = 8;
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < particleCount; i++) {
          const angle = rotationAngle * 3 + (i * Math.PI * 2) / particleCount;
          const orbitRadius = baseRadius * 1.35;
          const px = centerX + Math.cos(angle) * orbitRadius;
          const py = centerY + Math.sin(angle) * orbitRadius;
          
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [size]);

  return (
    <div className="relative flex items-center justify-center select-none pointer-events-none">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full max-w-full drop-shadow-[0_0_40px_rgba(99,102,241,0.25)]"
      />
    </div>
  );
}
