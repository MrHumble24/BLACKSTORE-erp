interface FormErrorProps {
  message?: string | null;
}

/** Error message banner with Apple Launch Orange styling. */
export function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <div className="rounded-2xl bg-launch-orange/10 border border-launch-orange/20 p-3 text-xs font-medium text-launch-orange tracking-[-0.01em]">
      {message}
    </div>
  );
}
