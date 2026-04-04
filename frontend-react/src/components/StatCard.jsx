import React from 'react';

export default function StatCard({ label, value, hint, tone = 'slate' }) {
  const toneMap = {
    cyan: 'from-cyan-500 to-sky-500',
    amber: 'from-amber-500 to-orange-500',
    emerald: 'from-emerald-500 to-teal-500',
    rose: 'from-rose-500 to-pink-500',
    slate: 'from-slate-600 to-slate-800'
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white/92 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className={`mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r ${toneMap[tone] || toneMap.slate}`} />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}