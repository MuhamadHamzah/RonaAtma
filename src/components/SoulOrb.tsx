import React from 'react';

interface SoulOrbProps {
  moodScore?: number;
  isDistress?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

export default function SoulOrb({ moodScore, isDistress, size = 'md' }: SoulOrbProps) {
  // Determine if it is a distress state
  // If moodScore is between 1-10, score <= 4 is considered distress/unstable.
  const distress = isDistress !== undefined 
    ? isDistress 
    : (moodScore !== undefined ? moodScore <= 4 : false);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-24 h-24',
    lg: 'w-44 h-44',
    hero: 'w-56 h-56 md:w-64 md:h-64',
  };

  const orbColor = distress ? 'bg-accent-coral' : 'bg-accent-teal';
  const glowShadow = distress 
    ? 'shadow-[0_0_50px_15px_rgba(255,107,138,0.4)]' 
    : 'shadow-[0_0_50px_15px_rgba(62,207,178,0.4)]';

  return (
    <div className="flex items-center justify-center">
      <div className={`relative flex items-center justify-center ${sizeClasses[size]}`}>
        {/* Outer Ripple Ring 2 */}
        <div className={`absolute inset-0 rounded-full border border-accent-lavender/10 animate-ping opacity-25`} 
          style={{ animationDuration: '6s', animationDelay: '2s' }} />

        {/* Outer Ripple Ring 1 */}
        <div className={`absolute inset-0 rounded-full border ${distress ? 'border-accent-coral/20' : 'border-accent-teal/20'} animate-ping opacity-45`} 
          style={{ animationDuration: '4s' }} />

        {/* Concentric Ambient Ring */}
        <div className={`absolute inset-[-10%] rounded-full border border-dashed ${distress ? 'border-accent-coral/15' : 'border-accent-teal/15'} animate-spin`} 
          style={{ animationDuration: '24s' }} />

        {/* Breathing Inner Ring */}
        <div className={`absolute inset-[8%] rounded-full border ${distress ? 'border-accent-coral/40' : 'border-accent-teal/40'} animate-soul-orb-breathe`} />

        {/* Core Glowing Orb */}
        <div className={`absolute inset-[20%] rounded-full ${orbColor} ${glowShadow} animate-soul-orb-breathe flex items-center justify-center transition-all duration-1000`}>
          {/* Subtle Glass Highlight Layer */}
          <div className="absolute top-[10%] left-[10%] right-[10%] h-[30%] bg-white/20 rounded-full blur-[1px]" />
        </div>
      </div>
    </div>
  );
}
