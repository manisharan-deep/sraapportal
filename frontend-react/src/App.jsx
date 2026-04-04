import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import AttendancePage from './pages/AttendancePage';
import MarksPage from './pages/MarksPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

function RoleRedirect() {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  if (role === 'STAFF') return <Navigate to="/teacher" replace />;
  if (role === 'STUDENT') return <Navigate to="/student" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'STUDENT']}><Layout /></ProtectedRoute>}>
        <Route path="/teacher" element={<ProtectedRoute allowedRoles={['STAFF']}><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={['STAFF']}><AttendancePage /></ProtectedRoute>} />
        <Route path="/teacher/marks" element={<ProtectedRoute allowedRoles={['STAFF']}><MarksPage /></ProtectedRoute>} />
        <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}