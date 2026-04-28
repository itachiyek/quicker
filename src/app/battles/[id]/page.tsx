"use client";

import { useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LobbyDetail from "@/components/LobbyDetail";
import { useSession } from "@/hooks/useSession";

export default function LobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { wallet, loading } = useSession();

  useEffect(() => {
    if (!loading && !wallet) router.replace("/login");
  }, [wallet, loading, router]);

  if (loading || !wallet) return <main className="flex-1" />;

  return (
    <main className="flex-1 flex flex-col items-center max-w-md w-full mx-auto px-4 pt-5 pb-10 gap-4">
      <header className="w-full flex items-center justify-between">
        <Link
          href="/?mode=pvp"
          className="text-sm text-stone-600 hover:text-stone-900"
        >
          ← PvP
        </Link>
        <span className="text-sm font-serif italic font-extrabold tracking-tight">
          Quicker
        </span>
        <span className="w-12" />
      </header>

      <LobbyDetail id={id} />

      <Link
        href="/?mode=pvp"
        className="rounded-xl border border-stone-300 bg-white py-3 px-4 font-semibold text-stone-900 hover:bg-stone-50 inline-flex items-center justify-center w-full"
      >
        ← Back to PvP
      </Link>
    </main>
  );
}
