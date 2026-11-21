// Relative to the guest's first interaction. The reference starts folding at ~2.2s.
export const OPENING_PHASES = [
  "sealed",
  "folding",
  "welcome",
  "names",
  "portrait",
];
export const OPENING_TIMING = {
  folds: 1900,
  welcome: 2000,
  names: 2100,
  exit: 550,
  gestureCooldown: 850,
};
export function nextOpeningPhase(phase) {
  const index = OPENING_PHASES.indexOf(phase);
  return OPENING_PHASES[
    Math.min(Math.max(index + 1, 1), OPENING_PHASES.length - 1)
  ];
}
export function openingDelay(phase, reducedMotion) {
  if (reducedMotion || phase === "portrait" || phase === "sealed") return null;
  return phase === "folding" ? OPENING_TIMING.folds : OPENING_TIMING[phase];
}
