"use client";

import { useEffect, useState } from "react";
import { loadModel } from "@/lib/recognizer";
import { playStart, unlockAudio } from "@/lib/sounds";
import WalletBar from "./WalletBar";
import Leaderboard from "./Leaderboard";
import { useSession } from "@/hooks/useSession";

export default function StartScreen({ onStart }: { onStart: () => void }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const { wallet } = useSession();

  useEffect(() => {
    loadModel((m, p) => {
      setMsg(m);
      if (typeof p === "number") setProgress(p);
    }).catch(() => {});
  }, []);

  const handleStart = async () => {
    unlockAudio();
    setLoading(true);
    try {
      await loadModel((m, p) => {
        setMsg(m);
        if (typeof p === "number") setProgress(p);
      });
      playStart();
      onStart();
    } catch {
      setMsg("Fehler beim Laden des Modells. Bitte neu laden.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 gap-5 max-w-md w-full mx-auto pt-6">
      <div className="w-full flex justify-end">
        <WalletBar />
      </div>

      <div className="text-center">
        <h1 className="text-5xl font-serif font-bold tracking-tight">
          Brain Trainer
        </h1>
        <p className="mt-1 text-stone-600 text-sm">
          Kopfrechnen mit Handschrifterkennung
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-300 shadow-md p-5 w-full">
        <ul className="text-stone-700 text-sm space-y-1.5 mb-5">
          <li>• 60 Sekunden, so viele Aufgaben wie möglich</li>
          <li>• Antwort unten ins Feld zeichnen</li>
          <li>• Verbinde Wallet für das Leaderboard</li>
        </ul>
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-4 rounded-lg bg-stone-800 text-white text-lg font-semibold shadow active:bg-stone-900 disabled:opacity-60"
        >
          {loading ? "Lädt…" : "Spiel starten"}
        </button>
        {(loading || (progress > 0 && progress < 1)) && (
          <div className="mt-4">
            <div className="h-2 bg-stone-200 rounded overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-stone-500 text-center">{msg}</p>
          </div>
        )}
      </div>

      <div className="w-full">
        <h2 className="text-sm font-semibold text-stone-700 mb-2 px-1">
          Leaderboard
        </h2>
        <Leaderboard highlightWallet={wallet} />
      </div>
    </div>
  );
}
