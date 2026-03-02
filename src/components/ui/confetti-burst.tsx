"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export function ConfettiBurst() {
  useEffect(() => {
    // Fire two bursts from each side for a satisfying effect
    const end = Date.now() + 600;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ["#10b981", "#6366f1", "#f59e0b"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ["#10b981", "#6366f1", "#f59e0b"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return null;
}
