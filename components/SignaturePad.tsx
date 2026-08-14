'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Eraser, PenLine, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SignaturePadProps {
  employeeName?: string;
  error?: string;
  /** Se llama con el canvas cada vez que el trazo cambia (null si se limpia). */
  onChange: (canvas: HTMLCanvasElement | null) => void;
}

export function SignaturePad({ employeeName, error, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  /** Ajusta el canvas a su tamaño real en pantalla (HiDPI). */
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;

    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // Fondo blanco para que la firma se vea bien en PDF o impresión.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1b1b1f';
  }, []);

  useEffect(() => {
    setupCanvas();

    let frame = 0;
    function onResize() {
      cancelAnimationFrame(frame);
      // Redimensionar limpia el trazo: se avisa al formulario.
      frame = requestAnimationFrame(() => {
        setupCanvas();
        setHasSignature(false);
        onChange(null);
      });
    }

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupCanvas]);

  function position(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;

    const { x, y } = position(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Un toque simple también deja marca.
    ctx.lineTo(x + 0.01, y);
    ctx.stroke();
  }

  function moveStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { x, y } = position(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endStroke() {
    if (!drawing.current) return;
    drawing.current = false;
    setHasSignature(true);
    onChange(canvasRef.current);
  }

  function clear() {
    setupCanvas();
    setHasSignature(false);
    onChange(null);
  }

  return (
    <div>
      <div
        className={cn(
          'relative overflow-hidden rounded-btn border-2 transition-colors duration-200',
          error ? 'border-danger' : hasSignature ? 'border-brand' : 'border-dashed border-line',
        )}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startStroke}
          onPointerMove={moveStroke}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
          className="block h-48 w-full cursor-crosshair touch-none bg-white sm:h-56"
        />

        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
            <PenLine className="size-7" aria-hidden />
            <p className="text-sm font-medium">Firma aquí</p>
            <p className="text-xs">Usa el dedo, el mouse o un stylus.</p>
          </div>
        )}

        {/* Línea guía de firma */}
        <div className="pointer-events-none absolute inset-x-8 bottom-9 border-b border-dashed border-line" />
      </div>

      {/* En pantallas muy angostas (≤360px) los dos textos no caben en una fila. */}
      <div className="mt-3 flex flex-col gap-2 min-[361px]:flex-row">
        <button
          type="button"
          onClick={clear}
          disabled={!hasSignature}
          className="flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-btn border border-line bg-surface text-sm font-semibold text-muted transition-colors duration-200 hover:border-brand-ring hover:text-brand disabled:opacity-50 min-[361px]:flex-1"
        >
          <Eraser className="size-4" aria-hidden />
          Limpiar firma
        </button>

        <button
          type="button"
          onClick={clear}
          disabled={!hasSignature}
          className="flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-btn border border-line bg-surface text-sm font-semibold text-muted transition-colors duration-200 hover:border-brand-ring hover:text-brand disabled:opacity-50 min-[361px]:flex-1"
        >
          <RotateCcw className="size-4" aria-hidden />
          Volver a firmar
        </button>
      </div>

      {employeeName && (
        <div className="mt-3 rounded-btn border border-line bg-canvas px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Firmando como
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-brand">{employeeName}</p>
        </div>
      )}

      {error && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-danger animate-fade-up">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
