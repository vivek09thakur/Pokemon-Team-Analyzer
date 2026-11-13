"use client";

import { useRef } from "react";
import { useAutoFocus } from "@/common/hooks/useAutoFocus";
import { Icon } from "./Icon";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}

export function SearchField({ value, onChange, placeholder, autoFocus = true }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  useAutoFocus(inputRef, autoFocus);
  return (
    <div className="px-6 pb-3 relative">
      <Icon
        name="search"
        size={20}
        className="absolute left-9 top-1/2 -translate-y-1/2 -mt-1.5 pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        className="md-field md-field-sm !pl-10"
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
