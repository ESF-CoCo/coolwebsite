import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// StrictMode is intentionally disabled.
//
// React 18's StrictMode double-invokes effects in development
// (mount → unmount → mount). That is correct for pure React trees, but
// breaks legacy imperative libraries that own DOM nodes and media streams
// outside of React's knowledge. html5-qrcode is one such library:
//
//   - Its scanner.start() awaits getUserMedia(), which cannot be aborted
//     mid-flight. When the StrictMode unmount fires, scanner.stop() runs
//     against a container React has already removed from the DOM, throwing
//     "Node.removeChild: Argument 1 is not an object".
//   - The second mount then re-acquires the camera before the first stream
//     has been released, sometimes yielding a stream with videoWidth === 0.
//
// StrictMode is a development-only lint helper. Removing it does not affect
// production builds.
createRoot(document.getElementById('root')).render(<App />)