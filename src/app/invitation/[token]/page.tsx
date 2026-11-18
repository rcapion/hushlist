import { InviteForm } from "@/components/invite-form";
import { personByInvite } from "@/lib/db";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function Invitation(props: PageProps<"/invitation/[token]">) {
  const { token } = await props.params;
  const person = personByInvite(token);
  const t = getT();

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-serif text-4xl tracking-tight">{t.shell.appName}</h1>
      {person ? (
        <>
          <p className="mt-2 mb-8 text-muted">{t.guest.invitation.welcome(person.name)}</p>
          <InviteForm token={token} name={person.name} />
        </>
      ) : (
        <p className="mt-2 text-muted">{t.guest.invitation.invalid}</p>
      )}
    </main>
  );
}
