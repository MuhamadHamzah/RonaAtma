/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        'cosmic-bg': '#070B14',
        'cosmic-card-deep': '#0D1424',
        'cosmic-card-light': '#121A30',
        'cosmic-border': '#1E2D4A',
        'cosmic-purple': '#7C5CFC',
        'aurora-teal': '#3ECFB2',
        'soft-coral': '#FF6B8A',
        'lavender-glow': '#A78BFA',
        'near-white': '#F0F4FF',
        'steel-blue': '#7B8EC8',
        'dark-blue': '#3D4F7A',
        // Aliases to match classes used in components
        'accent-purple': '#7C5CFC',
        'accent-teal': '#3ECFB2',
        'accent-coral': '#FF6B8A',
        'accent-lavender': '#A78BFA',
        'text-secondary': '#7B8EC8',
        'text-muted': '#3D4F7A',
        'cosmic-card1': '#0D1424',
        'cosmic-card2': '#121A30',
      },
      animation: {
        'soul-orb-breathe': 'orbBreathe 8s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'ripple': 'rippleEffect 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'shimmer-teal': 'shimmerTeal 2.5s infinite linear',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
      },
      keyframes: {
        orbBreathe: {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1) blur(0px)' },
          '50%': { transform: 'scale(1.06)', filter: 'brightness(1.15) blur(1px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(12px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        rippleEffect: {
          '0%': { transform: 'scale(0.95)', opacity: '0.5' },
          '50%': { opacity: '0.3' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        shimmerTeal: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      },
    },
  },
  plugins: [],
};
