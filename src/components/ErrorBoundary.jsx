import React from 'react';
import { C, FONT_LINK } from '../constants/gameData';
import { PixelText, PixelBtn } from './shared.jsx';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[DARER ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", background: C.mapBg,
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "32px 24px", textAlign: "center",
        }}>
          <link href={FONT_LINK} rel="stylesheet" />
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <PixelText size={12} color={C.bossRed} style={{ display: "block", marginBottom: 8 }}>
            SOMETHING WENT WRONG
          </PixelText>
          <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 24, lineHeight: 1.8 }}>
            The journey hit an unexpected obstacle.{'\n'}
            Your data is safe — refreshing will resume from your last saved point.
          </PixelText>
          {this.state.error && (
            <div style={{
              marginBottom: 20, padding: 12, background: "#1A1218",
              border: `1px solid ${C.bossRed}40`, borderRadius: 6,
              maxWidth: 400,
            }}>
              <PixelText size={6} color={C.red} style={{ display: "block", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {this.state.error.message}
              </PixelText>
            </div>
          )}
          <PixelBtn onClick={() => window.location.reload()} color={C.gold} textColor={C.charcoal}>
            REFRESH →
          </PixelBtn>
        </div>
      );
    }

    return this.props.children;
  }
}
