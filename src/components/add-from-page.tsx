"use client";

import { useEffect, useState } from "react";

import { addFromPageAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

/** The page's head arrives in the fragment; taken out of the address at once. */
export function AddFromPage({ url, lists }: { url: string; lists: { id: number; label: string }[] }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        setHtml(decodeURIComponent(hash));
      } catch {
        // A cut-off escape: the server fetches the page itself instead.
      }
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  return (
    <div className="grid gap-3">
      {lists.map((list) => (
        <form key={list.id} action={addFromPageAction}>
          <input type="hidden" name="personId" value={list.id} />
          <input type="hidden" name="url" value={url} />
          <input type="hidden" name="html" value={html} />
          <SubmitButton className="btn btn-primary w-full">{list.label}</SubmitButton>
        </form>
      ))}
    </div>
  );
}
