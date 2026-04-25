"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import WalletBar from "@/components/WalletBar";
import LoadingScreen from "@/components/LoadingScreen";
import Logo from "@/components/Logo";
import { useSession } from "@/hooks/useSession";

const FEATURES: { icon: string; title: string; desc: string }[] = [
  {
    icon: "✎",
    title: "Handwriting input",
    desc: "Draw your answers, no keyboard",
  },
  {
    icon: "⚡",
    title: "60-second drills",
    desc: "Difficulty ramps with your score",
  },
  {
    icon: "★",
    title: "Global leaderboard",
    desc: "Wallet is your handle",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { wallet, loading } = useSession();

  useEffect(() => {
    if (!loading && wallet) router.replace("/");
  }, [wallet, loading, router]);

  if (loading) return <LoadingScreen label="Loading" />;
  if (wallet) return <LoadingScreen label="Signed in" />;

  return (
    <main className="flex-1 flex flex-col items-center px-5 pt-10 pb-8 max-w-md w-full mx-auto">
      {/* Hero */}
      <div className="flex flex-col items-center text-center">
        <Logo size={72} />
        <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight leading-[1.05] mt-5 gradient-text">
          Brain Trainer
        </h1>
        <p className="mt-3 text-stone-600 text-[15px] leading-snug max-w-xs">
          Sharpen your mental math with handwritten,
          one-minute drills.
        </p>
      </div>

      {/* CTA card */}
      <section className="card-glass w-full p-6 mt-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="chip">Sign in</span>
          <span className="text-[10px] uppercase tracking-wider text-stone-500">
            One step
          </span>
        </div>
        <h2 className="font-serif text-2xl font-semibold leading-snug mb-2">
          Connect your wallet to play.
        </h2>
        <p className="text-stone-600 text-sm leading-relaxed mb-5">
          Your wallet address is your handle on the leaderboard. Inside World
          App, the World wallet is used automatically.
        </p>

        <div className="flex flex-col items-stretch">
          <WalletBar />
        </div>

        <div className="mt-5 pt-5 border-t border-stone-200/70 flex items-center justify-center gap-3 text-[11px] text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Non-custodial
          </span>
          <span className="text-stone-300">·</span>
          <span>No email needed</span>
          <span className="text-stone-300">·</span>
          <span>Free to play</span>
        </div>
      </section>

      {/* Feature highlights */}
      <ul className="grid grid-cols-1 gap-2 w-full mt-6">
        {FEATURES.map((f) => (
          <li
            key={f.title}
            className="panel flex items-center gap-3 px-4 py-3"
          >
            <span className="w-9 h-9 rounded-xl bg-stone-900 text-amber-200 flex items-center justify-center text-base font-serif">
              {f.icon}
            </span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-stone-900">
                {f.title}
              </div>
              <div className="text-xs text-stone-500">{f.desc}</div>
            </div>
          </li>
        ))}
      </ul>

      <footer className="mt-8 text-[10px] text-stone-400 text-center">
        By signing in you agree to play fair. No account, no email — just
        your wallet.
      </footer>
    </main>
  );
}
