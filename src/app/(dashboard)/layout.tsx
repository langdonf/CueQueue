import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col pb-16 sm:pb-0">
      <Navbar />
      <main className="flex-1">{children}</main>
      <MobileNav />
    </div>
  );
}
