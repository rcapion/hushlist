// Opens and migrates the database once, before the server takes a request,
// and closes it on the way out so the WAL is checkpointed into the file.
// A consistent copy for the offsite backup at start and every six hours: the
// nightly offsite sync then never takes one older than that.
const BACKUP_EVERY_MS = 6 * 60 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { backupDatabase, initializeDatabase, closeDatabase } = await import("@/lib/db");
    initializeDatabase();
    process.on("exit", closeDatabase);
    const backup = () => {
      try {
        backupDatabase();
      } catch (error) {
        console.error("onskeliste: database backup failed", error);
      }
    };
    backup();
    setInterval(backup, BACKUP_EVERY_MS).unref();

    // The nightly link check (docs/DESIGN.md): looked at every quarter of
    // an hour, run once a day from 03:00 in the app's time zone.
    // HUSHLIST_LINK_CHECK=off leaves it out.
    const { linkCheckEnabled } = await import("@/lib/config");
    const { lastLinkCheckRun } = await import("@/lib/db");
    const { linkCheckDue, runLinkCheck } = await import("@/lib/link-check");
    const maybeCheckLinks = () => {
      if (!linkCheckDue(lastLinkCheckRun()?.at ?? null)) return;
      runLinkCheck().catch((error) => console.error("onskeliste: link check failed", error));
    };
    if (linkCheckEnabled()) setInterval(maybeCheckLinks, 15 * 60 * 1000).unref();
  }
}
