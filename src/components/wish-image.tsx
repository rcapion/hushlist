/** The local copy of a shop picture, or a quiet placeholder with the initial. */
export function WishImage({ path, title, size = "md" }: { path: string | null; title: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-10 w-10 rounded-md text-base" : "h-16 w-16 rounded-xl text-2xl";
  if (!path) {
    return (
      <div className={`${box} flex shrink-0 items-center justify-center bg-accent-soft font-serif text-accent`}>
        {title.trim().charAt(0).toUpperCase() || "·"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served from our own route, no optimiser wanted
    <img
      src={`/billeder/${path}`}
      alt=""
      className={`${box} shrink-0 border border-line bg-white object-contain ${size === "sm" ? "p-0.5" : "p-1"}`}
      // Lazy images below the fold are missing from a printout.
      loading={size === "sm" ? "eager" : "lazy"}
    />
  );
}
