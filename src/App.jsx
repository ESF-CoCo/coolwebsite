import { Component, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import "./home.css";
import Home from "./Home";
import ParticipantHome from "./ParticipantHome";
import Scan from "./Scan";
import ParticipantScan from "./ParticipantScan";
import Profile from "./Profile";
import Leaderboard from "./Leaderboard";
import Login from "./Login";
import { API_BASE_URL, apiFetch } from "./api";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("CoCo application error:", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
    window.location.href = "/login";
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 48,
          background: "#444756",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p style={{ opacity: 0.65, letterSpacing: "0.12em", fontSize: 12 }}>
            COCO 2026 / APPLICATION ERROR
          </p>
          <h1 style={{ marginTop: 12 }}>Something went wrong.</h1>
          <pre
            style={{
              marginTop: 24,
              padding: 20,
              background: "rgba(0,0,0,.25)",
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <button type="button" onClick={this.handleReset} style={{ marginTop: 20, padding: "12px 18px" }}>
            RETURN TO LOGIN
          </button>
        </div>
      </main>
    );
  }
}

function LoadingScreen() {
  return <div className="loading-screen">VERIFYING SESSION...</div>;
}

function ProtectedRoute({ user, isLoading, children }) {
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ user, roles, children }) {
  if (!user) return <Navigate to="/login" replace />;
  
  const userRole = user.role?.toLowerCase();
  const allowedRoles = roles.map((r) => r.toLowerCase());

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === "student" ? "/participant" : "/"} replace />;
  }
  return children;
}

function LoginRoute({ user, isLoading, setUser }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      const userRole = user.role?.toLowerCase();
      navigate(userRole === "student" ? "/participant" : "/", { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading) return <LoadingScreen />;
  if (user) return <LoadingScreen />;

  return (
    <Login
      onLoginSuccess={(loggedInUser) => {
        setUser(loggedInUser);
      }}
    />
  );
}

function LogoutRoute({ setUser }) {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function logout() {
      try {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.warn("Logout request failed:", error);
      } finally {
        try {
          sessionStorage.clear();
        } catch {
          // Ignore storage errors.
        }
        if (!cancelled) {
          setUser(null);
          navigate("/login", { replace: true });
        }
      }
    }

    logout();
    return () => {
      cancelled = true;
    };
  }, [navigate, setUser]);

  return <LoadingScreen />;
}

function AppRoutes({ user, setUser, isLoading }) {
  const location = useLocation();

  useEffect(() => {
    console.debug(
      "CoCo route:",
      location.pathname,
      "user:",
      user?.username,
      "role:",
      user?.role,
      "loading:",
      isLoading
    );
  }, [location.pathname, user, isLoading]);

  const handleLogout = () => {
    setUser(null);
  };

  const currentRole = user?.role?.toLowerCase();

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute user={user} isLoading={isLoading} setUser={setUser} />} />
      <Route path="/logout" element={<LogoutRoute setUser={setUser} />} />

      <Route
        path="/"
        element={
          <ProtectedRoute user={user} isLoading={isLoading}>
            <RoleRoute user={user} roles={["admin", "volunteer"]}>
              <Home user={user} onLogout={handleLogout} />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/scan"
        element={
          <ProtectedRoute user={user} isLoading={isLoading}>
            <RoleRoute user={user} roles={["admin", "volunteer"]}>
              <Scan user={user} />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/participant"
        element={
          <ProtectedRoute user={user} isLoading={isLoading}>
            <RoleRoute user={user} roles={["student"]}>
              <ParticipantHome onLogout={handleLogout} />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/participant/scan"
        element={
          <ProtectedRoute user={user} isLoading={isLoading}>
            <RoleRoute user={user} roles={["student"]}>
              <ParticipantScan />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute user={user} isLoading={isLoading}>
            <Profile user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute user={user} isLoading={isLoading}>
            <Leaderboard user={user} />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to={currentRole === "student" ? "/participant" : user ? "/" : "/login"} replace />}
      />
    </Routes>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const response = await apiFetch("/api/v1/auth/me");

        if (!response.ok) {
          if (!cancelled) setUser(null);
          return;
        }

        const data = await response.json();
        if (!cancelled) setUser(data);
      } catch (error) {
        console.error("Unable to restore CoCo session:", error);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AppRoutes user={user} setUser={setUser} isLoading={isLoading} />
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

