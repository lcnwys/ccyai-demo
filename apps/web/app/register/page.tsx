import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("chcy_session");

  if (session?.value) {
    redirect("/jobs");
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-140px)] max-w-[560px] items-center">
      <RegisterForm />
    </section>
  );
}
