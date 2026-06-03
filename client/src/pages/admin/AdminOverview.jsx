import { Helmet } from 'react-helmet-async';
import { useAdminGetStatsQuery } from '../../features/admin/adminApi.js';
import { KPICard } from '../../components/admin/KPICard.jsx';
import { RevenueChart } from '../../components/admin/RevenueChart.jsx';
import { MembershipGrowthChart } from '../../components/admin/MembershipGrowthChart.jsx';
import { ActivityFeed } from '../../components/admin/ActivityFeed.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

export function AdminOverview() {
  const { data } = useAdminGetStatsQuery();

  return (
    <>
      <Helmet><title>Overview — Admin</title></Helmet>
      <div className="p-10">
        <h1 className="font-display text-3xl mb-8">Overview</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
          <KPICard label="Revenue this month" value={data ? formatNaira(data.revenue.thisMonth) : '—'} accent to="/admin/orders" />
          <KPICard label="Active members" value={data?.activeMembers} to="/admin/members" />
          <KPICard label="New members (week)" value={data?.newMembersThisWeek} to="/admin/members" />
          <KPICard label="Pending orders" value={data?.pendingOrders} to="/admin/orders" />
          <KPICard label="Open requests" value={data?.openRequests} to="/admin/requests" />
          <KPICard label="Products listed" value={data?.productsListed} suffix={data?.productsSold ? `(${data.productsSold} sold)` : ''} to="/admin/products" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 mb-10">
          <RevenueChart />
          <MembershipGrowthChart />
        </div>

        <ActivityFeed />
      </div>
    </>
  );
}
