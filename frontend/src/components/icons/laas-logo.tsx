/**
 * LaaS text-mark logo (no GMI). White or dark depending on panel.
 */
export function LaasLogo({ className }: { className?: string }) {
  return (
    <span
      className={`font-bold text-xl tracking-tight ${className ?? ""}`}
      aria-label="LaaS - Lab as a Service"
    >
      LaaS
    </span>
  );
}
