import { Input, type InputProps } from './input';
import { Label } from './label';

interface TextFieldProps extends InputProps {
  /** Visible label above the input; include the required marker in the text when needed. */
  label: string;
  /** Inline validation error, rendered in the launch-orange accent. */
  error?: string;
  /** Non-error helper text under the input; ignored when `error` is present. */
  hint?: string;
}

/** Label + Input + inline error/hint paragraph, the standard text field block. */
export function TextField({ id, label, error, hint, ...inputProps }: TextFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...inputProps} />
      {error ? (
        <p className="text-xs text-launch-orange font-medium">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate">{hint}</p>
      ) : null}
    </div>
  );
}
