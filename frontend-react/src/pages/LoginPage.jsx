import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field } from '../components/Field';
import { useAuth } from '../context/AuthContext';

const nameRegex = /^[A-Za-z\s.'-]+$/;

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('STUDENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', identifier: '', password: '', confirmPassword: '', enrollmentNumber: '', username: '' });

  const identifierLabel = useMemo(() => (role === 'STUDENT' ? 'Enrollment Number' : 'Username'), [role]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const onSubmitLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login({ role, identifier: form.identifier.trim(), password: form.password });
      navigate(`/${result.user.role.toLowerCase()}`);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitRegister = async (event) => {
    event.preventDefault();
    setError('');

    if (!nameRegex.test(form.fullName.trim())) {
      setError('Full name should contain only alphabets.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role,
        password: form.password
      };

      if (role === 'STUDENT') {
        payload.enrollmentNumber = form.enrollmentNumber.trim();
      } else {
        payload.username = form.username.trim();
      }

      await register(payload);
      setMode('login');
      setError('Registration successful. Please sign in.');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(180deg,#07111f_0%,#0f172a_40%,#f8fafc_40%,#f8fafc_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-[0_30px_120px_rgba(15,23,42,0.22)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between bg-slate-950 px-8 py-10 text-white sm:px-10 lg:px-12">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">SR University</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">Teacher, student, and admin workflows in one portal.</h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Role-based attendance, marks, CGPA, and student views backed by MongoDB and JWT authentication.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['JWT auth', 'Secure login with role control'],
              ['Attendance', 'Batch-wise present/absent tracking'],
              ['Marks', 'Grades and CGPA calculation']
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-cyan-200">{title}</p>
                <p className="mt-2 text-sm text-slate-300">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-50 px-6 py-8 sm:px-10 lg:px-12">
          <div className="mb-8 flex gap-2 rounded-full bg-slate-200 p-1 text-sm font-medium">
            <button type="button" onClick={() => setMode('login')} className={`flex-1 rounded-full px-4 py-2 ${mode === 'login' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}>Sign In</button>
            <button type="button" onClick={() => setMode('register')} className={`flex-1 rounded-full px-4 py-2 ${mode === 'register' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}>Register</button>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-2">
            {['STUDENT', 'STAFF', 'ADMIN'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRole(item)}
                className={`rounded-2xl border px-3 py-2 text-sm font-medium ${role === item ? 'border-cyan-500 bg-cyan-500 text-slate-950' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                {item === 'STAFF' ? 'Teacher' : item.charAt(0) + item.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'login' ? onSubmitLogin : onSubmitRegister} className="space-y-4">
            {error ? <div className={`rounded-2xl border px-4 py-3 text-sm ${error.includes('successful') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{error}</div> : null}

            {mode === 'register' ? (
              <Field label="Full Name">
                <input value={form.fullName} onChange={update('fullName')} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" placeholder="Enter full name" />
              </Field>
            ) : null}

            <Field label="Email Address">
              <input value={form.email} onChange={update('email')} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" placeholder="name@university.edu" />
            </Field>

            {mode === 'login' ? (
              <Field label={identifierLabel}>
                <input value={form.identifier} onChange={update('identifier')} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" placeholder={identifierLabel} />
              </Field>
            ) : role === 'STUDENT' ? (
              <Field label="Enrollment Number">
                <input value={form.enrollmentNumber} onChange={update('enrollmentNumber')} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" placeholder="Enrollment number" />
              </Field>
            ) : (
              <Field label="Username">
                <input value={form.username} onChange={update('username')} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" placeholder="Username" />
              </Field>
            )}

            <Field label="Password">
              <input type="password" value={form.password} onChange={update('password')} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" placeholder="Password" />
            </Field>

            {mode === 'register' ? (
              <Field label="Confirm Password">
                <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" placeholder="Confirm password" />
              </Field>
            ) : null}

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}