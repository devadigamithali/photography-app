"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  children,
  widthClassName = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  widthClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${widthClassName} rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900`}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
