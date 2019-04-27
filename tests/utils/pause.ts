export function pause(ms) {
  return new Promise(r => setTimeout(r, ms));
}
