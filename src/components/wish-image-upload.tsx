"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { useT } from "@/i18n/client";

/** Longest side of a stored picture: plenty for a 64 px card and a 40 px printout. */
const MAX_SIDE = 1200;

/**
 * Re-encode the chosen picture as a small JPEG before it leaves the device.
 * That makes a 4 MB iPhone photo a few hundred KB, turns HEIC into something
 * every browser shows, and drops EXIF — a photo taken at home carries the
 * house's position, and guests see these pictures.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  // White behind transparent PNGs, as the card shows them.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.85),
  );
}

/** One button: the phone offers camera and photo library, a computer its file dialog. */
export function WishImageUpload({ wishId, hasImage }: { wishId: number; hasImage: boolean }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function upload(file: File) {
    setError(null);
    start(async () => {
      let blob: Blob;
      try {
        blob = await shrink(file);
      } catch {
        setError(t.list.image.unreadable);
        return;
      }
      // The picture itself as the body, to a route that checks who is asking
      // before it reads a byte (api/billeder/[wishId]/route.ts).
      try {
        const res = await fetch(`/api/billeder/${wishId}`, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? t.list.image.saveFailed);
          return;
        }
        router.refresh();
      } catch {
        setError(t.list.image.saveFailedRetry);
      }
    });
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) upload(file);
        }}
      />
      <button type="button" className="btn btn-outline text-sm" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? t.list.image.saving : hasImage ? t.list.image.change : t.list.image.add}
      </button>
      {error && <span className="basis-full text-sm text-accent">{error}</span>}
    </>
  );
}
