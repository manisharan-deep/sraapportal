import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import { Field } from '../components/Field';
import DataTable from '../components/DataTable';

export default function AttendancePage() {
  const [assignment, setAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusMap, setStatusMap] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const response = await apiRequest('/staff/dashboard');
      const result = await response.json();
      setAssignment(result.assignedCourses?.[0] || null);
    })();
  }, []);

  useEffect(() => {
    if (!assignment) return;
    (async () => {
      const params = new URLSearchParams({ department: assignment.branch, semester: String(assignment.semester), batch: assignment.batchLabel });
      const response = await apiRequest(`/attendance/students?${params.toString()}`);
      const result = await response.json();
      setStudents(result.students || []);
      const defaults = Object.fromEntries((result.students || []).map((student) => [student.studentId, 'Present']));
      setStatusMap(defaults);
    })();
  }, [assignment]);

  const rows = useMemo(() => students.map((student) => ({ ...student, status: statusMap[student.studentId] || 'Present' })), [students, statusMap]);

  const setStatus = (studentId, value) => {
    setStatusMap((current) => ({ ...current, [studentId]: value }));
  };

  const submit = async () => {
    const payload = {
      batch: assignment?.batchLabel,
      semester: assignment?.semester,
      department: assignment?.branch,
      subject: assignment?.subjectName,
      date,
      records: rows.map((row) => ({
        studentId: row.studentId,
        name: row.fullName,
        hallTicketNumber: row.hallTicketNumber,
        department: row.department,
        batch: row.batch,
        semester: row.semester,
        status: statusMap[row.studentId] || 'Present'
      }))
    };

    const response = await apiRequest('/attendance/mark-bulk', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setMessage(result.message || 'Attendance saved');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-600">Attendance</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Batch-wise attendance entry</h2>
        <p className="mt-2 text-sm text-slate-600">Mark present or absent for the selected subject batch. The backend stores one attendance row per student per subject and date.</p>
      </section>

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" /></Field>
        <Field label="Subject"><input value={assignment?.subjectName || ''} readOnly className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3" /></Field>
        <Field label="Batch"><input value={assignment?.batchLabel || ''} readOnly className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3" /></Field>
      </div>

      <DataTable
        columns={[
          { key: 'fullName', label: 'Student' },
          { key: 'hallTicketNumber', label: 'Roll No' },
          { key: 'status', label: 'Status', render: (row) => {
            const current = statusMap[row.studentId] || 'Present';
            return (
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setStatus(row.studentId, 'Present')}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${current === 'Present' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Present
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(row.studentId, 'Absent')}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${current === 'Absent' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Absent
                </button>
              </div>
            );
          } }
        ]}
        rows={rows}
      />

      <button type="button" onClick={submit} className="rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white">Save Attendance</button>
    </div>
  );
}