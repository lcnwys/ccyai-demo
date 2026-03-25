"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        document.cookie =
          "chcy_session=; path=/; max-age=0; SameSite=Lax";
        router.replace("/login");
        router.refresh();
      }}
      className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.06]"
    >
      退出登录
    </button>
  );
}
