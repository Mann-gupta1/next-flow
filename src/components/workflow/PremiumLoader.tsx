"use client";

import React from "react";

export function PremiumLoader() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-tr from-[#fbcfe8]/10 via-white/80 to-[#e0e7ff]/20 backdrop-blur-md transition-all duration-300">
      <div className="flex flex-col items-center max-w-sm px-6 text-center">
        {/* Concentric Circle SVG Spinner */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {/* Center dot */}
            <circle cx="50" cy="50" r="3" fill="#171717" />
            
            {/* Ring 1 */}
            <circle cx="50" cy="50" r="12" stroke="#e5e5e5" strokeWidth="1.5" fill="none" />
            
            {/* Ring 2 */}
            <circle cx="50" cy="50" r="22" stroke="#e5e5e5" strokeWidth="1.5" fill="none" />
            
            {/* Ring 3 */}
            <circle cx="50" cy="50" r="32" stroke="#e5e5e5" strokeWidth="1.5" fill="none" />
            
            {/* Ring 4 (Track) */}
            <circle cx="50" cy="50" r="42" stroke="#e5e5e5" strokeWidth="1.5" fill="none" />
            
            {/* Ring 4 (Spinning Arc) */}
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="#171717"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="60 300"
              strokeLinecap="round"
              className="animate-spin origin-center"
              style={{ transformOrigin: "50px 50px" }}
            />
          </svg>
        </div>

        {/* Caption */}
        <h3 className="text-lg font-semibold text-neutral-800 tracking-tight mt-6">
          Built by people who hate slow software
        </h3>
        
        {/* Running Emoji */}
        <div className="text-3xl mt-2 animate-bounce select-none">
          🏃
        </div>

        {/* Bouncing Three Dots Loading Indicator */}
        <div className="flex gap-2 justify-center mt-6">
          <span className="w-2 h-2 rounded-full bg-neutral-600 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-neutral-600 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-neutral-600 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
