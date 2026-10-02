import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "./api";
import "./scan.css";
import "./leaderboard.css";

function normalizeLeaderboard(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.leaderboard ?? payload?.entries ?? [];
  return rows.map((row, index) => ({
    id: row.id ?? `${index}`,
    rank: Number(row.rank ?? index + 1),
    name: row.preferred_name ?? row.name ?? row.username ?? "Unknown",
    xp: Number(row.xp ?? row.total_xp ?? 0),
  }));
}

export default function Leaderboard({ user }) {
  const navigate = useNavigate();
  const cursorRef = useRef(null);
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const mountTimer = setTimeout(() => setIsMounted(true), 50);
    const move = (e) => {
      sessionStorage.setItem("cursorX", e.clientX);
      sessionStorage.setItem("cursorY", e.clientY);
      if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    };
    window.addEventListener("mousemove", move);
    return () => {
      clearTimeout(mountTimer);
      window.removeEventListener("mousemove", move);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await apiFetch("/api/v1/leaderboard");
        if (!response.ok) throw new Error(response.status === 401 ? "Session expired. Please log in again." : "Could not load the leaderboard.");
        const rows = normalizeLeaderboard(await response.json());
        if (!cancelled) {
          setEntries(rows);
          setStatus("ready");
          setLastUpdated(new Date());
          setErrorMessage(null);
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(err instanceof TypeError ? "Could not reach the server." : err.message);
      }
    };
    load();
    const interval = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const homePath = user?.role === "student" ? "/participant" : "/";
  const handleBack = (e) => {
    e.preventDefault();
    navigate(homePath, { state: { returnId: "03" } });
  };

  return (
    <main className="scan-viewport leaderboard-viewport">
      <div className="tracking-cursor" ref={cursorRef}><div className="cursor-inner"><svg className="cursor-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg></div></div>
      <div className={`scan-content leaderboard-content ${isMounted ? "is-mounted" : ""}`}>
        <header className="scan-minimal-header leaderboard-header">
          <a href={homePath} onClick={handleBack} className="back-link" aria-label="Go Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg></a>
        </header>
        <div className="leaderboard-shell">
          <div className="leaderboard-card">
            <div className="leaderboard-title-wrap">
              <div className="leaderboard-label">LIVE XP // 3 SEC</div>
              <h1 className="leaderboard-title">LEADERBOARD</h1>
              {lastUpdated && <small className="leaderboard-updated">UPDATED {lastUpdated.toLocaleTimeString()}</small>}
            </div>
            <div className="leaderboard-list">
              {status === "loading" && <div className="leaderboard-status">Loading rankings...</div>}
              {status === "error" && <div className="leaderboard-status" role="alert">{errorMessage}</div>}
              {status === "ready" && entries.length === 0 && <div className="leaderboard-status">No rankings yet.</div>}
              {status === "ready" && entries.map((entry) => (
                <div className={`leaderboard-row ${entry.rank === 1 ? "top" : ""}`} key={entry.id}>
                  <div className="leaderboard-rank">#{entry.rank}</div>
                  <div className="leaderboard-user"><span className="leaderboard-name">{entry.name}</span></div>
                  <div className="leaderboard-xp">{entry.xp} XP</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
