import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "./api";
import "./home.css";

const menuItems = [
  {
    id: "01",
    label: "SCAN",
    to: "/scan",
    tag: "ATTENDANCE",
    colorClass: "bg-red",
    desc: "Scan participant badges to sign people in, then handle departure and lunch portions from the result panel.",
  },
  {
    id: "02",
    label: "PROFILE",
    to: "/profile",
    tag: "HACKER ID",
    colorClass: "bg-blue",
    desc: "Manage your hackathon identity, view your connections, and track your event activity.",
  },
  {
    id: "03",
    label: "RANKS",
    to: "/leaderboard",
    tag: "STANDINGS",
    colorClass: "bg-yellow",
    desc: "Check the real-time social leaderboard and see who is dominating the hackathon network.",
  },
  {
    id: "04",
    label: "HUB",
    to: "https://example.com",
    external: true,
    tag: "MAIN PORTAL",
    colorClass: "bg-dark",
    desc: "Return to the primary hackathon portal for schedules, resources, and competition details.",
  },
];

export default function Home({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const returnId = location.state?.returnId || null;
  const [activeCard, setActiveCard] = useState(returnId);
  const [isTransitioning, setIsTransitioning] = useState(!!returnId);
  const [isExternalHover, setIsExternalHover] = useState(false);
  const [isCursorVisible, setIsCursorVisible] = useState(false);

  const cursorRef = useRef(null);
  const cursorSeenRef = useRef(false);

  const storedX =
    Number(sessionStorage.getItem("cursorX")) || window.innerWidth / 2;
  const storedY =
    Number(sessionStorage.getItem("cursorY")) || window.innerHeight / 2;

  const posRef = useRef({ x: storedX, y: storedY });
  const targetRef = useRef({ x: storedX, y: storedY });

  useEffect(() => {
    if (returnId) {
      const timer1 = setTimeout(() => {
        setActiveCard(null);
      }, 50);

      const timer2 = setTimeout(() => {
        setIsTransitioning(false);
        window.history.replaceState({}, document.title);
      }, 650);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [returnId]);

  useEffect(() => {
    const handlePointerMove = (e) => {
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

    const hideCursor = () => setIsCursorVisible(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("blur", hideCursor);

    let animationFrameId;
    const render = () => {
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.35;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.35;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0) translate(-50%, -50%)`;
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", hideCursor);
      cancelAnimationFrame(animationFrameId);
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
    <main
      className={`dynamic-viewport ${activeCard ? "has-active" : ""} ${isCursorVisible ? "custom-cursor-active" : ""}`}
    >
      <div
        className={`tracking-cursor ${isCursorVisible ? "is-visible" : ""}`}
        ref={cursorRef}
        aria-hidden="true"
      >
        <div className={`cursor-inner ${isExternalHover ? "expand" : ""}`}>
          <svg
            className="cursor-arrow"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </div>
      </div>

      <header className="dynamic-header">
        <div className="header-brand">CoCo 2026</div>
        <button onClick={handleLogout} className="logout-button">
          LOG OUT
        </button>
      </header>

      <nav
        className={`dynamic-grid ${activeCard ? `active-${activeCard}` : ""} ${isTransitioning ? "is-transitioning" : ""}`}
      >
        {menuItems.map((item) => {
          const content = (
            <div className="card-content">
              <div className="card-top">
                <span className="card-id">{item.id}</span>
                <span className="card-tag">[{item.tag}]</span>
              </div>
              <div className="card-bottom">
                <h2 className="card-label">{item.label}</h2>
                <div className="card-desc-wrapper">
                  <div className="card-desc-mask">
                    <p className="card-desc">{item.desc}</p>
                  </div>
                </div>
              </div>
            </div>
          );

          const sharedProps = {
            className: `dynamic-card card-${item.id} ${item.colorClass}`,
            onClick: (e) => handleNav(e, item),
            ...(item.external && {
              onPointerEnter: () => setIsExternalHover(true),
              onPointerLeave: () => setIsExternalHover(false),
            }),
          };

          return item.external ? (
            <a
              key={item.id}
              {...sharedProps}
              href={item.to}
              target="_blank"
              rel="noopener noreferrer"
            >
              {content}
            </a>
          ) : (
            <Link key={item.id} {...sharedProps} to={item.to}>
              {content}
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
