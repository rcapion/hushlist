"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { markReceivedAction } from "@/app/actions";
import { useT } from "@/i18n/client";

const GRACE_SECONDS = 6;

/**
 * "Fik det" with a grace period (Richard, 2026-11-16: in wishthis one wrong
 * press lost a wish for good). The press starts a countdown with Fortryd;
 * only when it runs out is the wish moved to the history — and from there it
 * can still be put back.
 */
export function FikDetButton({ wishId }: { wishId: number }) {
  const t = useT();
  const [left, setLeft] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  // The move happens here, once, when the countdown reaches zero — never inside
  // a state updater (React refuses an action started there: error #482).
  const sent = useRef(false);
  useEffect(() => {
    if (left !== 0 || sent.current) return;
    sent.current = true;
    if (timer.current) clearInterval(timer.current);
    const data = new FormData();
    data.set("wishId", String(wishId));
    startTransition(async () => {
      await markReceivedAction(data);
    });
  }, [left, wishId]);

  function start() {
    sent.current = false;
    setLeft(GRACE_SECONDS);
    timer.current = setInterval(() => {
      setLeft((s) => (s === null ? null : Math.max(0, s - 1)));
    }, 1000);
  }

  function undo() {
    if (timer.current) clearInterval(timer.current);
    setLeft(null);
  }

  if (left === null) {
    return (
      <button type="button" onClick={start} className="btn btn-outline !px-3 !py-1.5 text-sm">
        {t.list.gotIt.button}
      </button>
    );
  }
  if (left === 0 || pending) {
    return <span className="px-2 py-1.5 text-sm text-taken">{t.list.gotIt.done}</span>;
  }
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-taken">{t.list.gotIt.countdown(left)}</span>
      <button type="button" onClick={undo} className="btn btn-primary !px-3 !py-1.5 text-sm">
        {t.list.gotIt.undo}
      </button>
    </span>
  );
}
