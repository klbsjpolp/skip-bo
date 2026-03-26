import type { CSSProperties } from 'react';

type VictoryStyle = CSSProperties;

const BURST_PIECES = Array.from({ length: 12 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 12 - Math.PI / 2;
  const distance = 52 + (index % 3) * 18;

  return {
    key: `burst-${index}`,
    style: {
      '--piece-index': index,
      '--piece-offset-x': `${Math.round(Math.cos(angle) * distance)}px`,
      '--piece-offset-y': `${Math.round(Math.sin(angle) * distance)}px`,
      '--piece-rotation': `${index * 31 - 18}deg`,
      '--piece-color': `var(--victory-piece-${(index % 4) + 1})`,
    } as VictoryStyle,
  };
});

const SUNBURST_RAYS = Array.from({ length: 8 }, (_, index) => ({
  key: `ray-${index}`,
  style: {
    '--ray-angle': `${index * 45}deg`,
    '--ray-delay': `${index * 120}ms`,
  } as VictoryStyle,
}));

export function VictoryEffects() {
  return (
    <>
      <div className="victory-layer victory-persistent-layer" aria-hidden="true">
        <div className="victory-accent" />
        <div className="victory-pattern" />
        <div className="victory-shine" />
        <div className="victory-sunburst">
          {SUNBURST_RAYS.map(({ key, style }) => (
            <span key={key} className="victory-ray" style={style} />
          ))}
        </div>
      </div>

      <div className="victory-layer victory-burst-layer" aria-hidden="true">
        {BURST_PIECES.map(({ key, style }) => (
          <span key={key} className="victory-burst-piece" style={style} />
        ))}
      </div>
    </>
  );
}
