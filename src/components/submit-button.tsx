"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pending,
  className = "btn btn-primary",
  name,
  value,
}: {
  children: React.ReactNode;
  pending?: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
}) {
  const status = useFormStatus();
  return (
    <button type="submit" className={className} disabled={status.pending} name={name} value={value}>
      {status.pending && pending ? pending : children}
    </button>
  );
}
