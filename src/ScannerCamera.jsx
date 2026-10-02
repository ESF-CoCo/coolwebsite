import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const SCANNER_ELEMENT_ID = "qr-reader";

const SCANNER_CONFIG = {
  fps: 15,
  qrbox: (viewfinderWidth, viewfinderHeight) => {
    return {
      width: Math.max(150, Math.floor(viewfinderWidth * 0.85)),
      height: Math.max(150, Math.floor(viewfinderHeight * 0.85)),
    };
  },
  videoConstraints: {
    frameRate: { ideal: 30 },
  },
};

const SCANNER_OPTIONS = {
  formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
  useBarCodeDetectorIfSupported: true,
  verbose: false,
};

function isAttached(node) {
  if (!node) return false;
  return document.body.contains(node);
}

function createScannerContainer() {
  const el = document.createElement("div");
  el.id = SCANNER_ELEMENT_ID;
  el.className = "qr-reader";
  return el;
}

export default function ScannerCamera({ onDecoded, resetToken = 0, onCameraError }) {
  const hostRef = useRef(null);
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const stateRef = useRef("IDLE");
  const pendingTeardownRef = useRef(false);
  const queueRef = useRef(Promise.resolve());
  const mountedRef = useRef(false);
  const handlingRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(4 / 3);

  const enqueue = useCallback((task) => {
    queueRef.current = queueRef.current.then(task).catch((err) => {
      console.debug("Scanner operation failed:", err);
    });
    return queueRef.current;
  }, []);

  const teardownScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    const container = containerRef.current;
    scannerRef.current = null;
    stateRef.current = "IDLE";

    if (!scanner) return;

    if (!isAttached(container)) {
      if (mountedRef.current) setIsScanning(false);
      return;
    }

    try {
      await scanner.stop();
    } catch (err) {
      console.debug("Scanner stop warning:", err);
    }

    try {
      await scanner.clear();
    } catch (err) {
      console.debug("Scanner clear warning:", err);
    }

    if (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }

    if (mountedRef.current) setIsScanning(false);
  }, []);

  const stopScanner = useCallback(() => enqueue(teardownScanner), [enqueue, teardownScanner]);

  const handleQrDecoded = useCallback(
    async (decodedText) => {
      if (handlingRef.current) return;
      handlingRef.current = true;
      await stopScanner();
      if (mountedRef.current) onDecoded(decodedText);
    },
    [onDecoded, stopScanner],
  );

  const startTask = useCallback(async () => {
    if (!mountedRef.current || !containerRef.current) return;

    await teardownScanner();
    if (!mountedRef.current || !containerRef.current) return;

    handlingRef.current = false;
    pendingTeardownRef.current = false;
    stateRef.current = "STARTING";

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, SCANNER_OPTIONS);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        SCANNER_CONFIG.videoConstraints,
        SCANNER_CONFIG,
        handleQrDecoded,
        () => {},
      );

      requestAnimationFrame(() => {
        const video = containerRef.current?.querySelector("video");
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          const ratio = video.videoWidth / video.videoHeight;
          if (mountedRef.current && Number.isFinite(ratio) && ratio > 0) {
            setAspectRatio(ratio);
          }
        }
      });

      if (
        pendingTeardownRef.current ||
        !mountedRef.current ||
        !isAttached(containerRef.current)
      ) {
        pendingTeardownRef.current = false;
        stateRef.current = "RUNNING";
        await teardownScanner();
        return;
      }

      stateRef.current = "RUNNING";
      if (mountedRef.current) setIsScanning(true);
    } catch (err) {
      console.warn("Camera start failed:", err);
      scannerRef.current = null;
      stateRef.current = "IDLE";
      if (mountedRef.current) {
        setIsScanning(false);
        onCameraError?.("Unable to access camera or camera permission denied.");
      }
    }
  }, [handleQrDecoded, onCameraError, teardownScanner]);

  const startScanner = useCallback(() => enqueue(startTask), [enqueue, startTask]);
  const restartScanner = useCallback(() => enqueue(startTask), [enqueue, startTask]);

  useEffect(() => {
    mountedRef.current = true;

    const host = hostRef.current;
    if (!host) return;

    const container = createScannerContainer();
    host.appendChild(container);
    containerRef.current = container;

    startScanner();

    return () => {
      mountedRef.current = false;

      if (stateRef.current === "STARTING") {
        pendingTeardownRef.current = true;
      } else {
        enqueue(teardownScanner);
      }

      const hostNode = hostRef.current;
      const containerNode = containerRef.current;
      containerRef.current = null;
      if (hostNode && containerNode && containerNode.parentNode === hostNode) {
        hostNode.removeChild(containerNode);
      }
    };
  }, [enqueue, startScanner, teardownScanner]);

  const initialResetRef = useRef(resetToken);
  useEffect(() => {
    if (resetToken === initialResetRef.current) return;
    initialResetRef.current = resetToken;
    restartScanner();
  }, [resetToken, restartScanner]);

  return (
    <div
      className="camera-shell"
      style={{ "--camera-aspect-ratio": String(aspectRatio) }}
    >
      <div ref={hostRef} className="qr-reader-host">
        <div className="camera-corners" aria-hidden="true">
          <b />
          <b />
          <b />
          <b />
        </div>
        {isScanning && <div className="scan-line" aria-hidden="true" />}
      </div>
    </div>
  );
}