"use client";

import { useEffect, type ReactNode } from "react";

export default function SideSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-30 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        open ? "translate-x-0" : "translate-x-full pointer-events-none"
      }`}
    >
      {/* Background mirrors the body's gradient so the slide feels native. */}
      <div className="absolute inset-0 bg-stone-200" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 600px at 50% -10%, rgba(251,191,36,0.18) 0%, rgba(251,191,36,0) 60%), radial-gradient(800px 400px at 100% 30%, rgba(244,114,182,0.08) 0%, rgba(244,114,182,0) 60%), linear-gradient(180deg, #faf6ed 0%, #f0ead6 100%)",
          }}
        />
      </div>

      <div className="relative h-full flex flex-col max-w-md w-full mx-auto px-4 pt-5 pb-10">
        <header className="flex items-center justify-between mb-3">
          <button
            onClick={onClose}
            className="text-sm text-stone-600 hover:text-stone-900 inline-flex items-center gap-1"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
          {title && (
            <span className="text-sm font-serif italic font-extrabold tracking-tight">
              {title}
            </span>
          )}
          <span className="w-12" />
        </header>
        <div className="flex-1 overflow-y-auto -mx-4 px-4">{children}</div>
      </div>
    </div>
  );
}
