import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    (async () => {
      const [statsResponse, dashboardResponse] = await Promise.all([
        apiRequest('/admin/stats'),
        apiRequest('/admin/dashboard')
      ]);
      setStats(await statsResponse.json());
      setDashboard(await dashboardResponse.json());
    })();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-600">Admin Dashboard</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Operational control center</h2>
        <p className="mt-2 text-sm text-slate-600">Manage users, review pending profile approvals, and keep the portal healthy.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Students" value={stats?.totalStudents ?? 0} tone="cyan" />
        <StatCard label="Staff" value={stats?.totalStaff ?? 0} tone="amber" />
        <StatCard label="Users" value={stats?.totalUsers ?? 0} tone="emerald" />
        <StatCard label="Pending Approvals" value={stats?.pendingCount ?? 0} tone="rose" />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-semibold text-slate-950">Pending profile approvals</h3>
          <DataTable
            columns={[
              { key: 'name', label: 'Student', render: (row) => row.userId?.fullName || row.name },
              { key: 'branch', label: 'Branch' },
              { key: 'semester', label: 'Semester' }
            ]}
            rows={dashboard?.pending || []}
          />
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-semibold text-slate-950">Users</h3>
          <DataTable
            columns={[
              { key: 'fullName', label: 'Name' },
              { key: 'role', label: 'Role' },
              { key: 'email', label: 'Email' },
              { key: 'isActive', label: 'Active', render: (row) => (row.isActive ? 'Yes' : 'No') }
            ]}
            rows={dashboard?.users || []}
          />
        </div>
      </section>
    </div>
  );
}