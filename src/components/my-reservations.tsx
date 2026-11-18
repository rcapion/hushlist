import Link from "next/link";

import { getT } from "@/i18n/server";
import type { Person } from "@/lib/db";
import type { WishView } from "@/lib/visibility";

type Mine = { wish: WishView; person: Person };

/**
 * What the viewer has reserved, across everyone's lists — the question a guest
 * comes back with weeks later. Built from listForViewer(), so it holds only
 * what the visibility rule already lets this viewer see; `mine` is false on
 * every wish of one's own list.
 */
export function myReservations(
  people: Person[],
  list: (personId: number) => WishView[],
): Mine[] {
  return people.flatMap((person) =>
    list(person.id)
      .filter((w) => w.reservation.visible && w.reservation.mine)
      .map((wish) => ({ wish, person })),
  );
}

export function MyReservations({ mine, hrefFor }: { mine: Mine[]; hrefFor: (p: Person) => string }) {
  if (mine.length === 0) return null;
  const t = getT();
  const byPerson = new Map<number, { person: Person; titles: string[] }>();
  for (const { wish, person } of mine) {
    const group = byPerson.get(person.id) ?? { person, titles: [] };
    group.titles.push(wish.title);
    byPerson.set(person.id, group);
  }
  return (
    <div className="no-print mt-4 text-sm text-muted">
      <p>
        <span className="text-taken">✓</span> {t.common.myReservations.heading}
      </p>
      <ul className="mt-0.5 pl-4">
        {[...byPerson.values()].map(({ person, titles }) => (
          <li key={person.id}>
            <Link href={hrefFor(person)} className="hover:text-ink">
              {t.common.myReservations.for(person.name)}<span className="text-ink">{titles.join(", ")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
