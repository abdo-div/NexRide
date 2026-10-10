import React, { useMemo } from "react";

const N = 21;

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const inFinderZone = (x: number, y: number): boolean =>
  (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);

/**
 * Deterministic QR-style matrix rendered from a seed (e.g. the booking id).
 * Decorative only — the backend issues the authoritative gate pass.
 */
export const PseudoQr: React.FC<{ seed: string; className?: string }> = ({
  seed,
  className,
}) => {
  const modules = useMemo(() => {
    const random = mulberry32(hashString(seed));
    return Array.from({ length: N }, (_, y) =>
      Array.from({ length: N }, (_, x) =>
        inFinderZone(x, y) ? false : random() > 0.5,
      ),
    );
  }, [seed]);

  const cell = 100 / N;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="currentColor"
      role="img"
      aria-label="gate-pass-qr"
    >
      {modules.map((row, y) =>
        row.map(
          (on, x) =>
            on && (
              <rect
                key={`${x}-${y}`}
                x={x * cell}
                y={y * cell}
                width={cell * 1.05}
                height={cell * 1.05}
              />
            ),
        ),
      )}
      {[
        { x: 0, y: 0 },
        { x: N - 7, y: 0 },
        { x: 0, y: N - 7 },
      ].map((origin, index) => (
        <g key={index}>
          <rect
            x={origin.x}
            y={origin.y}
            width={7}
            height={7}
            rx={1.2}
          />
          <rect
            x={origin.x + 1}
            y={origin.y + 1}
            width={5}
            height={5}
            fill="#ffffff"
          />
          <rect x={origin.x + 2} y={origin.y + 2} width={3} height={3} />
        </g>
      ))}
    </svg>
  );
};

export default PseudoQr;