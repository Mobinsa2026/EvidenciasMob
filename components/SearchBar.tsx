'use client';

import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted"
        aria-hidden
      />

      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? 'Buscar orden, factura, cliente o empleado...'}
        aria-label="Buscar evidencias"
        className="h-13 w-full rounded-btn border border-line bg-surface pl-12 pr-11 text-[15px] text-ink shadow-card outline-none transition-colors duration-200 placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand-ring/50 [&::-webkit-search-cancel-button]:hidden"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
