import { useState } from "react";
import { API_BASE_URL } from "./api";
import "./Login.css";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : data.error || "Authentication failed."
        );
      }

      if (!data.user) {
        throw new Error("Login succeeded but the server did not return a user session.");
      }

      // App.jsx owns navigation. This avoids a race between Login's navigate()
      // and the application's /auth/me session restoration.
      onLoginSuccess?.(data.user);
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        err instanceof TypeError
          ? "Unable to reach the server. Please check that the API is running."
          : err.message || "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <span className="eyebrow">COCO 2026</span>
          <h1>Access Portal</h1>
        </div>

        {error && <div className="login-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">USERNAME OR EMAIL</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">PASSWORD</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "AUTHENTICATING..." : "LOG IN"}
          </button>
        </form>
      </div>
    </div>
  );
}
