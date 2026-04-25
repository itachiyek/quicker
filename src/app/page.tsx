"use client";

import { useState } from "react";
import StartScreen from "@/components/StartScreen";
import GameScreen from "@/components/GameScreen";
import EndScreen from "@/components/EndScreen";

type Phase =
  | { kind: "start" }
  | { kind: "playing" }
  | { kind: "end"; score: number; total: number; durationSeconds: number };

export default function Home() {
  const [phase, setPhase] = useState<Phase>({ kind: "start" });

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
