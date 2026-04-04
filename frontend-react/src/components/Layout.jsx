import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navByRole = {
  STAFF: [
    { to: '/teacher', label: 'Dashboard' },
    { to: '/teacher/attendance', label: 'Attendance' },
    { to: '/teacher/marks', label: 'Marks' }
  ],
  STUDENT: [
    { to: '/student', label: 'Dashboard' }
  ],
  ADMIN: [
    { to: '/admin', label: 'Dashboard' }
  ]
};

export default function Layout() {
  const { user, role, logout } = useAuth();
  const links = navByRole[role] || [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_36%),linear-gradient(180deg,#07111f_0%,#0b1220_38%,#f8fafc_38%,#f8fafc_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-white/10 bg-slate-950/95 px-6 py-6 text-white lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">SRU Portal</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">University Portal</h1>
            <p className="mt-2 text-sm text-slate-300">{user?.fullName || 'User'} · {role}</p>
          </div>

          <nav className="space-y-2">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === `/${role?.toLowerCase()}`}
                className={({ isActive }) => `block rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-cyan-400 text-slate-950 shadow-glow' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={logout}
            className="mt-8 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Sign out
          </button>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}