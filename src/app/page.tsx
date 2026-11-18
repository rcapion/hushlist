import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { SetupForm } from "@/components/setup-form";
import { listPeople } from "@/lib/db";
import { currentMember, rememberedFamilyToken } from "@/lib/session";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function Home(props: PageProps<"/">) {
  const t = getT();
  const people = listPeople();
  const member = await currentMember();
  if (member) redirect(`/liste/${member.id}`);
  // A browser that has used the family link goes back to the wishes; ?login
  // is the household's way past that (the link at the foot of the guest page).
  const { login } = await props.searchParams;
  const family = login === undefined ? await rememberedFamilyToken() : null;
  if (family) redirect(`/f/${family}`);

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-serif text-4xl tracking-tight">{t.shell.appName}</h1>
      {people.length === 0 ? (
        <>
          <p className="mt-2 mb-8 text-muted">{t.guest.home.whoLivesHere}</p>
          <SetupForm />
        </>
      ) : (
        <>
          <p className="mt-2 mb-8 text-muted">{t.guest.home.loginIntro}</p>
          <LoginForm
            firstRun={
              people.some((p) => p.isAdult && p.hasPassword)
                ? null
                : people.filter((p) => p.isAdult).map(({ id, name }) => ({ id, name }))
            }
          />
        </>
      )}
    </main>
  );
}
