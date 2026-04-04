import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-8 text-center shadow-glow">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-slate-300">The route you requested does not exist.</p>
        <Link to="/login" className="mt-6 inline-flex rounded-2xl bg-cyan-400 px-4 py-2 font-medium text-slate-950">Return to login</Link>
      </div>
    </div>
  );
}