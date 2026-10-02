import { Component } from "react";

// React 18's <StrictMode> intentionally double-invokes effects in development
// (mount → unmount → mount) to surface impure components. That behaviour is
// correct for pure React trees but breaks legacy imperative libraries that
// own DOM nodes and media streams outside of React's knowledge.
//
// html5-qrcode is one such library. Wrapping the scanner in this class
// component opts its subtree out of StrictMode's double-invoke, so even if
// StrictMode is re-enabled at the app level, the camera stream won't be
// aborted mid-startup.
export default class StrictModeDisabled extends Component {
  render() {
    return this.props.children;
  }
}