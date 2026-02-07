/**
 * Background Glow Component
 *
 * Creates color glows (cyan, magenta, yellow) distributed in
 * alternating horizontal rows across the full page height.
 * Pattern: right → left → right → left → ...
 * Each glow is slightly offset from its respective edge.
 */

const GLOWS = [
  // Row 1 - Cyan (right)
  { color: 'bg-cmyk-cyan/20', top: '2%', side: 'right', offset: '3%' },
  // Row 2 - Magenta (left)
  { color: 'bg-cmyk-magenta/20', top: '14%', side: 'left', offset: '3%' },
  // Row 3 - Yellow (right)
  { color: 'bg-cmyk-yellow/20', top: '26%', side: 'right', offset: '5%' },
  // Row 4 - Cyan (left)
  { color: 'bg-cmyk-cyan/20', top: '38%', side: 'left', offset: '2%' },
  // Row 5 - Magenta (right)
  { color: 'bg-cmyk-magenta/20', top: '50%', side: 'right', offset: '4%' },
  // Row 6 - Yellow (left)
  { color: 'bg-cmyk-yellow/20', top: '62%', side: 'left', offset: '3%' },
  // Row 7 - Cyan (right)
  { color: 'bg-cmyk-cyan/20', top: '74%', side: 'right', offset: '5%' },
  // Row 8 - Magenta (left)
  { color: 'bg-cmyk-magenta/20', top: '86%', side: 'left', offset: '2%' },
];

export function BackgroundGlow() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {GLOWS.map((glow, i) => (
        <div
          key={i}
          className={`absolute w-[420px] h-[350px] ${glow.color} rounded-full blur-[120px]`}
          style={{
            top: glow.top,
            ...(glow.side === 'right'
              ? { right: glow.offset }
              : { left: glow.offset }),
          }}
        />
      ))}
    </div>
  );
}
