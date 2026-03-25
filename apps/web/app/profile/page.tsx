import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/api";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("chcy_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const result = await getCurrentUser(token);

  return (
    <section className="mx-auto max-w-[1080px]">
      <div className="mb-6 border-b border-white/8 pb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">个人设置</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-champagne">创次元账号绑定</h1>
        <p className="mt-3 text-sm leading-7 text-white/48">
          任务提交、结果查询、回调验签都会使用你自己的创次元 AccessKey / SecretKey。
        </p>
      </div>
      <ProfileForm initialProfile={result.data} />
    </section>
  );
}
