import type { Metadata } from "next";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";
import { AdminShell } from "@/components/admin/AdminShell";

/** Internal, read-only admin area — keep it out of search indexes. This layout
 *  stays a server component so it can export `robots` metadata; it delegates all
 *  interactivity to the client AdminAuthProvider + AdminShell, which together
 *  provide the single persistent console (sign-in once, sidebar, topbar). */
export const metadata: Metadata = {
  title: "rentaro · admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
