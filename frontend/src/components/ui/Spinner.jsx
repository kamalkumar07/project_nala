/**
 * Spinner — accessible SVG loading indicator.
 * Props: size (px, default 24), color (CSS color, default currentColor)
 */

export function Spinner({ size = 24, color = 'var(--color-primary)', label = 'Loading…' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label={label}
      role="img"
      style={{ animation: 'nw-spin 0.75s linear infinite', display: 'block', flexShrink: 0 }}
    >
      <style>{`
        @keyframes nw-spin { to { transform: rotate(360deg); } }
      `}</style>
      <circle
        cx="12" cy="12" r="9"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="42 14"
        opacity="0.9"
      />
    </svg>
  );
}
