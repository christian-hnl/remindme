import { DashboardContainer } from '@/components/DashboardContainer';
import { getDashboardSummary } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await getDashboardSummary();
  return <DashboardContainer initialData={data} />;
}
