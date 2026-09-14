import confetti from 'canvas-confetti';

export function fireMilestoneGlow() {
  // Elegant matte-gold and amber particles instead of loud rainbow confetti
  const goldColors = ['#F59E0B', '#FBBF24', '#D97706', '#FEF3C7', '#10B981'];

  confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.7 },
    colors: goldColors,
    disableForReducedMotion: true,
    ticks: 200,
    gravity: 0.8,
    scalar: 0.9,
  });
}
