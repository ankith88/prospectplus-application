import confetti from 'canvas-confetti';

/**
 * Triggers a brand-themed celebratory confetti explosion
 * Used when a lead is marked as "Won" or "Signed"
 */
export function triggerVictoryConfetti() {
  if (typeof window === 'undefined') return;

  const fire = typeof confetti === 'function' ? confetti : (confetti as any)?.default;
  if (typeof fire !== 'function') return;

  const brandColors = ['#095c7b', '#38bdf8', '#10b981', '#f59e0b', '#0d9488'];

  // Cannon 1 - Left
  fire({
    particleCount: 60,
    angle: 60,
    spread: 55,
    origin: { x: 0.1, y: 0.7 },
    colors: brandColors,
    zIndex: 9999,
  });

  // Cannon 2 - Right
  fire({
    particleCount: 60,
    angle: 120,
    spread: 55,
    origin: { x: 0.9, y: 0.7 },
    colors: brandColors,
    zIndex: 9999,
  });

  // Secondary delayed burst from middle
  setTimeout(() => {
    fire({
      particleCount: 80,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: brandColors,
      zIndex: 9999,
      scalar: 1.2,
    });
  }, 250);
}

export function triggerCelebrationConfetti() {
  triggerVictoryConfetti();
}
