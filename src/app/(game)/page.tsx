import { getDashboardData } from "@/actions/dashboard-actions";
import { DashboardClient } from "@/components/game/dashboard-client";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return <DashboardClient initialData={data} />;
}
