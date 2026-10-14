import React from 'react';

interface MmmutLogoProps {
  className?: string;
  size?: number;
}

export default function MmmutLogo({ className = '', size = 110 }: MmmutLogoProps) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="w-full h-full drop-shadow-sm"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer concentric rings */}
        <circle cx="100" cy="100" r="96" fill="#ffffff" stroke="#1e3a8a" strokeWidth="4" />
        <circle cx="100" cy="100" r="88" fill="#ffffff" stroke="#831843" strokeWidth="2.5" />
        <circle cx="100" cy="100" r="68" fill="#f8fafc" stroke="#1e3a8a" strokeWidth="2" />

        {/* Text along upper arc: Hindi text */}
        <path
          id="upperArc"
          d="M 24,100 A 76,76 0 0,1 176,100"
          fill="none"
        />
        <text className="text-[10.5px] font-bold fill-[#1e3a8a]">
          <textPath href="#upperArc" startOffset="50%" textAnchor="middle">
            मदन मोहन मालवीय प्रौद्योगिकी विश्वविद्यालय
          </textPath>
        </text>

        {/* Text along lower arc: English text */}
        <path
          id="lowerArc"
          d="M 176,100 A 76,76 0 0,1 24,100"
          fill="none"
        />
        <text className="text-[9.5px] font-bold fill-[#1e3a8a]">
          <textPath href="#lowerArc" startOffset="50%" textAnchor="middle">
            Madan Mohan Malaviya University of Technology
          </textPath>
        </text>

        {/* Decorative Stars / Dots on sides */}
        <circle cx="21" cy="100" r="2.5" fill="#831843" />
        <circle cx="179" cy="100" r="2.5" fill="#831843" />

        {/* Inner Graphic Shield / Seal */}
        <g transform="translate(42, 42)">
          {/* Engineering Gear in Background */}
          <circle cx="58" cy="58" r="42" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3" />
          
          {/* Rising Sun Rays */}
          <path d="M 58 58 L 35 25 M 58 58 L 58 18 M 58 58 L 81 25" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <circle cx="58" cy="54" r="14" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

          {/* Dam / Bridge structure with pylons */}
          <path
            d="M 28 65 L 88 65 L 84 76 L 32 76 Z"
            fill="#475569"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          {/* Bridge arches / pillars */}
          <line x1="38" y1="65" x2="38" y2="76" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="48" y1="65" x2="48" y2="76" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="58" y1="65" x2="58" y2="76" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="68" y1="65" x2="68" y2="76" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="78" y1="65" x2="78" y2="76" stroke="#ffffff" strokeWidth="1.5" />

          {/* Water waves */}
          <path
            d="M 28 80 Q 43 77, 58 80 T 88 80"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
          />
          <path
            d="M 32 84 Q 45 81, 58 84 T 84 84"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />

          {/* Open Book / Lotus Base */}
          <path
            d="M 44 86 C 52 82, 56 84, 58 87 C 60 84, 64 82, 72 86 C 68 91, 58 92, 58 92 C 58 92, 48 91, 44 86 Z"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="1"
          />
        </g>
      </svg>
    </div>
  );
}
