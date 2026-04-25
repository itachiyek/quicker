"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import WalletBar from "@/components/WalletBar";
import { useSession } from "@/hooks/useSession";

export default function LoginPage() {
  const router = useRouter();
  const { wallet, loading } = useSession();

  useEffect(() => {
    if (!loading && wallet) router.replace("/");
  }, [wallet, loading, router]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md w-full mx-auto">
      <div className="text-center mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
          Brain
        </div>
        <h1 className="text-5xl font-serif font-bold tracking-tight leading-none mt-1">
          Trainer
        </h1>
        <p className="mt-3 text-stone-600 text-sm">
          Mental math, handwriting, leaderboard.
        </p>
      </div>

      <section className="paper p-7 w-full">
        <h2 className="font-serif text-xl font-semibold mb-2">Sign in</h2>
        <p className="text-stone-600 text-sm mb-6 leading-relaxed">
          Connect a wallet to play and submit your scores. Inside World App, it
          uses your World wallet automatically.
        </p>
        <div className="flex justify-center">
          <WalletBar />
        </div>
      </section>

      <footer className="text-[10px] text-stone-400 text-center mt-8">
        Inspired by Dr. Kawashima&apos;s Brain Training.
      </footer>
    </main>
  );
}
