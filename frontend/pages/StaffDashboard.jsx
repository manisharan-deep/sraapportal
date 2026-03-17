import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Attendance from '../components/Attendance';
import Marks from '../components/Marks';

const API_BASE = `${window.location.origin}/api`;

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIML'];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
const batches = ['2022-2026', '2023-2027', '2024-2028', '2025-2029'];
const academicYears = ['2023-24', '2024-25', '2025-26', '2026-27'];

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({
    academicYear: '2025-26',
    semester: 1,
    department: 'AIML',
    batch: '2022-2026',
    subject: ''
  });

  const token = localStorage.getItem('accessToken');
  const api = useMemo(() => axios.create({
    baseURL: API_BASE,
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  }), [token]);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const { data } = await api.get('/subjects', {
          params: { semester: filters.semester, department: filters.department }
        });
        const nextSubjects = data.subjects || [];
        setSubjects(nextSubjects);
        if (!nextSubjects.includes(filters.subject)) {
          setFilters((prev) => ({ ...prev, subject: nextSubjects[0] || '' }));
        }
      } catch {
        setSubjects([]);
      }
    };

    loadSubjects();
  }, [filters.semester, filters.department]);

  const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="bg-slate-900 text-white p-5 space-y-4">
          <h1 className="text-xl font-bold">Staff Portal</h1>
          <button onClick={() => setActiveTab('attendance')} className={`w-full rounded-lg px-3 py-2 text-left ${activeTab === 'attendance' ? 'bg-blue-600' : 'bg-slate-800'}`}>Attendance</button>
          <button onClick={() => setActiveTab('marks')} className={`w-full rounded-lg px-3 py-2 text-left ${activeTab === 'marks' ? 'bg-blue-600' : 'bg-slate-800'}`}>Marks</button>
        </aside>

        <main className="p-4 md:p-6 space-y-4">
          <section className={card}>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Academic Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select className="rounded-lg border border-slate-300 px-3 py-2" value={filters.academicYear} onChange={(e) => setFilters((prev) => ({ ...prev, academicYear: e.target.value }))}>
                {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>

              <select className="rounded-lg border border-slate-300 px-3 py-2" value={filters.semester} onChange={(e) => setFilters((prev) => ({ ...prev, semester: Number(e.target.value) }))}>
                {semesters.map((sem) => <option key={sem} value={sem}>Semester {sem}</option>)}
              </select>

              <select className="rounded-lg border border-slate-300 px-3 py-2" value={filters.department} onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}>
                {departments.map((dep) => <option key={dep} value={dep}>{dep}</option>)}
              </select>

              <select className="rounded-lg border border-slate-300 px-3 py-2" value={filters.batch} onChange={(e) => setFilters((prev) => ({ ...prev, batch: e.target.value }))}>
                {batches.map((batch) => <option key={batch} value={batch}>{batch}</option>)}
              </select>

              <select className="rounded-lg border border-slate-300 px-3 py-2" value={filters.subject} onChange={(e) => setFilters((prev) => ({ ...prev, subject: e.target.value }))}>
                {!subjects.length && <option value="">No subjects</option>}
                {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </div>
          </section>

          <section className={card}>
            {activeTab === 'attendance' && <Attendance filters={filters} />}
            {activeTab === 'marks' && <Marks filters={filters} />}
          </section>
        </main>
      </div>
    </div>
  );
}
