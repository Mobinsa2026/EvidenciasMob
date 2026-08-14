'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, Copy, Home, Plus, Receipt } from 'lucide-react';
import { formatShortDate, formatTime } from '@/lib/format';
import { DOCUMENT_TYPE_LABEL, STATUS_LABEL } from '@/lib/types';
import type { DeliveryStatus, DocumentType } from '@/lib/types';
import { Card } from './ui/Card';
import { useToast } from './ui/Toast';

export interface SuccessData {
  id: string;
  folio: string;
  created_at: string;
  document_type: DocumentType;
  document_number: string;
  client_name: string;
  employee_name: string;
  delivery_status: DeliveryStatus;
  photo_count: number;
}

interface SuccessScreenProps {
  data: SuccessData;
  onRegisterAnother: () => void;
}

export function SuccessScreen({ data, onRegisterAnother }: SuccessScreenProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copyFolio() {
    try {
      await navigator.clipboard.writeText(data.folio);
      setCopied(true);
      toast.success('Folio copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el folio.');
    }
  }

  const rows: Array<[string, string]> = [
    ['Documento', DOCUMENT_TYPE_LABEL[data.document_type]],
    ['Número', data.document_number],
    ['Cliente', data.client_name],
    ['Entregado por', data.employee_name],
    ['Estado', STATUS_LABEL[data.delivery_status]],
    ['Fecha', formatShortDate(data.created_at)],
    ['Hora', formatTime(data.created_at)],
    ['Fotografías', String(data.photo_count)],
  ];

  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <div className="flex flex-col items-center pb-2 pt-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-full gradient-brand text-white shadow-float animate-pop-in">
          <Check className="size-10" strokeWidth={2.6} aria-hidden />
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-brand">
          Evidencia registrada
        </h1>
        <p className="mt-1.5 text-[15px] text-muted">
          La entrega fue registrada correctamente.
        </p>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-line bg-brand-soft/60 px-5 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Folio</p>
          <p className="mt-1 font-mono text-xl font-bold tracking-tight text-brand">
            {data.folio}
          </p>

          <button
            type="button"
            onClick={() => void copyFolio()}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-btn border border-brand bg-surface px-4 text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft"
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? 'Copiado' : 'Copiar folio'}
          </button>
        </div>

        <dl className="divide-y divide-line">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 px-5 py-3">
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="text-right text-sm font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mt-6 space-y-3">
        <Link
          href={`/evidencias/${data.id}`}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-btn bg-brand font-semibold text-white shadow-raised transition-colors duration-200 hover:bg-brand-2"
        >
          <Receipt className="size-5" aria-hidden />
          Ver evidencia
        </Link>

        <button
          type="button"
          onClick={onRegisterAnother}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-btn border border-brand bg-surface font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft"
        >
          <Plus className="size-5" aria-hidden />
          Registrar otra entrega
        </button>

        <Link
          href="/"
          className="flex h-13 w-full items-center justify-center gap-2 rounded-btn text-sm font-semibold text-muted transition-colors duration-200 hover:text-brand"
        >
          <Home className="size-4" aria-hidden />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
