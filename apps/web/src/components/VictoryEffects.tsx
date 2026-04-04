import type { CSSProperties } from 'react';

type VictoryStyle = CSSProperties;

const BURST_PIECES = Array.from({ length: 12 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 12 - Math.PI / 2;
  const distance = 48 + (index % 3) * 15;

  return {
    key: `burst-${index}`,
    style: {
      '--piece-index': index,
      '--piece-offset-x': `calc(${Math.round(Math.cos(angle) * distance)}px * var(--victory-burst-distance-scale, 1))`,
      '--piece-offset-y': `calc(${Math.round(Math.sin(angle) * distance)}px * var(--victory-burst-distance-scale, 1))`,
      '--piece-flight-rotation': `${Math.round((angle * 180) / Math.PI + 90)}deg`,
      '--piece-rotation': `${index * 31 - 18}deg`,
      '--piece-color': `var(--victory-piece-${(index % 4) + 1})`,
    } as VictoryStyle,
  };
});

const BURST_GROUPS = [
  {
    key: 'center',
    style: {
      '--burst-offset-x': '0px',
      '--burst-offset-y': '0px',
      '--burst-delay': '0ms',
    } as VictoryStyle,
  },
  {
    key: 'left',
    style: {
      '--burst-offset-x': 'calc(-120px * var(--victory-burst-distance-scale, 1))',
      '--burst-offset-y': 'calc(-16px * var(--victory-burst-distance-scale, 1))',
      '--burst-delay': '250ms',
    } as VictoryStyle,
  },
  {
    key: 'right',
    style: {
      '--burst-offset-x': 'calc(190px * var(--victory-burst-distance-scale, 1))',
      '--burst-offset-y': 'calc(28px * var(--victory-burst-distance-scale, 1))',
      '--burst-delay': '600ms',
    } as VictoryStyle,
  },
];

export function VictoryEffects() {
  return (
    <>
      <div className="victory-layer victory-persistent-layer" aria-hidden="true" data-testid="victory-effects">
        <div className="victory-accent" />
        <div className="victory-pattern" />
        <div className="victory-shine" />
      </div>

      <div className="victory-layer victory-burst-layer" aria-hidden="true">
        {BURST_GROUPS.map(({ key: groupKey, style: groupStyle }) => (
          <div key={groupKey} className="victory-burst-group" style={groupStyle}>
            {BURST_PIECES.map(({ key, style }) => (
              <span key={`${groupKey}-${key}`} className="victory-burst-piece" style={style} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
