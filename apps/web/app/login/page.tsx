import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LoginForm } from "./login-form";
import { getBootstrapUser } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("chcy_session");

  if (session?.value) {
    redirect("/jobs");
  }

  const bootstrap = await getBootstrapUser();

  return (
    <section className="mx-auto flex min-h-[calc(100vh-140px)] max-w-[520px] items-center">
      <LoginForm
        defaultEmail={bootstrap.data?.email ?? "sales@chcy.local"}
        passwordHint={bootstrap.data?.passwordHint ?? "chcy123456"}
      />
    </section>
  );
}
