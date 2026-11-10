import { BottomNav } from "@/components/BottomNav";
import { requireUserAndTrip } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserAndTrip();
  return (
    <>
      <div className="pb-24">{children}</div>
      <BottomNav />
    </>
  );
}
