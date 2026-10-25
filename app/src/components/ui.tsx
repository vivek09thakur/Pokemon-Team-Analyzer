import { typeColor, typeName } from "@/lib/calculation";

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

export function TypeChip({
  type,
  small = false,
  className = "",
  children,
}: {
  type: string;
  small?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={`type-chip ${small ? "type-chip-sm" : ""} ${className}`}
      style={{ background: typeColor(type) }}
    >
      {typeName(type)}
      {children}
    </span>
  );
}
