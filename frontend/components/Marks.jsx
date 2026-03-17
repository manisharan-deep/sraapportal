import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE = `${window.location.origin}/api`;

const gradeBadge = (grade) => {
  if (grade === 'A') return 'bg-emerald-100 text-emerald-700';
  if (grade === 'B') return 'bg-blue-100 text-blue-700';
  if (grade === 'C') return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

const calcGrade = (total) => {
  if (total >= 85) return 'A';
  if (total >= 70) return 'B';
  if (total >= 55) return 'C';
  return 'Fail';
};

export default function Marks({ filters }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 25 });
  const [marksMap, setMarksMap] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('accessToken');
  const api = useMemo(() => axios.create({
    baseURL: API_BASE,
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  }), [token]);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(window.__marksToastTimer);
    window.__marksToastTimer = window.setTimeout(() => setToast(null), 3000);
  };

  const loadStudents = async () => {
    if (!filters.batch || !filters.department || !filters.semester) return;
    setLoading(true);
    try {
      const { data } = await api.get('/marks/students', {
        params: {
          batch: filters.batch,
          department: filters.department,
          semester: filters.semester,
          search,
          page,
          limit: 25
        }
      });
      setStudents(data.students || []);
      setPagination(data.pagination || { total: 0, totalPages: 1, limit: 25 });

      const next = {};
      (data.students || []).forEach((student) => {
        next[student.studentId] = {
          studentId: student.studentId,
          hallTicketNumber: student.hallTicketNumber,
          internalMarks: 0,
          externalMarks: 0,
          assignmentMarks: 0
        };
      });
      setMarksMap(next);
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingMarks = async () => {
    if (!filters.batch || !filters.semester || !filters.subject) return;
    try {
      const { data } = await api.get('/marks', {
        params: {
          batch: filters.batch,
          semester: filters.semester,
          subject: filters.subject,
          page: 1,
          limit: 500
        }
      });

      setMarksMap((prev) => {
        const next = { ...prev };
        (data.marks || []).forEach((row) => {
          if (next[row.studentId]) {
            next[row.studentId].internalMarks = row.internalMarks || 0;
            next[row.studentId].externalMarks = row.externalMarks || 0;
            next[row.studentId].assignmentMarks = row.assignmentMarks || 0;
          }
        });
        return next;
      });
    } catch {
      // no-op
    }
  };

  useEffect(() => { loadStudents(); }, [filters.batch, filters.department, filters.semester, search, page]);
  useEffect(() => { loadExistingMarks(); }, [students, filters.subject]);

  const updateMarkField = (studentId, field, value) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: Math.max(0, Number(value) || 0)
      }
    }));
  };

  const submitMarks = async () => {
    if (!filters.subject) {
      showToast('error', 'Select subject first');
      return;
    }

    const records = Object.values(marksMap);
    if (!records.length) {
      showToast('error', 'No students to submit');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/marks/add', {
        batch: filters.batch,
        semester: Number(filters.semester),
        subject: filters.subject,
        records
      });
      showToast('success', data.message || 'Marks saved');
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Marks submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    const params = new URLSearchParams({
      batch: filters.batch || '',
      semester: String(filters.semester || ''),
      subject: filters.subject || ''
    });
    window.open(`${API_BASE}/marks/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`rounded-lg px-4 py-2 text-sm ${toast.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Search hall ticket"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        />
        <button className="rounded-lg border border-slate-300 px-3 py-2" onClick={exportCsv}>Export</button>
        <button className="rounded-lg bg-blue-600 text-white px-3 py-2" onClick={submitMarks} disabled={submitting}>{submitting ? 'Saving...' : 'Submit Marks'}</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Hall Ticket</th>
              <th className="px-4 py-3 text-left">Internal</th>
              <th className="px-4 py-3 text-left">External</th>
              <th className="px-4 py-3 text-left">Assignment</th>
              <th className="px-4 py-3 text-left">Total</th>
              <th className="px-4 py-3 text-left">Grade</th>
            </tr>
          </thead>
          <tbody>
            {!loading && students.map((student) => {
              const row = marksMap[student.studentId] || { internalMarks: 0, externalMarks: 0, assignmentMarks: 0 };
              const total = Number(row.internalMarks || 0) + Number(row.externalMarks || 0) + Number(row.assignmentMarks || 0);
              const grade = calcGrade(total);
              return (
                <tr key={student.studentId} className="border-t border-slate-100">
                  <td className="px-4 py-3">{student.fullName}</td>
                  <td className="px-4 py-3 font-mono">{student.hallTicketNumber}</td>
                  <td className="px-4 py-3"><input className="w-20 rounded border px-2 py-1" type="number" min="0" max="40" value={row.internalMarks} onChange={(e) => updateMarkField(student.studentId, 'internalMarks', e.target.value)} /></td>
                  <td className="px-4 py-3"><input className="w-20 rounded border px-2 py-1" type="number" min="0" max="60" value={row.externalMarks} onChange={(e) => updateMarkField(student.studentId, 'externalMarks', e.target.value)} /></td>
                  <td className="px-4 py-3"><input className="w-20 rounded border px-2 py-1" type="number" min="0" max="20" value={row.assignmentMarks} onChange={(e) => updateMarkField(student.studentId, 'assignmentMarks', e.target.value)} /></td>
                  <td className="px-4 py-3 font-semibold">{total}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${gradeBadge(grade)}`}>{grade}</span></td>
                </tr>
              );
            })}
            {loading && <tr><td colSpan="7" className="px-4 py-6 text-center text-slate-500">Loading students...</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-600">Total: {pagination.total || 0}</p>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span className="px-2 py-1">{page} / {pagination.totalPages || 1}</span>
          <button className="rounded border px-3 py-1" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
