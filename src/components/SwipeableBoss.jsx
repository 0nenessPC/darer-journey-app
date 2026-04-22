import { useState, useEffect, useRef } from "react";
import { C, PIXEL_FONT } from "../constants/gameData";

// Shared registry for closing other swiped cards
let activeSwipeId = null;
export function closeAllOtherSwipes(id) {
  activeSwipeId = id;
  window.dispatchEvent(new CustomEvent('darer-swipe-close', { detail: id }));
}

export default function SwipeableBoss({ boss, onBossSelect, onAchieve, onDelete, children }) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const SWIPE_THRESHOLD = 60;
  const MAX_SWIPE = 160; // Width of action buttons
  const containerRef = useRef(null);

  const closeSwipe = () => {
    setSwipeOffset(0);
    setIsOpen(false);
  };

  const handlePointerDown = (e) => {
    if (e.button && e.button !== 0) return; // Only left click / touch
    closeAllOtherSwipes(boss.id);
    startXRef.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    currentXRef.current = 0;
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const dx = x - startXRef.current;
    currentXRef.current = dx;
    // Only allow left swipe (negative dx), ignore right swipe
    if (dx < 0) {
      setSwipeOffset(Math.max(dx, -MAX_SWIPE));
    }
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (currentXRef.current < -SWIPE_THRESHOLD) {
      // Snap open
      setSwipeOffset(-MAX_SWIPE);
      setIsOpen(true);
    } else if (currentXRef.current > SWIPE_THRESHOLD / 2) {
      // Right swipe past threshold → close
      closeSwipe();
    } else {
      // Not enough swipe → close back
      closeSwipe();
    }
  };

  const handleBossClick = () => {
    if (isOpen || isDragging) return;
    onBossSelect(boss);
  };

  const handleAchieve = () => {
    closeSwipe();
    onAchieve(boss);
  };

  const handleDelete = () => {
    closeSwipe();
    onDelete(boss);
  };

  // Close swipe on scroll
  useEffect(() => {
    const handleScroll = () => closeSwipe();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close when another card is swiped open
  useEffect(() => {
    const handler = (e) => {
      if (e.detail !== boss.id) closeSwipe();
    };
    window.addEventListener('darer-swipe-close', handler);
    return () => window.removeEventListener('darer-swipe-close', handler);
  }, [boss.id]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 6,
      }}
    >
      {/* Action buttons (behind the card) */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        display: "flex", width: MAX_SWIPE, zIndex: 0,
      }}>
        <button
          onClick={handleAchieve}
          style={{
            width: MAX_SWIPE / 2, background: C.hpGreen,
            border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 2,
          }}
        >
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontFamily: PIXEL_FONT, fontSize: 8, color: C.cream }}>ACHIEVE</span>
        </button>
        <button
          onClick={handleDelete}
          style={{
            width: MAX_SWIPE / 2, background: C.bossRed,
            border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 2,
          }}
        >
          <span style={{ fontSize: 18 }}>🗑️</span>
          <span style={{ fontFamily: PIXEL_FONT, fontSize: 8, color: C.cream }}>DELETE</span>
        </button>
      </div>

      {/* Card (slides over buttons) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={isDragging ? handlePointerMove : undefined}
        onPointerUp={handlePointerUp}
        onPointerLeave={isDragging ? handlePointerUp : undefined}
        onClick={handleBossClick}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
          position: "relative",
          zIndex: 1,
          width: "100%",
          boxSizing: "border-box",
          background: C.mapBg,
          touchAction: "pan-y", // Allow vertical scroll, prevent horizontal
        }}
      >
        {children}
      </div>
    </div>
  );
}
