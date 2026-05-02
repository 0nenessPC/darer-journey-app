import React from 'react';
import { C } from '../constants/gameData';

/**
 * Shared modal overlay + content wrapper.
 *
 * @param {object} props
 * @param {boolean} props.open - controls visibility
 * @param {() => void} props.onClose - called on backdrop click and X button
 * @param {"center"|"bottom"} props.variant - centered dialog or bottom sheet
 * @param {string} [props.title] - optional header text (renders X button when present)
 * @param {number} [props.maxWidth] - default 480
 * @param {number} [props.zIndex] - default 100
 * @param {boolean} [props.backdropClose] - click outside to close, default true
 * @param {string} [props.borderColor] - default C.teal (bottom) or C.mutedBorder (center)
 * @param {React.ReactNode} props.children
 */
export default function Modal({
  open, onClose, variant = 'center', title,
  maxWidth = 480, zIndex = 100, backdropClose = true,
  borderColor, children,
}) {
  if (!open) return null;

  const isBottom = variant === 'bottom';
  const bc = borderColor || (isBottom ? C.teal : C.mutedBorder);

  return (
    <div
      onClick={backdropClose ? onClose : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: C.overlay,
        display: 'flex',
        alignItems: isBottom ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isBottom ? 0 : 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth,
          background: C.cardBg,
          borderRadius: isBottom ? '12px 12px 0 0' : 8,
          border: isBottom
            ? `3px solid ${bc}`
            : `2px solid ${bc}`,
          borderTop: isBottom ? `3px solid ${bc}` : undefined,
          padding: isBottom ? '24px 20px 32px' : 20,
        }}
      >
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <span style={{
              fontSize: 12, fontWeight: 'bold', color: C.cream,
              fontFamily: "'Press Start 2P', monospace",
            }}>{title}</span>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: C.grayLt, fontSize: 18, padding: '4px 8px',
                }}
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
