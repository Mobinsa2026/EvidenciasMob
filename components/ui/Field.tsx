'use client';

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FieldShellProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function FieldShell({
  label,
  htmlFor,
  required,
  optional,
  hint,
  error,
  children,
}: FieldShellProps) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
          {label}
          {required && <span className="ml-1 text-accent">*</span>}
        </label>
        {optional && <span className="text-xs text-muted">Opcional</span>}
      </div>

      {children}

      {hint && !error && <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>}

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger animate-fade-up">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL_BASE =
  'w-full rounded-btn border bg-surface px-4 text-[15px] text-ink placeholder:text-muted/70 ' +
  'transition-colors duration-200 outline-none ' +
  'focus:border-brand focus:ring-4 focus:ring-brand-ring/50';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, optional, icon, className, id, required, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FieldShell
      label={label}
      htmlFor={inputId}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
    >
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            CONTROL_BASE,
            'h-13 py-3',
            icon && 'pl-11',
            error ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-line',
            className,
          )}
          {...props}
        />
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  maxLength?: number;
  showCounter?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    hint,
    error,
    optional,
    className,
    id,
    required,
    maxLength,
    showCounter,
    value,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const length = typeof value === 'string' ? value.length : 0;
  const nearLimit = maxLength ? length > maxLength * 0.9 : false;

  return (
    <FieldShell
      label={label}
      htmlFor={textareaId}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
    >
      <textarea
        ref={ref}
        id={textareaId}
        value={value}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        className={cn(
          CONTROL_BASE,
          'min-h-28 resize-y py-3 leading-relaxed',
          error ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-line',
          className,
        )}
        {...props}
      />

      {showCounter && maxLength && (
        <p
          className={cn(
            'mt-1.5 text-right text-xs tabular-nums',
            nearLimit ? 'text-warn' : 'text-muted',
          )}
        >
          {length} / {maxLength}
        </p>
      )}
    </FieldShell>
  );
});
