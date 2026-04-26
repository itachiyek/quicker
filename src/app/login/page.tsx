"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import WalletBar from "@/components/WalletBar";
import LoadingScreen from "@/components/LoadingScreen";
import Logo from "@/components/Logo";
import { useSession } from "@/hooks/useSession";

export default function LoginPage() {
  const router = useRouter();
  const { wallet, loading } = useSession();

  useEffect(() => {
    if (!loading && wallet) router.replace("/");
  }, [wallet, loading, router]);

  if (loading) return <LoadingScreen label="Loading" />;
  if (wallet) return <LoadingScreen label="Signed in" />;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-5 pb-8 max-w-md w-full mx-auto">
      <Logo size={64} />
      <h1 className="text-4xl font-serif font-bold tracking-tight leading-none mt-5 gradient-text">
        Brain Trainer
      </h1>
      <p className="mt-2 text-stone-600 text-sm">
        60-second mental math.
      </p>

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
