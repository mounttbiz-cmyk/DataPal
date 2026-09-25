import React from 'react';
import { useLocation } from 'wouter';

export default function BackgroundPattern() {
  const [location] = useLocation();

  if (location === '/') {
    return <div className="fixed inset-0 z-[-1] pointer-events-none bg-white"></div>;
  }

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#FFFFFF]">
      <style>
        {`
          @media (prefers-reduced-motion: no-preference) {
            .anim-line-tl { animation: float-tl 80s ease-in-out infinite alternate; transform-origin: 200px 100px; will-change: transform; }
            .anim-line-tr { animation: float-tr 110s ease-in-out infinite alternate; transform-origin: 1200px 100px; will-change: transform; }
            .anim-line-bl { animation: float-bl 95s ease-in-out infinite alternate; transform-origin: 200px 900px; will-change: transform; }
            .anim-line-br { animation: float-br 120s ease-in-out infinite alternate; transform-origin: 1200px 900px; will-change: transform; }
            
            @keyframes float-tl { 100% { transform: translate3d(25px, 20px, 0) rotate(1deg); } }
            @keyframes float-tr { 100% { transform: translate3d(-20px, 15px, 0) rotate(-1deg); } }
            @keyframes float-bl { 100% { transform: translate3d(15px, -20px, 0) rotate(1deg); } }
            @keyframes float-br { 100% { transform: translate3d(-25px, -15px, 0) rotate(-1deg); } }
          }
        `}
      </style>

      {/* 
        Single SVG covering the entire viewport.
        Only 4 massive, continuous sweeps entering and exiting outside the frame.
      */}
      <div className="absolute inset-0 w-full h-full">
        <svg
          className="w-full h-full opacity-[0.65]"
          viewBox="0 0 1440 1024"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Top-Left Curve */}
          <path className="anim-line-tl" d="M-200 500 C 200 100 600 -100 1100 -200" stroke="#172554" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Top-Right Curve */}
          <path className="anim-line-tr" d="M300 -200 C 800 200 1300 400 1800 200" stroke="#172554" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Bottom-Left Curve */}
          <path className="anim-line-bl" d="M-200 700 C 300 1000 700 1100 1200 1300" stroke="#172554" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Bottom-Right Curve */}
          <path className="anim-line-br" d="M400 1300 C 900 900 1300 700 1800 600" stroke="#172554" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
