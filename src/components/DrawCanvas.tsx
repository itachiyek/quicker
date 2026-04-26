"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
} from "react";
import { playStroke } from "@/lib/sounds";

export type DrawCanvasHandle = {
  clear: () => void;
  getCanvas: () => HTMLCanvasElement | null;
  isEmpty: () => boolean;
};

type Props = {
  onStrokeEnd?: () => void;
  disabled?: boolean;
  /** When true, draw a vertical guide down the middle so the user knows
   *  to write the tens digit on the left and the ones on the right. */
  divider?: boolean;
};

const DrawCanvas = forwardRef<DrawCanvasHandle, Props>(function DrawCanvas(
  { onStrokeEnd, disabled = false, divider = false },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = Math.max(8, rect.width * 0.04);
    dirtyRef.current = false;
  }, []);

  useEffect(() => {
    setupCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setupCanvas]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    dirtyRef.current = false;
  }, []);

  useImperativeHandle(ref, () => ({
    clear,
    getCanvas: () => canvasRef.current,
    isEmpty: () => !dirtyRef.current,
  }));

  const getPos = (e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e as PointerEvent).clientX - rect.left,
      y: (e as PointerEvent).clientY - rect.top,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pos = getPos(e);
    lastPosRef.current = pos;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + 0.1, pos.y + 0.1);
    ctx.stroke();
    dirtyRef.current = true;
    playStroke();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    const last = lastPosRef.current!;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
    dirtyRef.current = true;
    // Continuous pencil-scratch sound; rate-limited inside playStroke.
    playStroke();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    onStrokeEnd?.();
  };

  return (
    <div
      ref={containerRef}
      className="paper relative w-full h-full overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="block w-full h-full touch-none"
      />
      {divider && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-4 bottom-4 left-1/2 w-px"
          style={{
            background:
              "repeating-linear-gradient(180deg, rgba(120,113,108,0.55) 0 6px, transparent 6px 12px)",
          }}
        />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          clear();
        }}
        className="absolute bottom-2 right-2 btn-ghost text-xs"
      >
        Clear
      </button>
    </div>
  );
});

export default DrawCanvas;
