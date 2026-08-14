'use client';

import { useState } from 'react';
import { Check, Loader2, MapPin, X } from 'lucide-react';
import { useToast } from './ui/Toast';

export interface LocationValue {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface LocationCaptureProps {
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
}

export function LocationCapture({ value, onChange }: LocationCaptureProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  function capture() {
    if (!('geolocation' in navigator)) {
      toast.error('Este dispositivo no permite obtener la ubicación.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        onChange({
          latitude: Number(position.coords.latitude.toFixed(7)),
          longitude: Number(position.coords.longitude.toFixed(7)),
          accuracy: Math.round(position.coords.accuracy),
        });
        toast.success('Ubicación registrada');
      },
      (error) => {
        setLoading(false);
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado.'
            : 'No se pudo obtener la ubicación.',
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-btn border border-success/30 bg-success-soft px-4 py-3.5 animate-fade-up">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
          <Check className="size-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#14664a]">Ubicación registrada</p>
          <p className="mt-0.5 truncate font-mono text-xs text-[#14664a]/75">
            {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)} · ±{value.accuracy} m
          </p>
        </div>

        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Quitar ubicación"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#14664a]/60 transition-colors duration-200 hover:bg-success/15 hover:text-[#14664a]"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={capture}
      disabled={loading}
      className="flex h-13 w-full items-center justify-center gap-2.5 rounded-btn border border-line bg-surface font-semibold text-brand transition-colors duration-200 hover:border-brand-ring hover:bg-brand-soft disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin" aria-hidden />
      ) : (
        <MapPin className="size-5" aria-hidden />
      )}
      {loading ? 'Obteniendo ubicación…' : 'Agregar ubicación actual'}
    </button>
  );
}
