import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import { Field } from '../components/Field';
import DataTable from '../components/DataTable';
import { marksToGrade } from '../lib/cgpa';

const emptyMarks = { internalMarks: '', externalMarks: '', assignmentMarks: '' };

export default function MarksPage() {
  const [assignment, setAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState({});
  const [semester, setSemester] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const response = await apiRequest('/staff/dashboard');
      const result = await response.json();
      setAssignment(result.assignedCourses?.[0] || null);
      setSemester(String(result.assignedCourses?.[0]?.semester || ''));
    })();
  }, []);

  useEffect(() => {
    if (!assignment) return;
    (async () => {
      const params = new URLSearchParams({ department: assignment.branch, semester: String(assignment.semester), batch: assignment.batchLabel });
      const response = await apiRequest(`/marks/students?${params.toString()}`);
      const result = await response.json();
      setStudents(result.students || []);
      setRows(Object.fromEntries((result.students || []).map((student) => [student.studentId, emptyMarks])));
    })();
  }, [assignment]);

  const rowsWithGrade = useMemo(() => students.map((student) => {
    const current = rows[student.studentId] || emptyMarks;
    const total = Number(current.internalMarks || 0) + Number(current.externalMarks || 0) + Number(current.assignmentMarks || 0);
    return { ...student, total, grade: marksToGrade(total) };
  }), [students, rows]);

  const update = (studentId, key, value) => {
    setRows((current) => ({ ...current, [studentId]: { ...(current[studentId] || emptyMarks), [key]: value } }));
  };

  const submit = async () => {
    const payload = {
      batch: assignment?.batchLabel,
      subject: assignment?.subjectName,
      semester: Number(semester || assignment?.semester || 0),
      records: rowsWithGrade.map((row) => ({
        studentId: row.studentId,
        hallTicketNumber: row.hallTicketNumber,
        internalMarks: Number(rows[row.studentId]?.internalMarks || 0),
        externalMarks: Number(rows[row.studentId]?.externalMarks || 0),
        assignmentMarks: Number(rows[row.studentId]?.assignmentMarks || 0)
      }))
    };

    const response = await apiRequest('/marks/add', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setMessage(result.message || 'Marks saved');
  };

  const exportCsv = async () => {
    const params = new URLSearchParams({ batch: assignment?.batchLabel || '', semester, subject: assignment?.subjectName || '' });
    const response = await apiRequest(`/marks/export?${params.toString()}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marks.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-600">Marks</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Internal, external, total, grade, and CGPA</h2>
        <p className="mt-2 text-sm text-slate-600">Marks are validated in the UI and recalculated by the backend, which also stores semester CGPA.</p>
      </section>

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Subject"><input value={assignment?.subjectName || ''} readOnly className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3" /></Field>
        <Field label="Batch"><input value={assignment?.batchLabel || ''} readOnly className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3" /></Field>
        <Field label="Semester"><input value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" /></Field>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={submit} className="rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white">Save Marks</button>
        <button type="button" onClick={exportCsv} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700">Export CSV</button>
      </div>

      <DataTable
        columns={[
          { key: 'fullName', label: 'Student' },
          { key: 'hallTicketNumber', label: 'Roll No' },
          { key: 'internal', label: 'Internal', render: (row) => <input value={rows[row.studentId]?.internalMarks || ''} onChange={(e) => update(row.studentId, 'internalMarks', e.target.value)} className="w-24 rounded-xl border border-slate-200 px-3 py-2" type="number" min="0" max="40" /> },
          { key: 'external', label: 'External', render: (row) => <input value={rows[row.studentId]?.externalMarks || ''} onChange={(e) => update(row.studentId, 'externalMarks', e.target.value)} className="w-24 rounded-xl border border-slate-200 px-3 py-2" type="number" min="0" max="60" /> },
          { key: 'assignment', label: 'Assignment', render: (row) => <input value={rows[row.studentId]?.assignmentMarks || ''} onChange={(e) => update(row.studentId, 'assignmentMarks', e.target.value)} className="w-24 rounded-xl border border-slate-200 px-3 py-2" type="number" min="0" max="20" /> },
          { key: 'total', label: 'Total' },
          { key: 'grade', label: 'Grade' }
        ]}
        rows={rowsWithGrade}
      />
    </div>
  );
}