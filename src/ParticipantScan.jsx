import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "./api";
import ScannerCamera from "./ScannerCamera";
import StrictModeDisabled from "./StrictModeDisabled";
import "./scan.css";

export default function ParticipantScan() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [answering, setAnswering] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  const handleDecoded = async (decodedText) => {
    setResult(null);
    setQuestion(null);
    setSelected(null);
    setError(null);

    try {
      const response = await apiFetch("/api/v1/participant/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_qr_data: decodedText }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Scan could not be processed.");

      if (data.type === "challenge") {
        setQuestion(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof TypeError ? "Unable to reach the server." : err.message);
    }
  };

  const submitAnswer = async () => {
    if (!question || selected === null || answering) return;
    setAnswering(true);
    try {
      const response = await apiFetch("/api/v1/participant/challenge/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: question.challenge_id, answer_index: selected }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not submit answer.");
      setResult(data);
      setQuestion(null);
    } catch (err) {
      setError(err instanceof TypeError ? "Unable to reach the server." : err.message);
    } finally {
      setAnswering(false);
    }
  };

  const nextScan = () => {
    setResult(null);
    setQuestion(null);
    setSelected(null);
    setError(null);
    setResetToken((value) => value + 1);
  };

  const questionActive = Boolean(question);
  const resultActive = Boolean(result);

  return (
    <div className="scanner-page participant-scanner-page">
      <header className="scanner-header">
        <Link to="/participant" className="back-button"><span>&larr;</span> Back</Link>
        <div className="scanner-brand">PLAYER <span>/ XP SCANNER</span></div>
      </header>

      <div className="scanner-layout">
        <div className="scanner-intro">
          <span className="eyebrow">PLAYER MODULE // 01</span>
          <h1>SCAN</h1>
          <p className="scanner-copy">
            Scan another participant's badge to connect for +1 XP, or scan a wall challenge QR to unlock a CS question worth more XP.
          </p>
          <ol className="scan-steps">
            <li><span>01</span> Participant badge = +1 XP.</li>
            <li><span>02</span> Wall QR = one random MCQ.</li>
            <li><span>03</span> Answer correctly to claim the challenge XP.</li>
          </ol>
        </div>

        <div className="scanner-workspace">
          <StrictModeDisabled>
            <ScannerCamera
              onDecoded={handleDecoded}
              resetToken={resetToken}
              onCameraError={setError}
            />
          </StrictModeDisabled>

          <div className={`scan-feedback ${questionActive || resultActive ? "is-success" : error ? "is-camera-error" : "is-active"}`}>
            <div className="feedback-mark">{questionActive || resultActive ? "✓" : error ? "!" : "•"}</div>
            <div className="feedback-details">
              <strong>{questionActive ? "CHALLENGE" : resultActive ? "XP UPDATED" : error ? "SCAN ERROR" : "SCANNING ACTIVE"}</strong>
              <p>{questionActive ? "Answer the question below." : result?.message || error || "Scan a participant badge or wall challenge."}</p>
            </div>
          </div>

          {questionActive && (
            <section className="challenge-card">
              <div className="challenge-meta">
                <span className="staff-action-label">CS CHALLENGE</span>
                <strong>+{question.question.points} XP</strong>
              </div>
              <h2>{question.question.text}</h2>
              <div className="challenge-options">
                {question.question.options.map((option, index) => (
                  <button
                    type="button"
                    key={option}
                    className={selected === index ? "selected" : ""}
                    onClick={() => setSelected(index)}
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    {option}
                  </button>
                ))}
              </div>
              <button type="button" className="challenge-submit" onClick={submitAnswer} disabled={selected === null || answering}>
                {answering ? "CHECKING…" : "SUBMIT ANSWER"}
              </button>
            </section>
          )}

          {resultActive && (
            <section className="participant-result-card">
              <strong>{result.correct === false ? "NOT QUITE" : "NICE!"}</strong>
              <div className="participant-result-xp">+{result.xp_awarded ?? 1} XP</div>
              <p>{result.message}</p>
              {result.total_xp !== undefined && <small>{result.total_xp} XP TOTAL</small>}
              <button type="button" className="staff-next-button" onClick={nextScan}>NEXT SCAN</button>
            </section>
          )}

          {error && !questionActive && !resultActive && (
            <button type="button" className="scan-reset-button" onClick={nextScan}>TRY AGAIN</button>
          )}
        </div>
      </div>
    </div>
  );
}