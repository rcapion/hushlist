"use client";

import { useFormStatus } from "react-dom";

/** A submit button that asks first. For the one click that cannot be undone. */
export function ConfirmButton({ children, question, className }: { children: React.ReactNode; question: string; className: string }) {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={status.pending}
      onClick={(e) => {
        if (!window.confirm(question)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
