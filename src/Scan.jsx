import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "./api";
import ScannerCamera from "./ScannerCamera";
import StrictModeDisabled from "./StrictModeDisabled";
import "./scan.css";

export default function Scan() {
  const [scan, setScan] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [lunchPortions, setLunchPortions] = useState(0);
  const [isSavingLunch, setIsSavingLunch] = useState(false);
  const [departureMessage, setDepartureMessage] = useState(null);

  const handleDecoded = async (decodedText) => {
    setScan(null);
    setScanError(null);
    setDepartureMessage(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_qr_data: decodedText }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Session expired. Please log in again."
            : typeof data.detail === "string"
              ? data.detail
              : "Scan submission failed.",
        );
      }
      setScan(data);
      setLunchPortions(Number(data.participant?.lunch_portions) || 0);
    } catch (err) {
      setScanError(err instanceof TypeError ? "Unable to reach the server." : err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveLunch = async (nextValue) => {
    if (!scan?.participant?.id) return;
    const value = Math.max(0, Math.min(50, nextValue));
    setIsSavingLunch(true);
    try {
      const response = await apiFetch(`/api/v1/staff/participants/${scan.participant.id}/lunch`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portions: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not save lunch portions.");
      setLunchPortions(data.participant.lunch_portions);
    } catch (err) {
      setScanError(err.message);
    } finally {
      setIsSavingLunch(false);
    }
  };

  const markDeparted = async () => {
    if (!scan?.participant?.id) return;
    try {
      const response = await apiFetch(`/api/v1/staff/participants/${scan.participant.id}/departure`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not mark participant as departed.");
      setDepartureMessage(data.message || "Participant marked as departed.");
      setScan((current) => current ? { ...current, participant: { ...current.participant, departed: true } } : current);
    } catch (err) {
      setScanError(err.message);
    }
  };

  const nextScan = () => {
    setScan(null);
    setScanError(null);
    setDepartureMessage(null);
    setResetToken((value) => value + 1);
  };

  const hasScan = Boolean(scan);

  return (
    <div className="scanner-page staff-scanner-page">
      <header className="scanner-header">
        <Link to="/" className="back-button"><span>&larr;</span> Back</Link>
        <div className="scanner-brand">STAFF <span>/ ATTENDANCE</span></div>
      </header>

      <div className="scanner-layout">
        <div className="scanner-intro">
          <span className="eyebrow">STAFF MODULE // 03</span>
          <h1>SCAN</h1>
          <p className="scanner-copy">
            Sign participants in with their badge, then use the controls beside the result to update lunch portions or mark departure.
          </p>
          <ol className="scan-steps">
            <li><span>01</span> Scan a participant badge.</li>
            <li><span>02</span> Adjust lunch portions after serving.</li>
            <li><span>03</span> Mark the participant departed when they leave.</li>
          </ol>
        </div>

        <div className="scanner-workspace">
          <StrictModeDisabled>
            <ScannerCamera
              onDecoded={handleDecoded}
              resetToken={resetToken}
              onCameraError={setScanError}
            />
          </StrictModeDisabled>

          <div className={`scan-feedback ${hasScan ? "is-success" : scanError ? "is-camera-error" : "is-active"}`}>
            <div className="feedback-mark">{hasScan ? "✓" : scanError ? "!" : "•"}</div>
            <div className="feedback-details">
              <strong>{hasScan ? "PARTICIPANT READY" : scanError ? "SCAN ERROR" : isSubmitting ? "VERIFYING" : "SCANNING ACTIVE"}</strong>
              <p>
                {hasScan
                  ? `${scan.participant.name} · ${scan.status === "already_arrived" ? "already signed in" : "signed in"}`
                  : scanError || (isSubmitting ? "Verifying badge…" : "Awaiting participant badge…")}
              </p>
            </div>
          </div>

          {hasScan && (
            <section className="staff-action-panel" aria-label="Participant actions">
              <div className="staff-participant-meta">
                <span className="staff-action-label">PARTICIPANT</span>
                <strong>{scan.participant.name}</strong>
              </div>

              <div className="lunch-control">
                <div>
                  <span className="staff-action-label">LUNCH PORTIONS</span>
                  <strong className="portion-count">{lunchPortions}</strong>
                </div>
                <div className="portion-buttons">
                  <button type="button" onClick={() => saveLunch(lunchPortions - 1)} disabled={isSavingLunch}>−</button>
                  <button type="button" className="portion-add" onClick={() => saveLunch(lunchPortions + 1)} disabled={isSavingLunch}>+1</button>
                </div>
              </div>

              <button
                type="button"
                className={`staff-depart-button ${scan.participant.departed ? "is-done" : ""}`}
                onClick={markDeparted}
                disabled={scan.participant.departed}
              >
                {scan.participant.departed ? "DEPARTED" : "MARK AS DEPARTED"}
              </button>

              {departureMessage && <p className="action-success">{departureMessage}</p>}

              <button type="button" className="staff-next-button" onClick={nextScan}>
                NEXT SCAN
              </button>
            </section>
          )}

          {scanError && !hasScan && (
            <button type="button" className="scan-reset-button" onClick={nextScan}>TRY AGAIN</button>
          )}
        </div>
      </div>
    </div>
  );
}