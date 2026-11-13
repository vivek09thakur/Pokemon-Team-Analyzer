export function Icon({
  name,
  size,
  className = "",
  filled = false,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`material-symbols-rounded ${filled ? "filled" : ""} ${className}`}
      style={size ? { fontSize: size, ...style } : style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
