export function getRemainingSeconds(
  expiresAt: string,
  now: number = Date.now(),
): number {
  const expiryTime = new Date(expiresAt).getTime();

  if (!Number.isFinite(expiryTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((expiryTime - now) / 1000));
}
