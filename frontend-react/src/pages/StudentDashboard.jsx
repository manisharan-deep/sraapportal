import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';

export default function StudentDashboard() {
  const [summary, setSummary] = useState(null);
  const [marks, setMarks] = useState([]);
  const [cgpaSummary, setCgpaSummary] = useState([]);

  useEffect(() => {
    (async () => {
      const response = await apiRequest('/student/dashboard');
      const result = await response.json();
      setSummary(result);
      setMarks(result.marks || []);
      setCgpaSummary(result.cgpaSummary || []);
    })();
  }, []);

  const student = summary?.student;
  const dashboardStats = useMemo(() => [
    { label: 'Attendance %', value: `${Number(student?.attendancePercentage || 0).toFixed(2)}%`, hint: 'Auto-calculated from attendance records', tone: 'cyan' },
    { label: 'CGPA', value: Number(student?.cgpa || summary?.overallCgpa || 0).toFixed(2), hint: 'Stored on the student profile', tone: 'emerald' },
    { label: 'Batch', value: `${student?.branch || '—'} · ${student?.semester || '—'}`, hint: 'Current academic cohort', tone: 'amber' }
  ], [student]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-600">Student Dashboard</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Attendance, marks, and CGPA</h2>
        <p className="mt-2 text-sm text-slate-600">Students see live attendance percentages, marks, and semester CGPA calculated by the backend.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {dashboardStats.map((item) => <StatCard key={item.label} {...item} />)}
      </div>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <h3 className="text-lg font-semibold text-slate-950">Marks</h3>
        <DataTable
          columns={[
            { key: 'subject', label: 'Subject' },
            { key: 'semester', label: 'Semester' },
            { key: 'internalMarks', label: 'Internal' },
            { key: 'externalMarks', label: 'External' },
            { key: 'totalMarks', label: 'Total' },
            { key: 'grade', label: 'Grade' },
            { key: 'cgpa', label: 'CGPA', render: (row) => Number(row.cgpa || 0).toFixed(2) }
          ]}
          rows={marks}
        />
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <h3 className="text-lg font-semibold text-slate-950">Semester CGPA</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {cgpaSummary.map((item) => (
            <div key={item.semester} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Semester {item.semester}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{Number(item.cgpa || 0).toFixed(2)}</p>
            </div>
          ))}
          {cgpaSummary.length > 0 ? null : <p className="text-sm text-slate-500">No CGPA data yet.</p>}
        </div>
      </section>
    </div>
  );
}