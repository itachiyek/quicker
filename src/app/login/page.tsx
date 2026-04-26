"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import WalletBar from "@/components/WalletBar";
import { LogoWordmark } from "@/components/Logo";
import { useSession } from "@/hooks/useSession";

export default function LoginPage() {
  const router = useRouter();
  const { wallet } = useSession();

  // Once a session shows up, hop to the home page. We don't gate on
  // `loading` here so the page never shows a blank/splash state — the
  // login UI is fine to render while we're still waiting on /me.
  useEffect(() => {
    if (wallet) router.replace("/");
  }, [wallet, router]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-5 pb-8 max-w-md w-full mx-auto">
      <div className="text-stone-900">
        <LogoWordmark height={120} />
      </div>
      <p className="mt-2 text-stone-600 text-sm">60-second mental math.</p>

      <section className="card-glass w-full p-6 mt-8">
        <WalletBar />
        <div className="mt-5 pt-5 border-t border-stone-200/70 flex items-center justify-center gap-3 text-[11px] text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Non-custodial
          </span>
          <span className="text-stone-300">·</span>
          <span>No email</span>
          <span className="text-stone-300">·</span>
          <span>Free to play</span>
        </div>
      </section>
    </main>
  );
}
