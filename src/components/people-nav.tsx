import Link from "next/link";

import type { Person } from "@/lib/db";

export function PeopleNav({ people, activeId, hrefFor }: { people: Person[]; activeId?: number; hrefFor: (p: Person) => string }) {
  return (
    <nav className="no-print -mx-1 flex gap-1 overflow-x-auto pb-1">
      {people.map((p) => (
        <Link
          key={p.id}
          href={hrefFor(p)}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${
            p.id === activeId ? "bg-ink text-paper" : "text-muted hover:text-ink"
          }`}
        >
          {p.name}
        </Link>
      ))}
    </nav>
  );
}
