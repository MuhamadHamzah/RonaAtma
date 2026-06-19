import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth, RequireRole, RedirectIfAuthed } from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import RegisterCounselor from './pages/auth/RegisterCounselor';

import StudentDashboard from './pages/student/Dashboard';
import MoodTracker from './pages/student/MoodTracker';
import Chatbot from './pages/student/Chatbot';
import BullyingReport from './pages/student/BullyingReport';
import SafeSpace from './pages/student/SafeSpace';
import Web3Hub from './pages/student/Web3Hub';

import CounselorOverview from './pages/dashboard/Overview';
import AlertsDashboard from './pages/dashboard/Alerts';
import ReportsDashboard from './pages/dashboard/Reports';
import ForumModeration from './pages/dashboard/ForumModeration';
import Analytics from './pages/dashboard/Analytics';
import AuditTrail from './pages/dashboard/AuditTrail';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Redirect authed users away from auth pages */}
          <Route element={<RedirectIfAuthed />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/counselor" element={<RegisterCounselor />} />
          </Route>

          {/* All authenticated routes */}
          <Route element={<RequireAuth />}>
            {/* Student portal */}
            <Route element={<RequireRole role="student" />}>
              <Route element={<AppLayout />}>
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/student/mood" element={<MoodTracker />} />
                <Route path="/student/chatbot" element={<Chatbot />} />
                <Route path="/student/report" element={<BullyingReport />} />
                <Route path="/student/safespace" element={<SafeSpace />} />
                <Route path="/student/web3" element={<Web3Hub />} />
              </Route>
            </Route>

            {/* Counselor dashboard */}
            <Route element={<RequireRole role="counselor" />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<CounselorOverview />} />
                <Route path="/dashboard/alerts" element={<AlertsDashboard />} />
                <Route path="/dashboard/reports" element={<ReportsDashboard />} />
                <Route path="/dashboard/moderation" element={<ForumModeration />} />
                <Route path="/dashboard/analytics" element={<Analytics />} />
                <Route path="/dashboard/audit" element={<AuditTrail />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

