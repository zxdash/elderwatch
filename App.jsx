
import { useEffect, useState } from "react";

import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { get, ref } from "firebase/database";

import { auth, database } from "./firebase";
import DashboardHome from "./DashboardHome";
import SeniorRecords from "./SeniorRecords";

// LOGIN PAGE
function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-icon">E</div>

        <h1>ElderWatch</h1>
        <p className="subtitle">
          Senior Citizen Record Management System
        </p>

        <h2>Admin Login</h2>
        <p>Sign in to access barangay records.</p>

        <form onSubmit={handleLogin}>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && <p className="error" role="alert">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Log In"}
          </button>
        </form>
      </section>
    </main>
  );
}

// ADMIN LAYOUT - SHARED BY ALL ADMIN PAGES
function AdminLayout({ user, children }) {
  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">E</div>
          <div>
            <strong>ElderWatch</strong>
            <small>Admin Portal</small>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          <NavLink to="/dashboard" end>
            Dashboard
          </NavLink>

          <NavLink to="/records">
            Senior Citizen Records
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          Senior Citizen Record Management System
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <span className="topbar-title">
            ElderWatch Administration
          </span>

          <div className="topbar-account">
            <span className="admin-email">{user.email}</span>

            <button
              type="button"
              className="admin-logout"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}

// ACCESS DENIED PAGE
function NotAuthorized() {
  return (
    <main className="login-page">
      <section className="login-card">
        <h2>Access Denied</h2>
        <p>
          Your account does not have administrator access.
        </p>

        <button onClick={() => signOut(auth)}>
          Log Out
        </button>
      </section>
    </main>
  );
}

// ROUTE PROTECTION
function ProtectedAdmin({ user, isAdmin, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <NotAuthorized />;
  }

  return (
    <AdminLayout user={user}>
      {children}
    </AdminLayout>
  );
}

// MAIN APPLICATION
export default function App() {
  const [session, setSession] = useState({
    loading: true,
    user: null,
    isAdmin: false,
  });

  useEffect(() => {
    let active = true;
    let checkId = 0;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        const currentCheck = ++checkId;

        if (!active) return;

        setSession({
          loading: true,
          user: null,
          isAdmin: false,
        });

        if (!user) {
          setSession({
            loading: false,
            user: null,
            isAdmin: false,
          });
          return;
        }

        try {
          const snapshot = await get(
            ref(database, `admins/${user.uid}`)
          );

          if (active && currentCheck === checkId) {
            setSession({
              loading: false,
              user,
              isAdmin: snapshot.val()?.role === "admin",
            });
          }
        } catch (err) {
          console.error("Admin check failed:", err);

          if (active && currentCheck === checkId) {
            setSession({
              loading: false,
              user,
              isAdmin: false,
            });
          }
        }
      }
    );

    return () => {
      active = false;
      checkId++;
      unsubscribe();
    };
  }, []);

  if (session.loading) {
    return <p className="loading">Loading ElderWatch...</p>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          session.user
            ? <Navigate to="/dashboard" replace />
            : <Login />
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedAdmin
            user={session.user}
            isAdmin={session.isAdmin}
          >
            <DashboardHome />
          </ProtectedAdmin>
        }
      />

      <Route
        path="/records"
        element={
          <ProtectedAdmin
            user={session.user}
            isAdmin={session.isAdmin}
          >
            <SeniorRecords />
          </ProtectedAdmin>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}
