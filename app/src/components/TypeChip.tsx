import { typeColor, typeName } from "@/lib/calculation";

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
