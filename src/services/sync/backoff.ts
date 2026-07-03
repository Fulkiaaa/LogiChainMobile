export const nextDelayMs = (attempts: number) => Math.min(1000 * 2 ** attempts, 60_000);
export const shouldGiveUp = (attempts: number, max: number) => attempts >= max;
