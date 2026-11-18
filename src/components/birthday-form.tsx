"use client";

import { useState, useTransition } from "react";

import { setBirthdayAction } from "@/app/actions";
import { useT } from "@/i18n/client";

/** Day and month only — no year: it is for grouping gifts, not for ages. Saves on change. */
export function BirthdayForm({ personId, name, birthday }: { personId: number; name: string; birthday: string | null }) {
  const b = useT().settings.birthdays;
  const [mm, dd] = birthday ? birthday.split("-").map(Number) : [0, 0];
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  function save(form: HTMLFormElement) {
    const data = new FormData(form);
    startTransition(async () => {
      await setBirthdayAction(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form className="flex flex-wrap items-center gap-2" onChange={(e) => save(e.currentTarget)}>
      <input type="hidden" name="personId" value={personId} />
      <span className="min-w-24 flex-1">{name}</span>
      <select name="day" defaultValue={dd || ""} className="field !w-auto" aria-label={b.dayFor(name)}>
        <option value="">{b.day}</option>
        {Array.from({ length: 31 }, (_, i) => (
          <option key={i + 1} value={i + 1}>{b.dayOption(i + 1)}</option>
        ))}
      </select>
      <select name="month" defaultValue={mm || ""} className="field !w-auto" aria-label={b.monthFor(name)}>
        <option value="">{b.month}</option>
        {b.months.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <span className="w-14 text-sm text-taken">{saved ? b.saved : ""}</span>
    </form>
  );
}
