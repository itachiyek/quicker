"use client";

import { useState } from "react";
import StartScreen from "@/components/StartScreen";
import GameScreen from "@/components/GameScreen";
import EndScreen from "@/components/EndScreen";

type Phase =
  | { kind: "start" }
  | { kind: "playing" }
  | { kind: "end"; score: number; total: number };

export default function Home() {
  const [phase, setPhase] = useState<Phase>({ kind: "start" });

  return (
    <main className="flex-1 flex flex-col w-full min-h-screen">
      {phase.kind === "start" && (
        <StartScreen onStart={() => setPhase({ kind: "playing" })} />
      )}
      {phase.kind === "playing" && (
        <GameScreen
          onFinish={(score, total) =>
            setPhase({ kind: "end", score, total })
          }
        />
      )}
      {phase.kind === "end" && (
        <EndScreen
          score={phase.score}
          total={phase.total}
          onRestart={() => setPhase({ kind: "start" })}
        />
      )}
    </main>
  );
}
