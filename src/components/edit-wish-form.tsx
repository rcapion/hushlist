"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { updateWishAction } from "@/app/actions";
import { useT } from "@/i18n/client";

type Fields = { title: string; price: string; url: string; note: string };
type Status = "idle" | "saving" | "saved" | "error";

/**
 * The wish's own fields, saved by themselves — no Gem button (Richard,
 * 2026-11-16: it was not clear whether pressing Gem had worked). A field is
 * saved when you leave it, or after a short pause while typing, and a quiet
 * word beside the form says what happened: Gemmer…, Gemt, or why not.
 */
export function EditWishForm({ wishId, initial }: { wishId: number; initial: Fields }) {
  const t = useT();
  const form = useRef<HTMLFormElement>(null);
  const saved = useRef<Fields>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function current(): Fields | null {
    if (!form.current) return null;
    const data = new FormData(form.current);
    return {
      title: String(data.get("title") ?? "").trim(),
      price: String(data.get("price") ?? "").trim(),
      url: String(data.get("url") ?? "").trim(),
      note: String(data.get("note") ?? "").trim(),
    };
  }

  function save() {
    if (timer.current) clearTimeout(timer.current);
    const now = current();
    if (!now) return;
    const prev = saved.current;
    if (now.title === prev.title && now.price === prev.price && now.url === prev.url && now.note === prev.note) return;
    if (!now.title) {
      setStatus("error");
      setError(t.list.edit.titleRequired);
      return;
    }
    setStatus("saving");
    setError(null);
    startTransition(async () => {
      const data = new FormData();
      data.set("wishId", String(wishId));
      for (const [k, v] of Object.entries(now)) data.set(k, v);
      try {
        const res = await updateWishAction(data);
        if (res?.error) {
          setStatus("error");
          setError(res.error);
        } else {
          saved.current = now;
          setStatus("saved");
        }
      } catch {
        setStatus("error");
        setError(t.list.edit.saveFailed);
      }
    });
  }

  // The page being hidden — the app closed, the phone locked, another tab —
  // saves whatever is unsaved at once, inside the pause below (Richard).
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") saveRef.current();
    };
    const pagehide = () => saveRef.current();
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", pagehide);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", pagehide);
    };
  }, []);

  // While typing: save after a pause, so nothing is lost if the page is left
  // without the field ever losing focus (closing the app on the phone).
  function soon() {
    if (timer.current) clearTimeout(timer.current);
    setStatus((s) => (s === "saved" || s === "error" ? "idle" : s));
    timer.current = setTimeout(save, 1200);
  }

  const enterSaves = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };
  const field = { onBlur: save, onInput: soon, onKeyDown: enterSaves };

  return (
    <form ref={form} className="mt-2 grid gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <input name="title" defaultValue={initial.title} className="field" placeholder={t.list.edit.titlePlaceholder} {...field} />
      <input name="price" defaultValue={initial.price} className="field" placeholder={t.list.edit.pricePlaceholder} {...field} />
      {/* A textarea, so a long address wraps: the URL keyboard on an iPhone has no
          space bar to move the cursor with (Richard, 2026-11-16). One line at rest,
          the whole address while you edit it. */}
      <textarea
        name="url"
        defaultValue={initial.url}
        className="field resize-none overflow-hidden break-all"
        placeholder={t.list.edit.urlPlaceholder}
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        rows={1}
        onFocus={(e) => fitHeight(e.currentTarget)}
        onBlur={(e) => {
          e.currentTarget.style.height = "";
          save();
        }}
        onInput={(e) => {
          fitHeight(e.currentTarget);
          soon();
        }}
        onKeyDown={enterSaves}
      />
      {/* Small at rest; grows to its text, and to a real writing space while you write in it. */}
      <textarea
        name="note"
        defaultValue={initial.note}
        className="field min-h-16 [field-sizing:content] transition-[min-height] focus:min-h-40"
        placeholder={t.list.edit.notePlaceholder}
        onBlur={save}
        onInput={soon}
      />
      <p className="min-h-5 text-right text-sm" aria-live="polite">
        {status === "saving" && <span className="text-muted">{t.list.edit.saving}</span>}
        {status === "saved" && <span className="text-taken">{t.list.edit.saved}</span>}
        {status === "error" && <span className="text-accent">{error}</span>}
      </p>
    </form>
  );
}

function fitHeight(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`; // + the border, which scrollHeight leaves out
}
