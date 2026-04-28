"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import WalletBar from "@/components/WalletBar";
import { LogoWordmark } from "@/components/Logo";
import { useSession } from "@/hooks/useSession";

export default function LoginPage() {
  const router = useRouter();
  const { wallet } = useSession();

  useEffect(() => {
    if (wallet) router.replace("/");
  }, [wallet, router]);

  if (wallet) return <main className="flex-1" />;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 pb-10 max-w-md w-full mx-auto">
      <div className="text-stone-900">
        <LogoWordmark height={140} />
      </div>
      <p className="mt-3 text-stone-600 text-base">60-second mental math.</p>

      <div className="w-full mt-12">
        <WalletBar large />
      </div>
    </main>
  );
}
