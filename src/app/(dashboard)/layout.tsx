import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { Navbar } from "@/components/shared/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("sb-zrwnpfhmtjeanhanumnb-auth-token");

  if (!authCookie) redirect("/login");

  const role = cookieStore.get("user_role")?.value;
  const status = cookieStore.get("user_status")?.value;

  if (!role || !status || status === "locked" || status === "inactive") {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50/30">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
