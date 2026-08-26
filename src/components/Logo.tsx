import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  variant?: 'full' | 'icon' | 'badge';
  withSphere?: boolean;
}

/**
 * ErogaLogo Component
 * Renders the 3D Möbius Triquetra loop with modern polished Liquid Silver, Platinum & Mirror Chrome metallic gradients.
 */
export const ErogaLogo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 36,
  withSphere = true 
}) => {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: dimension, height: dimension }}
      role="img"
      aria-label="ErogaAI Logo"
    >
      <svg 
        viewBox="0 0 200 200" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        <defs>
          {/* Ultra Modern Primary Platinum / Chrome Gradient */}
          <linearGradient id="silverRibbonMain" x1="10%" y1="90%" x2="90%" y2="15%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="15%" stopColor="#475569" />
            <stop offset="32%" stopColor="#94A3B8" />
            <stop offset="48%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#E2E8F0" />
            <stop offset="76%" stopColor="#94A3B8" />
            <stop offset="90%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Secondary Liquid Silver Ribbing */}
          <linearGradient id="silverRibbonSecondary" x1="85%" y1="15%" x2="15%" y2="85%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="18%" stopColor="#334155" />
            <stop offset="38%" stopColor="#CBD5E1" />
            <stop offset="52%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#E2E8F0" />
            <stop offset="88%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>

          {/* Pure Chrome Specular Gloss Highlight */}
          <linearGradient id="chromeHighlightGrad" x1="0%" y1="100%" x2="80%" y2="0%">
            <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.9" />
            <stop offset="25%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="60%" stopColor="#CBD5E1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#64748B" stopOpacity="0" />
          </linearGradient>

          {/* Deep Cavity Metallic Ambient Shadow */}
          <linearGradient id="silverShadowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#0F172A" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#334155" stopOpacity="0" />
          </linearGradient>

          {/* Platinum / Chrome Mirror Sphere Radial Gradient */}
          <radialGradient id="platinumSphereGrad" cx="32%" cy="28%" r="68%" fx="24%" fy="20%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="18%" stopColor="#F8FAFC" />
            <stop offset="38%" stopColor="#E2E8F0" />
            <stop offset="65%" stopColor="#94A3B8" />
            <stop offset="85%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0F172A" />
          </radialGradient>

          {/* Core Soft Ambient Drop Shadow */}
          <filter id="silverSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#020617" floodOpacity="0.4" />
          </filter>
        </defs>

        <g filter="url(#silverSoftGlow)">
          {/* ============================================================ */}
          {/* 1. BACK / INNER AMBIENT OCCLUSION LOOP */}
          {/* ============================================================ */}
          <path
            d="M 100 24 
               C 125 24, 155 60, 168 108 
               C 178 142, 165 170, 138 174 
               C 110 178, 80 152, 60 134
               C 42 118, 26 142, 42 162
               C 65 190, 130 190, 162 155
               C 192 120, 185 55, 142 22
               C 120 5, 80 8, 58 35
               C 35 62, 25 105, 34 135
               C 38 148, 50 150, 58 138
               C 70 120, 80 60, 100 24 Z"
            fill="#0F172A"
            opacity="0.35"
          />

          {/* ============================================================ */}
          {/* 2. LOWER & LEFT LIQUID SILVER MÖBIUS FLANGE */}
          {/* ============================================================ */}
          <path
            d="M 42 165 
               C 22 145, 20 95, 48 55 
               C 62 36, 82 25, 102 24 
               C 92 48, 76 96, 60 126 
               C 50 145, 36 158, 28 152 
               C 20 146, 25 125, 36 100 
               C 48 72, 65 52, 85 40 
               C 68 56, 52 88, 44 118 
               C 38 140, 48 158, 62 160 
               C 85 163, 115 142, 140 125 
               C 152 117, 162 118, 158 128 
               C 150 148, 120 175, 88 176 
               C 68 176, 50 172, 42 165 Z"
            fill="url(#silverRibbonMain)"
          />

          {/* Silver Liquid Gloss Edge Highlight */}
          <path
            d="M 46 160 
               C 32 146, 30 108, 52 70 
               C 66 46, 86 32, 98 28 
               C 85 45, 68 85, 56 120 
               C 48 142, 54 154, 68 156 
               C 92 158, 122 138, 145 120 
               C 134 135, 108 158, 80 162 
               C 62 164, 52 163, 46 160 Z"
            fill="url(#chromeHighlightGrad)"
          />

          {/* Silver Deep Crease Inner Shadow */}
          <path
            d="M 40 148 
               C 48 132, 62 98, 75 68 
               C 82 52, 92 38, 100 28 
               C 96 36, 86 54, 76 74 
               C 62 104, 48 138, 40 148 Z"
            fill="url(#silverShadowGrad)"
          />

          {/* ============================================================ */}
          {/* 3. UPPER & RIGHT PLATINUM CHROME MÖBIUS FLANGE */}
          {/* ============================================================ */}
          <path
            d="M 98 24 
               C 126 22, 160 52, 172 95 
               C 184 138, 172 166, 146 168 
               C 124 170, 95 146, 75 130 
               C 68 124, 72 115, 82 120 
               C 105 132, 138 150, 154 140 
               C 168 130, 172 95, 158 65 
               C 146 38, 122 26, 98 24 Z"
            fill="url(#silverRibbonSecondary)"
          />

          {/* Chrome Specular Surface Highlighting */}
          <path
            d="M 102 26 
               C 128 26, 156 54, 166 90 
               C 174 118, 168 144, 152 148 
               C 162 135, 165 102, 154 75 
               C 142 46, 122 32, 102 26 Z"
            fill="url(#chromeHighlightGrad)"
          />

          {/* Platinum Outer Rim Bevel */}
          <path
            d="M 88 124 
               C 108 136, 136 150, 150 142 
               C 160 134, 165 110, 158 84 
               C 152 64, 138 46, 122 36 
               C 134 48, 146 68, 148 88 
               C 150 108, 142 126, 130 134 
               C 114 142, 95 134, 88 124 Z"
            fill="#FFFFFF"
            opacity="0.8"
          />

          {/* ============================================================ */}
          {/* 4. SOLID POLISHED PLATINUM CHROME SPHERE (ORB) */}
          {/* ============================================================ */}
          {withSphere && (
            <g className="transition-transform duration-300">
              {/* Sphere Ambient Drop Shadow */}
              <ellipse 
                cx="126" 
                cy="72" 
                rx="18" 
                ry="12" 
                fill="#020617" 
                opacity="0.5" 
                transform="rotate(15 126 72)"
              />
              
              {/* Platinum Mirror Sphere Base */}
              <circle 
                cx="125" 
                cy="64" 
                r="19" 
                fill="url(#platinumSphereGrad)" 
                stroke="#FFFFFF"
                strokeWidth="0.85"
              />

              {/* Pure Titanium White Specular Glint */}
              <ellipse 
                cx="119" 
                cy="57" 
                rx="5" 
                ry="3.2" 
                fill="#FFFFFF" 
                opacity="1" 
                transform="rotate(-25 119 57)"
              />

              {/* Secondary Platinum Horizon Mirror Reflection */}
              <ellipse 
                cx="131" 
                cy="71" 
                rx="7" 
                ry="3.5" 
                fill="#F1F5F9" 
                opacity="0.5" 
                transform="rotate(35 131 71)"
              />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

/**
 * BrandHeader Component
 * Modern Platinum & Silver brand typography and metadata.
 */
export const BrandHeader: React.FC<{
  portal?: 'company' | 'super-admin';
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ portal = 'company', subtitle, size = 'md', className = '' }) => {
  const logoSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <ErogaLogo size={logoSize} />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-black ${textSize} tracking-tight text-white flex items-center`}>
            <span>Eroga</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-300 to-white font-extrabold ml-0.5 drop-shadow-[0_1px_4px_rgba(255,255,255,0.3)]">AI</span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700 shadow-sm">
            {portal === 'super-admin' ? 'SuperAdmin' : 'Fiscal'}
          </span>
        </div>
        {subtitle && (
          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[170px]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
