"use client";

import { useEscapeKey } from "@/common/hooks/useEscapeKey";
import { Icon } from "./Icon";

interface Props {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidth?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  bodyClassName?: string;
}

export default function Dialog({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = "max-w-md",
  footer,
  toolbar,
  bodyClassName = "px-6 pb-6 overflow-y-auto",
  children,
}: Props) {
  useEscapeKey(open, onClose);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-scrim flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`md-dialog w-full ${maxWidth} max-h-[92dvh] sm:max-h-[85dvh] flex flex-col overflow-hidden`}>
        <div className="px-6 pt-5 pb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="title-lg">{title}</h3>
            {subtitle ? <p className="body-sm truncate">{subtitle}</p> : null}
          </div>
          <button className="md-icon-btn shrink-0" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {toolbar}
        <div className={`min-h-0 ${bodyClassName}`}>{children}</div>
        {footer}
      </div>
    </div>
  );
}
