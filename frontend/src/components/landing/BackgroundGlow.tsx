/**
 * Background Glow Component
 *
 * Creates subtle color glows (cyan, magenta, yellow)
 * scattered across the page background.
 */

export function BackgroundGlow() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Top - cyan */}
      <div className="absolute top-[100px] right-[5%] w-[350px] h-[350px] bg-cmyk-cyan/15 rounded-full blur-[150px]"></div>

      {/* Middle - magenta */}
      <div className="absolute top-[2000px] -left-[50px] w-[350px] h-[350px] bg-cmyk-magenta/15 rounded-full blur-[150px]"></div>

      {/* Bottom - yellow */}
      <div className="absolute top-[4000px] right-[10%] w-[350px] h-[350px] bg-cmyk-yellow/15 rounded-full blur-[150px]"></div>
    </div>
  );
}
