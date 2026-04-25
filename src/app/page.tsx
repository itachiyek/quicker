"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StartScreen from "@/components/StartScreen";
import GameScreen from "@/components/GameScreen";
import EndScreen from "@/components/EndScreen";
import LoadingScreen from "@/components/LoadingScreen";
import { useSession } from "@/hooks/useSession";

type Phase =
  | { kind: "start" }
  | { kind: "playing" }
  | { kind: "end"; score: number; total: number; durationSeconds: number };

export default function Home() {
  const router = useRouter();
  const { wallet, loading } = useSession();
  const [phase, setPhase] = useState<Phase>({ kind: "start" });

  useEffect(() => {
    if (!loading && !wallet) router.replace("/login");
  }, [wallet, loading, router]);

  if (loading || !wallet) {
    return <LoadingScreen label={loading ? "Checking session" : "Redirecting"} />;
  }

  return (
    <main className="flex-1 flex flex-col w-full">
      {phase.kind === "start" && (
        <StartScreen onStart={() => setPhase({ kind: "playing" })} />
      )}
      {phase.kind === "playing" && (
        <GameScreen
          onFinish={(score, total, durationSeconds) =>
            setPhase({ kind: "end", score, total, durationSeconds })
          }
        />
      )}
      {phase.kind === "end" && (
        <EndScreen
          score={phase.score}
          total={phase.total}
          durationSeconds={phase.durationSeconds}
          onRestart={() => setPhase({ kind: "start" })}
        />
      )}
    </main>
  );
}
