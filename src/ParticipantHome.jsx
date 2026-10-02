import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "./api";
import "./home.css";

const menuItems = [
  {
    id: "01",
    label: "SCAN",
    to: "/participant/scan",
    tag: "EARN XP",
    colorClass: "bg-red",
    desc: "Scan participant badges to connect, or scan wall challenges to unlock CS questions for bonus XP.",
  },
  {
    id: "02",
    label: "RANKS",
    to: "/leaderboard",
    tag: "LIVE XP",
    colorClass: "bg-yellow",
    desc: "See the live XP leaderboard and track your position throughout the event.",
  },
  {
    id: "03",
    label: "PROFILE",
    to: "/profile",
    tag: "HACKER ID",
    colorClass: "bg-blue",
    desc: "View your current XP and the activity that earned it.",
  },
  {
    id: "04",
    label: "HUB",
    to: "https://example.com",
    external: true,
    tag: "MAIN PORTAL",
    colorClass: "bg-dark",
    desc: "Return to the main CoCo portal for the event schedule, resources, and competition information.",
  },
];

export default function ParticipantHome({ onLogout }) {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isExternalHover, setIsExternalHover] = useState(false);
  const [isCursorVisible, setIsCursorVisible] = useState(false);
  const cursorRef = useRef(null);
  const cursorSeenRef = useRef(false);
  const posRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const targetRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    const move = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      targetRef.current = { x: e.clientX, y: e.clientY };
      sessionStorage.setItem("cursorX", e.clientX);
      sessionStorage.setItem("cursorY", e.clientY);
      if (!cursorSeenRef.current) {
        cursorSeenRef.current = true;
        posRef.current = { x: e.clientX, y: e.clientY };
        setIsCursorVisible(true);
      }
    };
    const hide = () => setIsCursorVisible(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("blur", hide);
    let frame;
    const render = () => {
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.35;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.35;
      if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0) translate(-50%, -50%)`;
      frame = requestAnimationFrame(render);
    };
    render();
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", hide);
      cancelAnimationFrame(frame);
    };
  }, []);

  const handleLogout = () => {
    // Clear the UI immediately, then let the central logout route clear cookies.
    onLogout?.();
    navigate("/logout", { replace: true });
  };

  const handleNav = (e, item) => {
    if (item.external) return;
    e.preventDefault();
    setIsTransitioning(true);
    setActiveCard(item.id);
    setTimeout(() => navigate(item.to, { state: { returnId: item.id } }), 300);
  };

  return (
    <main className={`dynamic-viewport ${activeCard ? "has-active" : ""} ${isCursorVisible ? "custom-cursor-active" : ""}`}>
      <div className={`tracking-cursor ${isCursorVisible ? "is-visible" : ""}`} ref={cursorRef} aria-hidden="true">
        <div className={`cursor-inner ${isExternalHover ? "expand" : ""}`}>
          <svg className="cursor-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
          </svg>
        </div>
      </div>

      <header className="dynamic-header">
        <div className="header-brand">CoCo 2026 / PLAYER</div>
        <button onClick={handleLogout} className="logout-button">LOG OUT</button>
      </header>

      <nav className={`dynamic-grid ${activeCard ? `active-${activeCard}` : ""} ${isTransitioning ? "is-transitioning" : ""}`}>
        {menuItems.map((item) => {
          const content = (
            <div className="card-content">
              <div className="card-top"><span className="card-id">{item.id}</span><span className="card-tag">[{item.tag}]</span></div>
              <div className="card-bottom">
                <h2 className="card-label">{item.label}</h2>
                <div className="card-desc-wrapper"><div className="card-desc-mask"><p className="card-desc">{item.desc}</p></div></div>
              </div>
            </div>
          );
          const props = {
            className: `dynamic-card card-${item.id} ${item.colorClass}`,
            onClick: (e) => handleNav(e, item),
          };
          if (item.external) {
            props.href = item.to;
            props.target = "_blank";
            props.rel = "noreferrer";
            props.onMouseEnter = () => setIsExternalHover(true);
            props.onMouseLeave = () => setIsExternalHover(false);
          }
          return <a key={item.id} {...props}>{content}</a>;
        })}
      </nav>
    </main>
  );
}
