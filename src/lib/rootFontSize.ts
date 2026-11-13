/**
 * The root font size scales with the viewport diagonal, using a 1920x834 viewport as the 16px reference,
 * so every rem value in the UI scales together. Two limits keep it usable on small screens:
 * no scaling below 1024px wide, and the size stays between 15px and 20px so text stays readable.
 */
const BASE = 16;
const MIN = 15;
const MAX = 20;
const DESKTOP_MIN_WIDTH = 1024;
const REF_DIAGONAL = Math.hypot(1920, 834);

function apply() {
  const { clientWidth: w, clientHeight: h } = document.body;
  const scaled = w < DESKTOP_MIN_WIDTH ? BASE : Math.round(BASE * (Math.hypot(w, h) / REF_DIAGONAL));
  document.documentElement.style.fontSize = `${Math.min(MAX, Math.max(MIN, scaled))}px`;
}

export function startRootFontScaling() {
  apply();
  window.addEventListener("resize", apply);
}
