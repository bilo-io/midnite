/**
 * Static, CSS-only ambient backdrop. Replaces the (removed) WebGL particle field
 * with a calm set of soft, brand-tinted blurs so the page keeps some depth without
 * any 3D/canvas. Fixed and pointer-events-none; sits behind page content (z-0,
 * content is relative z-10). Low opacity reads intentionally in both themes.
 */
export function AmbientBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-[15%] top-[-10%] h-[55vh] w-[55vw] rounded-full bg-[#8b5cf6]/10 blur-[120px]" />
      <div className="absolute right-[-15%] top-[25%] h-[50vh] w-[50vw] rounded-full bg-[#3b82f6]/10 blur-[130px]" />
      <div className="absolute bottom-[-15%] left-[20%] h-[50vh] w-[55vw] rounded-full bg-[#10b981]/[0.08] blur-[130px]" />
      {/* Fade into the page background at the bottom for legibility. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  );
}
