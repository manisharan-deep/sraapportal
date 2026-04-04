import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await apiRequest('/staff/dashboard');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load teacher dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const assignment = data?.assignedCourses?.[0] || null;
  const attendanceRows = useMemo(() => data?.recentAttendance || [], [data]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-600">Teacher Dashboard</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Assigned subject and batch overview</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">A teacher sees one assigned subject, the target batch, and the student list used for attendance and marks entry.</p>
      </section>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned Subject" value={assignment ? assignment.subjectName : 'Not assigned'} hint={assignment?.subjectCode || 'Create a course assignment for this teacher'} tone="cyan" />
        <StatCard label="Batch" value={assignment ? assignment.batchLabel : '—'} hint={assignment ? `${assignment.branch} · Semester ${assignment.semester}` : 'No batch mapping yet'} tone="amber" />
        <StatCard label="Students" value={assignment?.studentCount ?? 0} hint="Students matched to the assigned batch" tone="emerald" />
        <StatCard label="Recent Attendance" value={data?.recentAttendance?.length ?? 0} hint="Latest attendance operations" tone="rose" />
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Assigned Subject</h3>
              <p className="text-sm text-slate-500">Loaded from the staff dashboard endpoint.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            {assignment ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Primary assignment</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{assignment.subjectName}</p>
                <p className="mt-1">Code: {assignment.subjectCode}</p>
                <p className="mt-1">Batch: {assignment.batchLabel}</p>
                <p className="mt-1">Credits: {assignment.credits}</p>
              </div>
            ) : (
              <p className="text-slate-500">No subject assigned yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-semibold text-slate-950">Recent Activity</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {(data?.recentAnnouncements || []).slice(0, 3).map((item) => <p key={item._id}>Announcement: {item.title}</p>)}
            {(data?.recentCoins || []).slice(0, 3).map((item) => <p key={item._id}>Coins: {item.reason || 'Awarded to a student'}</p>)}
            {!data?.recentAnnouncements?.length && !data?.recentCoins?.length ? <p>No recent updates.</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <h3 className="text-lg font-semibold text-slate-950">Latest Attendance</h3>
        {loading ? <p className="mt-4 text-sm text-slate-500">Loading...</p> : (
          <DataTable
            columns={[
              { key: 'studentId', label: 'Student', render: (row) => row.studentId?.name || '-' },
              { key: 'rollNumber', label: 'Roll No', render: (row) => row.studentId?.rollNumber || '-' },
              { key: 'status', label: 'Status' },
              { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString() }
            ]}
            rows={attendanceRows}
          />
        )}
      </section>
    </div>
  );
}