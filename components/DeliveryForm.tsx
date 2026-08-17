'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  ClipboardCheck,
  Hash,
  MapPin,
  PenLine,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { canvasToSignatureBlob } from '@/lib/image';
import {
  DOCUMENT_TYPE_LABEL,
  MAX_NOTES,
  STATUS_LABEL,
  type DeliveryStatus,
  type DocumentType,
  type Employee,
} from '@/lib/types';
import { buildTitle } from '@/lib/validation';
import { DocumentSelector } from './DocumentSelector';
import { EmployeeSelector } from './EmployeeSelector';
import { useSession } from './SessionProvider';
import { LocationCapture, type LocationValue } from './LocationCapture';
import { PhotoUploader, type PhotoItem } from './PhotoUploader';
import { SignaturePad } from './SignaturePad';
import { StatusSelector } from './StatusSelector';
import { SuccessScreen, type SuccessData } from './SuccessScreen';
import { SectionCard } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Field';
import { useToast } from './ui/Toast';

type Errors = Record<string, string>;

const PLACEHOLDER: Record<DocumentType, string> = {
  orden_trabajo: 'Ej. OT-001245',
  factura: 'Ej. FAC-004215',
};

/** Datos mínimos de la tarea que esta evidencia va a cerrar. */
export interface AssignmentContext {
  id: string;
  folio: string;
  document_type: DocumentType;
  document_number: string;
  client_name: string;
  title: string;
}

export function DeliveryForm({
  initialEmployees,
  currentEmployeeId,
  assignment,
}: {
  initialEmployees: Employee[];
  currentEmployeeId?: string | null;
  assignment?: AssignmentContext | null;
}) {
  const toast = useToast();
  const sesion = useSession();
  const formTopRef = useRef<HTMLDivElement>(null);

  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [documentType, setDocumentType] = useState<DocumentType>(
    assignment?.document_type ?? 'orden_trabajo',
  );
  const [documentNumber, setDocumentNumber] = useState(assignment?.document_number ?? '');
  const [clientName, setClientName] = useState(assignment?.client_name ?? '');
  const [receivedBy, setReceivedBy] = useState('');
  // Por defecto, quien entrega es el propio usuario en sesión.
  const [deliveredBy, setDeliveredBy] = useState(
    currentEmployeeId && initialEmployees.some((e) => e.id === currentEmployeeId)
      ? currentEmployeeId
      : (initialEmployees[0]?.id ?? ''),
  );
  const [status, setStatus] = useState<DeliveryStatus>('completa');
  const [title, setTitle] = useState(assignment?.title ?? '');
  const [titleEdited, setTitleEdited] = useState(Boolean(assignment));
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [signatureCanvas, setSignatureCanvas] = useState<HTMLCanvasElement | null>(null);
  const [location, setLocation] = useState<LocationValue | null>(null);

  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => createUuid());

  const employee = employees.find((item) => item.id === deliveredBy);

  // Título automático mientras el usuario no lo edite manualmente.
  useEffect(() => {
    if (titleEdited) return;
    setTitle(buildTitle(documentType, documentNumber, clientName));
  }, [documentType, documentNumber, clientName, titleEdited]);

  // Libera los object URLs de las previsualizaciones al desmontar.
  useEffect(
    () => () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const progress = useMemo(() => {
    const info = Boolean(documentNumber.trim() && clientName.trim() && deliveredBy);
    const evidence = photos.length > 0 && Boolean(signatureCanvas);
    return { info, evidence, ready: info && evidence };
  }, [documentNumber, clientName, deliveredBy, photos.length, signatureCanvas]);

  function validate(): Errors {
    const next: Errors = {};
    if (documentNumber.trim().length < 2)
      next.document_number = 'Ingresa el número de la orden o factura.';
    if (clientName.trim().length < 2) next.client_name = 'Ingresa el nombre del cliente.';
    if (!deliveredBy) next.delivered_by = 'Selecciona quién realiza la entrega.';
    if (title.trim().length < 3) next.title = 'Ingresa un título para la evidencia.';
    if (photos.length === 0) next.photos = 'Agrega al menos una fotografía de la entrega.';
    if (!signatureCanvas) next.signature = 'Registra la firma de entrega.';
    return next;
  }

  async function handleSubmit() {
    if (submitting) return;

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Revisa los campos marcados.');
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setSubmitting(true);
    try {
      const signatureBlob = await canvasToSignatureBlob(signatureCanvas!);
      const signatureExtension = signatureBlob.type.includes('webp') ? 'webp' : 'png';

      const form = new FormData();
      form.set('document_type', documentType);
      form.set('document_number', documentNumber);
      form.set('client_name', clientName);
      form.set('received_by', receivedBy);
      form.set('delivered_by', deliveredBy);
      form.set('delivery_status', status);
      form.set('title', title);
      form.set('notes', notes);
      form.set('idempotency_key', idempotencyKey);
      if (assignment) form.set('assignment_id', assignment.id);

      if (location) {
        form.set('latitude', String(location.latitude));
        form.set('longitude', String(location.longitude));
        form.set('location_accuracy', String(location.accuracy));
      }

      photos.forEach((photo, index) => {
        form.append('photos', photo.blob, `photo-${index + 1}.${photo.extension}`);
      });
      form.set('signature', signatureBlob, `signature.${signatureExtension}`);

      const response = await fetch('/api/deliveries', { method: 'POST', body: form });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (data?.fields) setErrors(data.fields as Errors);
        toast.error(data?.error ?? 'No se pudo registrar la evidencia.');
        formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      toast.success('Evidencia guardada');
      setSuccess({
        id: data.delivery.id,
        folio: data.delivery.folio,
        created_at: data.delivery.created_at,
        document_type: documentType,
        document_number: documentNumber.trim(),
        client_name: clientName.trim(),
        employee_name: employee?.name ?? '—',
        delivery_status: status,
        photo_count: photos.length,
      });
    } catch {
      toast.error('Sin conexión. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setDocumentNumber('');
    setClientName('');
    setReceivedBy('');
    setStatus('completa');
    setTitle('');
    setTitleEdited(false);
    setNotes('');
    setPhotos([]);
    setSignatureCanvas(null);
    setLocation(null);
    setErrors({});
    setIdempotencyKey(createUuid());
    setSuccess(null);
    window.scrollTo({ top: 0 });
  }

  if (success) {
    return <SuccessScreen data={success} onRegisterAnother={resetForm} />;
  }

  return (
    <div ref={formTopRef} className="space-y-5 animate-fade-up">
      {assignment && (
        <div className="flex items-start gap-3 rounded-card border border-brand-ring bg-brand-soft p-4">
          <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand">Cerrarás una tarea asignada</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink">
              Al registrar esta evidencia se detiene el cronómetro de{' '}
              <span className="font-mono font-semibold">{assignment.folio}</span>.
            </p>
          </div>
        </div>
      )}

      <ProgressBar info={progress.info} evidence={progress.evidence} />

      {/* ── 1 · Documento ─────────────────────────────────────────────── */}
      <SectionCard step={1} title="Documento" description="¿Qué se está entregando?">
        <DocumentSelector value={documentType} onChange={setDocumentType} />

        <Input
          label="Número de orden / factura"
          required
          icon={<Hash className="size-[18px]" aria-hidden />}
          placeholder={PLACEHOLDER[documentType]}
          value={documentNumber}
          maxLength={40}
          autoComplete="off"
          autoCapitalize="characters"
          error={errors.document_number}
          onChange={(event) => setDocumentNumber(event.target.value)}
        />

        <Input
          label="Cliente"
          required
          icon={<Building2 className="size-[18px]" aria-hidden />}
          placeholder="Nombre del cliente o empresa"
          value={clientName}
          maxLength={120}
          error={errors.client_name}
          onChange={(event) => setClientName(event.target.value)}
        />

        <Input
          label="Recibido por"
          optional
          icon={<UserRound className="size-[18px]" aria-hidden />}
          placeholder="Nombre de la persona que recibió"
          hint="Si conoces el nombre de quien recibe la mercancía."
          value={receivedBy}
          maxLength={120}
          error={errors.received_by}
          onChange={(event) => setReceivedBy(event.target.value)}
        />
      </SectionCard>

      {/* ── 2 · Entrega ───────────────────────────────────────────────── */}
      <SectionCard step={2} title="Entrega" description="Quién entregó y cómo terminó.">
        <EmployeeSelector
          employees={employees.filter((item) => item.active)}
          value={deliveredBy}
          error={errors.delivered_by}
          puedeAgregar={sesion.role === 'jefe'}
          onChange={(id) => {
            setDeliveredBy(id);
            setErrors((current) => ({ ...current, delivered_by: '' }));
          }}
          onCreated={(created) => setEmployees((current) => [...current, created])}
        />

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">¿Cómo terminó la entrega?</p>
          <StatusSelector value={status} onChange={setStatus} />
        </div>
      </SectionCard>

      {/* ── 3 · Detalle ───────────────────────────────────────────────── */}
      <SectionCard
        step={3}
        title="Detalle"
        description="Título y observaciones de la evidencia."
      >
        <Input
          label="Título de la evidencia"
          required
          icon={<ClipboardList className="size-[18px]" aria-hidden />}
          placeholder="Ej. Entrega de refacciones OT-1245"
          hint={titleEdited ? undefined : 'Se genera automáticamente. Puedes modificarlo.'}
          value={title}
          maxLength={160}
          error={errors.title}
          onChange={(event) => {
            setTitleEdited(true);
            setTitle(event.target.value);
          }}
        />

        <Textarea
          label="Observaciones"
          optional
          placeholder="Agrega información adicional sobre la entrega..."
          value={notes}
          maxLength={MAX_NOTES}
          showCounter
          error={errors.notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </SectionCard>

      {/* ── 4 · Evidencia fotográfica ─────────────────────────────────── */}
      <SectionCard
        icon={<Camera className="size-[18px]" aria-hidden />}
        step={4}
        title="Evidencia fotográfica"
        description="Agrega fotografías que comprueben la entrega."
      >
        <PhotoUploader
          photos={photos}
          error={errors.photos}
          onChange={(next) => {
            setPhotos(next);
            if (next.length) setErrors((current) => ({ ...current, photos: '' }));
          }}
        />
      </SectionCard>

      {/* ── 5 · Firma ─────────────────────────────────────────────────── */}
      <SectionCard
        step={5}
        title="Firma de entrega"
        description="Firma de la persona que realiza la entrega."
      >
        <SignaturePad
          employeeName={employee?.name}
          error={errors.signature}
          onChange={(canvas) => {
            setSignatureCanvas(canvas);
            if (canvas) setErrors((current) => ({ ...current, signature: '' }));
          }}
        />
      </SectionCard>

      {/* ── 6 · Ubicación (opcional) ──────────────────────────────────── */}
      <SectionCard
        icon={<MapPin className="size-[18px]" aria-hidden />}
        title="Ubicación de entrega"
        description="Puedes guardar la ubicación donde se realizó la entrega."
      >
        <LocationCapture value={location} onChange={setLocation} />
      </SectionCard>

      {/* ── Resumen ───────────────────────────────────────────────────── */}
      <SectionCard
        icon={<FileText className="size-[18px]" aria-hidden />}
        title="Resumen de evidencia"
        description="Revisa antes de guardar."
      >
        <dl className="-my-2 divide-y divide-line">
          <SummaryRow label="Documento" value={DOCUMENT_TYPE_LABEL[documentType]} />
          <SummaryRow label="Número" value={documentNumber || '—'} />
          <SummaryRow label="Cliente" value={clientName || '—'} />
          <SummaryRow label="Recibido por" value={receivedBy || '—'} />
          <SummaryRow label="Entregado por" value={employee?.name ?? '—'} />
          <SummaryRow label="Estado" value={STATUS_LABEL[status]} />
          <SummaryRow label="Fotografías" value={String(photos.length)} ok={photos.length > 0} />
          <SummaryRow
            label="Firma"
            value={signatureCanvas ? 'Registrada' : 'Pendiente'}
            ok={Boolean(signatureCanvas)}
          />
          <SummaryRow
            label="Ubicación"
            value={location ? 'Registrada' : 'Sin ubicación'}
            ok={Boolean(location)}
            neutral={!location}
          />
        </dl>
      </SectionCard>

      <div className="sticky bottom-28 z-30 md:bottom-6">
        <Button
          size="lg"
          fullWidth
          loading={submitting}
          onClick={() => void handleSubmit()}
          className="gradient-brand shadow-float"
        >
          {!submitting && <CheckCircle2 className="size-5" aria-hidden />}
          {submitting ? 'Registrando evidencia…' : 'Registrar evidencia'}
        </Button>
      </div>

      <p className="pb-2 text-center text-xs text-muted">
        La fecha y la hora se registran automáticamente al guardar.
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  ok,
  neutral,
}: {
  label: string;
  value: string;
  ok?: boolean;
  neutral?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd
        className={cn(
          'text-right text-sm font-semibold',
          ok === undefined || neutral ? 'text-ink' : ok ? 'text-success' : 'text-muted',
        )}
      >
        {ok && '✓ '}
        {value}
      </dd>
    </div>
  );
}

function ProgressBar({ info, evidence }: { info: boolean; evidence: boolean }) {
  const steps = [
    { label: 'Información', done: info },
    { label: 'Evidencia', done: evidence },
    { label: 'Confirmar', done: info && evidence },
  ];

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.label} className="flex flex-1 flex-col gap-1.5">
          <span
            className={cn(
              'h-1 rounded-full transition-colors duration-300',
              step.done ? 'bg-brand' : 'bg-line',
            )}
          />
          <span
            className={cn(
              'text-[11px] font-medium transition-colors duration-300',
              step.done ? 'text-brand' : 'text-muted',
              index === steps.length - 1 && 'text-right',
              index === 1 && 'text-center',
            )}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function createUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Respaldo para navegadores sin crypto.randomUUID (contextos no seguros).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
