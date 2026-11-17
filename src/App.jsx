import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Loading from "./components/Loading";

const MainLayout = React.lazy(() => import("./layouts/MainLayout"));
const AuthLayout  = React.lazy(() => import("./layouts/AuthLayout"));

const Dashboard       = React.lazy(() => import("./pages/main/Dashboard"));
const Manpower        = React.lazy(() => import("./pages/main/Manpower"));
const MeetingSessions = React.lazy(() => import("./pages/main/MeetingSessions"));
const MeetingDetail   = React.lazy(() => import("./pages/main/MeetingDetail"));
const KartuPengemudi  = React.lazy(() => import("./pages/main/KartuPengemudi"));
const PGD             = React.lazy(() => import("./pages/main/PGD"));
const PGDDetail       = React.lazy(() => import("./pages/main/PGDDetail"));
const Users           = React.lazy(() => import("./pages/main/Users"));
const AdminProfile    = React.lazy(() => import("./pages/main/AdminProfile"));
const NotFound        = React.lazy(() => import("./pages/main/NotFound"));

const Login    = React.lazy(() => import("./pages/auth/Login"));
const Register = React.lazy(() => import("./pages/auth/Register"));
const Forgot   = React.lazy(() => import("./pages/auth/Forgot"));

// proteksi rute — semua halaman utama butuh login (satu jenis akun: staff HSE)
function PrivateRoute({ children }) {
  const user = localStorage.getItem("user");
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// khusus admin — staff biasa tidak boleh akses Manajemen User
function AdminRoute({ children }) {
  const raw = localStorage.getItem("user");
  if (!raw) return <Navigate to="/login" replace />;
  const user = JSON.parse(raw);
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>

        <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/manpower"     element={<Manpower />} />
          <Route path="/meetings"     element={<MeetingSessions />} />
          <Route path="/meetings/:id" element={<MeetingDetail />} />
          <Route path="/kp"           element={<KartuPengemudi />} />
          <Route path="/pgd"          element={<PGD />} />
          <Route path="/pgd/:id"      element={<PGDDetail />} />
          <Route path="/assets"       element={<Navigate to="/kp" replace />} />
          <Route path="/profile"      element={<AdminProfile />} />
          <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<AuthLayout />}>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot"   element={<Forgot />} />
        </Route>

      </Routes>
    </Suspense>
  );
}
