import type { Metadata } from "next";

/** Internal, read-only admin area — keep it out of search indexes. The page
 *  itself is a client component, so robots metadata lives on this server layout. */
export const metadata: Metadata = {
  title: "rentaro · admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
