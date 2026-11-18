import type { da } from "./da";

/**
 * The shape every language must have: Danish is the reference, because the app
 * was written in it. A language that misses a key, or has one too many, does
 * not compile — that is the whole safety net for translators.
 */
export type Messages = typeof da;
