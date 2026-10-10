/**
 * HazardIcons.jsx — Custom SVG icons for emergency hazard categories:
 *   • Flood: River crest and surging flood waves
 *   • Landslide: Mountain slope with descending rock debris
 *   • Waterlogging: Standing street water pool with curb & raindrops
 *   • Road Damage: Cracked highway pavement with central fracture
 *
 * Uses currentColor to inherit theme & state styling seamlessly.
 */

import React from 'react';

export function FloodIcon({ size = 20, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Upper surging crest */}
      <path d="M2 7c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 5-2" />
      {/* Middle wave */}
      <path d="M2 12c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 5-2" />
      {/* Lower water baseline */}
      <path d="M2 17c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 5-2" />
    </svg>
  );
}

export function LandslideIcon({ size = 20, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Mountain outline */}
      <path d="m2 20 7-14 3.5 6" />
      <path d="m9 6 6 14" />
      {/* Fractured slope & sliding stones */}
      <path d="M14 13h2" />
      <circle cx="17.5" cy="11.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="15" r="2" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
      {/* Ground base */}
      <path d="M2 20h20" />
    </svg>
  );
}

export function WaterloggingIcon({ size = 20, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Rain droplets */}
      <path d="M7 4v3" />
      <path d="M12 2v4" />
      <path d="M17 4v3" />
      {/* Standing puddle pool */}
      <path d="M2 16c2 1 4 1 6.5 0s5-1 7.5 0 4 1 6 0" />
      <path d="M3 19c2.5 1 5 1 7.5 0s5-1 7.5 0 2.5 1 3 0" />
      {/* Street curb */}
      <path d="M2 13h20" strokeDasharray="3 3" />
    </svg>
  );
}

export function RoadDamageIcon({ size = 20, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Road outer borders */}
      <path d="M4 21 8 3" />
      <path d="M20 21 16 3" />
      {/* Central lane dashes */}
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      {/* Jagged crack fissure in pavement */}
      <path d="m11 9 3 2.5-3 2.5 2.5 2" />
    </svg>
  );
}

export function HazardIcon({
  type = 'flood',
  size = 20,
  className = '',
  ...props
}) {
  const normType = String(type || '').toLowerCase();

  switch (normType) {
    case 'landslide':
      return <LandslideIcon size={size} className={className} {...props} />;
    case 'waterlogging':
      return <WaterloggingIcon size={size} className={className} {...props} />;
    case 'road_damage':
    case 'roaddamage':
      return <RoadDamageIcon size={size} className={className} {...props} />;
    case 'flood':
    default:
      return <FloodIcon size={size} className={className} {...props} />;
  }
}
