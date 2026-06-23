import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Auth guard for everything under (app). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <span className="text-lg font-bold">Sentinel</span>
        <span className="text-sm text-neutral-500">{user.email}</span>
      </header>
      {children}
    </div>
  );
}
