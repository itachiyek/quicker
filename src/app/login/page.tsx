"use client";

import { LogoWordmark } from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 pb-10 max-w-md w-full mx-auto text-center">
      <div className="text-stone-900">
        <LogoWordmark height={140} />
      </div>

      <div className="mt-10 w-full rounded-2xl border border-stone-300 bg-white/70 px-6 py-7">
        <h1 className="display text-2xl font-black italic">App shut down</h1>
        <p className="mt-3 text-stone-600 text-base leading-relaxed">
          Quicker has been shut down and is no longer available.
        </p>
        <p className="mt-2 text-stone-500 text-sm">
          Thanks for playing.
        </p>
      </div>
    </main>
  );
}
