import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import ExamPage from './pages/ExamPage';
import MyResults from './pages/MyResults';
import AdminDashboard from './pages/AdminDashboard';
import ManageExams from './pages/ManageExams';
import ManageQuestions from './pages/ManageQuestions';
import ManageUsers from './pages/ManageUsers';
import ViewResults from './pages/ViewResults';

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin' || user.role === 'teacher') return <Navigate to="/admin" />;
  return <Navigate to="/dashboard" />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="d-flex flex-column min-vh-100">
            <Navbar />
            <main className="flex-grow-1">
              <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Student Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute roles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/exam/:examId" element={
                  <ProtectedRoute roles={['student']}>
                    <ExamPage />
                  </ProtectedRoute>
                } />
                <Route path="/my-results" element={
                  <ProtectedRoute roles={['student']}>
                    <MyResults />
                  </ProtectedRoute>
                } />

                {/* Admin/Teacher Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/exams" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <ManageExams />
                  </ProtectedRoute>
                } />
                <Route path="/admin/questions/:examId" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <ManageQuestions />
                  </ProtectedRoute>
                } />
                <Route path="/admin/results" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <ViewResults />
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute roles={['admin']}>
                    <ManageUsers />
                  </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
