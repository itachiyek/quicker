"use client";

import Logo from "./Logo";

export default function LoadingScreen({
  label,
  progress,
}: {
  label?: string;
  progress?: number; // 0..1
}) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl blur-2xl bg-amber-300/30 animate-pulse" />
        <div className="relative animate-[float_3s_ease-in-out_infinite]">
          <Logo size={88} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 min-w-[200px]">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <span>{label ?? "Loading"}</span>
          <span className="flex gap-1">
            <span className="w-1 h-1 rounded-full bg-stone-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 rounded-full bg-stone-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 rounded-full bg-stone-500 animate-bounce" />
          </span>
        </div>

        {typeof progress === "number" && (
          <div className="w-full h-1 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-stone-800 transition-[width] duration-300"
              style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </main>
  );
}
