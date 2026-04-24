"use client";

import { useEffect, useState } from "react";
import { loadModel } from "@/lib/recognizer";
import { playStart, unlockAudio } from "@/lib/sounds";

export default function StartScreen({ onStart }: { onStart: () => void }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Warmup: kick off model load early.
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
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-serif font-bold tracking-tight">
          Brain Trainer
        </h1>
        <p className="mt-2 text-stone-600">Kopfrechnen mit Handschrifterkennung</p>
      </div>
      <div className="bg-white rounded-xl border border-stone-300 shadow-md p-6 max-w-sm w-full">
        <ul className="text-stone-700 text-sm space-y-2 mb-6">
          <li>• 60 Sekunden so viele Aufgaben wie möglich</li>
          <li>• Ergebnis unten ins Feld zeichnen</li>
          <li>• Ziffern werden automatisch erkannt</li>
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
    </div>
  );
}
