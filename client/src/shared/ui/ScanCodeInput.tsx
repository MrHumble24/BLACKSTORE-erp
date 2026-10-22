import { type KeyboardEvent, type RefObject } from 'react';
import { Input } from './input';
import { Label } from './label';
import { CameraScanButton } from './CameraScanButton';

interface ScanCodeInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Called on Enter or camera scan with the current/scanned code. */
  onSubmit: (code: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
}

/** Shared scan row: label + code input (Enter submits) + camera button; used by every scan flow. */
export function ScanCodeInput({
  id, label, value, onChange, onSubmit, inputRef, autoFocus, placeholder, hint, disabled,
}: ScanCodeInputProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(value);
    }
  };
  const onCameraScan = (code: string) => {
    onChange(code);
    onSubmit(code);
  };

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
        />
        <CameraScanButton onScan={onCameraScan} />
      </div>
      {hint && <p className="text-[11px] text-slate">{hint}</p>}
    </div>
  );
}
