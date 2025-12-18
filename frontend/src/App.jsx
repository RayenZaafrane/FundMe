import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Setup from './pages/Setup';
import FundingStats from './pages/FundingStats';

const getAuthState = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return {
    token,
    user: user ? JSON.parse(user) : null,
  };
};

function AppRoutes() {
  const location = useLocation();
  const [auth, setAuth] = useState(getAuthState());

  useEffect(() => {
    setAuth(getAuthState());
  }, [location.pathname]);

  const isAuthed = !!auth.token;
  const needsSetup = isAuthed && !auth.user?.firstLoginComplete;

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthed ? (needsSetup ? <Navigate to="/setup" replace /> : <Home />) : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/login"
        element={
          isAuthed ? (needsSetup ? <Navigate to="/setup" replace /> : <Navigate to="/" replace />) : <Login />
        }
      />
      <Route
        path="/register"
        element={
          isAuthed ? (needsSetup ? <Navigate to="/setup" replace /> : <Navigate to="/" replace />) : <Register />
        }
      />
      <Route
        path="/setup"
        element={
          isAuthed ? (needsSetup ? <Setup /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/funding-stats"
        element={
          isAuthed ? (needsSetup ? <Navigate to="/setup" replace /> : <FundingStats />) : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
