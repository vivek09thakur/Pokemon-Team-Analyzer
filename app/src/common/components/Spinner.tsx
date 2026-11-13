export function Spinner({ size = 32, className = "", label }: { size?: number; className?: string; label?: string }) {
  return (
    <span
      className={`block animate-spin rounded-full border-b-2 border-primary ${className}`}
      style={{ width: size, height: size }}
      role={label ? "status" : undefined}
      aria-label={label}
    />
  );
}
