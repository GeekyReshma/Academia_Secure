import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// View Layouts: Administrative Suite
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCourses from "./pages/AdminCourses";
import AIInsights from "./pages/AIInsights";
import ManageUsers from "./pages/ManageUsers";
import TakeAttendance from "./pages/TakeAttendance";
import CourseInsights from "./pages/CourseInsights";

// View Layouts: Faculty Suite
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherCourses from "./pages/TeacherCourses";
import TeacherAttendance from "./pages/TeacherAttendance";
import TeacherStudents from "./pages/TeacherStudents";

// View Layouts: Student Suite
import StudentDashboard from "./pages/StudentDashboard";
import StudentCourses from "./pages/StudentCourses";

/**
 * Higher-Order Component: ProtectedRoute
 * Purpose: Enforces Authentication Security.
 * Logic: Validates the existence of a session token in LocalStorage before granting access to internal nodes.
 * Fallback: Redirects unauthorized requests to the root Login interface.
 */
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    // Unauthorized access detected: Execute redirection protocol
    return <Navigate to="/" replace />;
  }

  // Identity verified: Proceed to requested component
  return children;
};

function App() {
  return (
    <Router>
      <div className="App bg-[#0f111a] min-h-screen selection:bg-blue-500/30">
        <Routes>
          {/* Public Identity Gateway */}
          <Route path="/" element={<Login />} />

          {/* 🔒 AUTHORIZED SEGMENT: ADMINISTRATIVE CONTROL */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute><AdminCourses /></ProtectedRoute>} />
          <Route path="/admin/courses/:courseId" element={<ProtectedRoute><CourseInsights /></ProtectedRoute>} />
          <Route path="/admin/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
          <Route path="/admin/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
          <Route path="/admin/take-attendance" element={<ProtectedRoute><TakeAttendance /></ProtectedRoute>} />

          {/* 👨‍🏫 AUTHORIZED SEGMENT: FACULTY OPERATIONS */}
          <Route path="/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/courses" element={<ProtectedRoute><TeacherCourses /></ProtectedRoute>} />
          <Route path="/teacher/attendance" element={<ProtectedRoute><TeacherAttendance /></ProtectedRoute>} />
          <Route path="/teacher/students" element={<ProtectedRoute><TeacherStudents /></ProtectedRoute>} />

          {/* 🎓 AUTHORIZED SEGMENT: STUDENT ANALYTICS */}
          <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/courses" element={<ProtectedRoute><StudentCourses /></ProtectedRoute>} />

          {/* Fallback Redirect: Catch-all for undefined route paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;