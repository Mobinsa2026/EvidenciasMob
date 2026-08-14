'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileStack, Loader2, Plus, SearchX } from 'lucide-react';
import type { DeliveryListItem, Employee } from '@/lib/types';
import { DeliveryCard } from './DeliveryCard';
import { DeliveryFilters, DEFAULT_FILTERS, type FiltersState } from './DeliveryFilters';
import { DeliveryTable } from './DeliveryTable';
import { SearchBar } from './SearchBar';
import { EmptyState } from './ui/EmptyState';
import { DeliveryCardSkeleton } from './ui/Skeleton';
import { useToast } from './ui/Toast';

const PAGE_SIZE = 12;

export function HistoryView({ employees }: { employees: Employee[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);

  const [items, setItems] = useState<DeliveryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  // Evita que una respuesta lenta sobrescriba una búsqueda más reciente.
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const buildQuery = useCallback(
    (page: number) => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (filters.documentType !== 'todos') params.set('documentType', filters.documentType);
      if (filters.status !== 'todos') params.set('status', filters.status);
      if (filters.employeeId !== 'todos') params.set('employeeId', filters.employeeId);
      if (filters.dateRange !== 'todos') params.set('dateRange', filters.dateRange);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      return params.toString();
    },
    [debouncedSearch, filters],
  );

  useEffect(() => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setFailed(false);

    fetch(`/api/deliveries?${buildQuery(1)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error ?? 'Error');
        if (currentRequest !== requestId.current) return;

        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setHasMore(Boolean(data.hasMore));
      })
      .catch(() => {
        if (currentRequest !== requestId.current) return;
        setFailed(true);
        setItems([]);
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  }, [buildQuery]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const nextPage = Math.floor(items.length / PAGE_SIZE) + 1;
      const response = await fetch(`/api/deliveries?${buildQuery(nextPage)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Error');

      setItems((current) => [...current, ...(data.items ?? [])]);
      setHasMore(Boolean(data.hasMore));
    } catch {
      toast.error('No se pudieron cargar más evidencias.');
    } finally {
      setLoadingMore(false);
    }
  }

  const filtering =
    debouncedSearch.trim().length > 0 ||
    (['documentType', 'status', 'dateRange', 'employeeId'] as const).some(
      (key) => filters[key] !== 'todos',
    );

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand">Historial de entregas</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Consulta todas las evidencias registradas.
        </p>
      </div>

      <SearchBar value={search} onChange={setSearch} />
      <DeliveryFilters value={filters} employees={employees} onChange={setFilters} />

      {!loading && !failed && items.length > 0 && (
        <p className="text-[13px] text-muted">
          {total} {total === 1 ? 'evidencia encontrada' : 'evidencias encontradas'}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((index) => (
            <DeliveryCardSkeleton key={index} />
          ))}
        </div>
      ) : failed ? (
        <EmptyState
          icon={<SearchX className="size-6" aria-hidden />}
          title="No se pudo cargar el historial"
          description="Revisa tu conexión o la configuración de Supabase e inténtalo de nuevo."
        />
      ) : items.length === 0 ? (
        filtering ? (
          <EmptyState
            icon={<SearchX className="size-6" aria-hidden />}
            title="Sin resultados"
            description="No encontramos evidencias con esos criterios. Prueba con otra búsqueda o limpia los filtros."
          />
        ) : (
          <EmptyState
            icon={<FileStack className="size-6" aria-hidden />}
            title="Aún no hay evidencias registradas"
            description="Las entregas que registres aparecerán aquí."
            action={
              <Link
                href="/registrar"
                className="inline-flex h-12 items-center gap-2 rounded-btn bg-brand px-5 font-semibold text-white shadow-raised transition-colors duration-200 hover:bg-brand-2"
              >
                <Plus className="size-5" aria-hidden />
                Registrar primera entrega
              </Link>
            }
          />
        )
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((delivery) => (
              <DeliveryCard key={delivery.id} delivery={delivery} />
            ))}
          </div>

          <div className="hidden md:block">
            <DeliveryTable deliveries={items} />
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-btn border border-line bg-surface text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft disabled:opacity-60"
            >
              {loadingMore && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {loadingMore ? 'Cargando…' : 'Cargar más'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
