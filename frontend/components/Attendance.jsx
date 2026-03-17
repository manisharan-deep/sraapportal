import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE = `${window.location.origin}/api`;

const toastStyle = {
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  error: 'bg-rose-50 text-rose-700 border border-rose-200'
};

export default function Attendance({ filters }) {
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 25 });
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [percentages, setPercentages] = useState([]);

  const token = localStorage.getItem('accessToken');
  const api = useMemo(() => axios.create({
    baseURL: API_BASE,
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  }), [token]);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(window.__staffToastTimer);
    window.__staffToastTimer = window.setTimeout(() => setToast(null), 3000);
  };

  const loadStudents = async () => {
    if (!filters.batch || !filters.department || !filters.semester) return;
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/students', {
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

      const map = {};
      (data.students || []).forEach((student) => {
        map[student.studentId] = {
          studentId: student.studentId,
          hallTicketNumber: student.hallTicketNumber,
          name: student.fullName,
          status: 'Present'
        };
      });
      setAttendanceMap(map);
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAttendance = async () => {
    if (!filters.batch || !filters.department || !filters.semester || !filters.subject || !date) return;
    try {
      const { data } = await api.get('/attendance', {
        params: {
          batch: filters.batch,
          department: filters.department,
          semester: filters.semester,
          subject: filters.subject,
          date,
          page: 1,
          limit: 500
        }
      });

      if (!data.attendance) return;
      setAttendanceMap((prev) => {
        const next = { ...prev };
        data.attendance.forEach((row) => {
          if (next[row.studentId]) next[row.studentId].status = row.status;
        });
        return next;
      });
    } catch {
      // no-op to avoid noisy UX
    }
  };

  const loadPercentages = async () => {
    if (!filters.batch || !filters.department || !filters.semester || !filters.subject) return;
    try {
      const { data } = await api.get('/attendance/percentage', {
        params: {
          batch: filters.batch,
          department: filters.department,
          semester: filters.semester,
          subject: filters.subject
        }
      });
      setPercentages(data.percentages || []);
    } catch {
      setPercentages([]);
    }
  };

  useEffect(() => { loadStudents(); }, [filters.batch, filters.department, filters.semester, search, page]);
  useEffect(() => { loadExistingAttendance(); }, [students, filters.subject, date]);
  useEffect(() => { loadPercentages(); }, [filters.batch, filters.department, filters.semester, filters.subject]);

  const markAllPresent = () => {
    setAttendanceMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => { next[key].status = 'Present'; });
      return next;
    });
  };

  const submitBulk = async () => {
    if (!filters.subject) {
      showToast('error', 'Select subject first');
      return;
    }

    const records = Object.values(attendanceMap);
    if (!records.length) {
      showToast('error', 'No students to submit');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/attendance/mark-bulk', {
        academicYear: filters.academicYear,
        batch: filters.batch,
        department: filters.department,
        semester: Number(filters.semester),
        subject: filters.subject,
        date,
        records
      });
      showToast('success', data.message || 'Attendance saved');
      loadPercentages();
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Attendance submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    const params = new URLSearchParams({
      batch: filters.batch || '',
      department: filters.department || '',
      semester: String(filters.semester || ''),
      subject: filters.subject || '',
      date
    });
    window.open(`${API_BASE}/attendance/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {toast && <div className={`rounded-lg px-4 py-2 text-sm ${toastStyle[toast.type]}`}>{toast.message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="date"
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Search hall ticket"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        />
        <button className="rounded-lg border border-emerald-300 px-3 py-2 text-emerald-700" onClick={markAllPresent}>Mark All Present</button>
        <div className="flex gap-2">
          <button className="flex-1 rounded-lg bg-blue-600 text-white px-3 py-2" onClick={submitBulk} disabled={submitting}>{submitting ? 'Saving...' : 'Submit Attendance'}</button>
          <button className="rounded-lg border border-slate-300 px-3 py-2" onClick={exportCsv}>Export</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Hall Ticket</th>
              <th className="px-4 py-3 text-left">Section</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && students.map((student) => (
              <tr key={student.studentId} className="border-t border-slate-100">
                <td className="px-4 py-3">{student.fullName}</td>
                <td className="px-4 py-3 font-mono">{student.hallTicketNumber}</td>
                <td className="px-4 py-3">{student.section || '-'}</td>
                <td className="px-4 py-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(attendanceMap[student.studentId]?.status || 'Absent') === 'Present'}
                      onChange={(e) => {
                        setAttendanceMap((prev) => ({
                          ...prev,
                          [student.studentId]: {
                            ...prev[student.studentId],
                            status: e.target.checked ? 'Present' : 'Absent'
                          }
                        }));
                      }}
                    />
                    <span>{attendanceMap[student.studentId]?.status || 'Absent'}</span>
                  </label>
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-500">Loading students...</td></tr>}
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

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-800 mb-2">Attendance Percentage</h3>
        <div className="space-y-1 text-sm text-slate-700 max-h-52 overflow-auto">
          {!percentages.length && <p className="text-slate-500">No percentage data yet for selected filter.</p>}
          {percentages.map((p) => (
            <p key={String(p.studentId)}>{p.hallTicketNumber} - {p.name}: {p.percentage}% ({p.presentCount}/{p.totalClasses})</p>
          ))}
        </div>
      </div>
    </div>
  );
}
