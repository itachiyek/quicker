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
    <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md w-full mx-auto">
      <div className="flex flex-col items-center mb-8">
        <Logo size={64} />
        <h1 className="text-4xl font-serif font-bold tracking-tight leading-none mt-4 gradient-text">
          Brain Trainer
        </h1>
        <p className="mt-2 text-stone-600 text-sm">
          Mental math · handwriting · leaderboard
        </p>
      </div>

      <section className="card-glass p-7 w-full">
        <h2 className="font-serif text-xl font-semibold mb-2">Sign in</h2>
        <p className="text-stone-600 text-sm mb-6 leading-relaxed">
          Connect a wallet to play and submit your scores. Inside World App, it
          uses your World wallet automatically.
        </p>
        <div className="flex justify-center">
          <WalletBar />
        </div>
      </section>
    </main>
  );
}
