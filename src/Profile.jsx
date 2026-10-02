import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, apiFetch } from "./api";
import "./home.css";
import "./scan.css";
import "./profile.css";

const XP_GOAL = 2000;

function toProfile(source) {
  return {
    name: source?.preferred_name || source?.username || "Unknown",
    role: source?.role ?? null,
    xp: Number(source?.xp) || 0,
    logs: Array.isArray(source?.logs) ? source.logs : [],
  };
}

function formatLog(entry) {
  const date = entry.created_at ? new Date(entry.created_at) : null;
  return {
    source: String(entry.source || "XP").replaceAll("_", " "),
    points: Number(entry.points ?? entry.amount ?? 0),
    when: date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "",
  };
}

export default function Profile({ user, onLogout }) {
  const navigate = useNavigate();
  const cursorRef = useRef(null);
  const [profile, setProfile] = useState(() => toProfile(user));
  const [loadError, setLoadError] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsMounted(true), 50);
    const move = (e) => {
      if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await apiFetch("/api/v1/auth/me", { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 ? "Session expired. Please log in again." : "Could not load profile.");
        setProfile(toProfile(await response.json()));
        setLoadError(null);
      } catch (err) {
        if (err.name !== "AbortError") setLoadError(err instanceof TypeError ? "Could not reach the server." : err.message);
      }
    })();
    return () => controller.abort();
  }, []);

  const homePath = profile.role?.toLowerCase() === "student" ? "/participant" : "/";
  const handleBack = (e) => { e.preventDefault(); navigate(homePath); };
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      sessionStorage.clear();
      onLogout?.();
      navigate("/login");
    }
  };
  const progress = Math.min((profile.xp / XP_GOAL) * 100, 100);

  return (
    <main className="scan-viewport profile-viewport">
      <div className="tracking-cursor" ref={cursorRef}><div className="cursor-inner"><svg className="cursor-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg></div></div>
      <div className={`scan-content profile-content ${isMounted ? "is-mounted" : ""}`}>
        <header className="scan-minimal-header profile-header"><a href={homePath} onClick={handleBack} className="back-link" aria-label="Go Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg></a></header>
        <div className="profile-card-wrap">
          <div className="profile-card">
            <div className="profile-label">PROFILE</div>
            <h1 className="profile-name">{profile.name}</h1>
            {loadError && <div className="profile-log-empty" role="alert">{loadError}</div>}
            <div className="profile-xp-row"><span className="profile-xp-label">XP</span><strong className="profile-xp-value">{profile.xp}</strong></div>
            <div className="profile-progress" aria-label="XP progress"><div className="profile-progress-bar" style={{ width: `${progress}%` }} /></div>
            <button type="button" className="profile-logout" onClick={handleLogout}>LOG OUT</button>
            <div className="profile-log-panel">
              <div className="profile-log-header">XP LOG</div>
              <div className="profile-log-list">
                {profile.logs.length === 0 ? <div className="profile-log-empty">No XP earned yet.</div> : profile.logs.map((entry, index) => {
                  const log = formatLog(entry);
                  return <div className="profile-log-item" key={`${entry.id ?? index}-${entry.created_at ?? ""}`}><div className="profile-log-main"><span className="profile-log-source">{log.source}</span><small>{log.when}</small></div><strong className="profile-log-points">+{log.points}</strong></div>;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}




