import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function HomePage() {
  const cookieStore = await cookies();
  redirect(cookieStore.get("chcy_session")?.value ? "/jobs" : "/login");
}
