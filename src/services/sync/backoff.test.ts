import { nextDelayMs, shouldGiveUp } from '@/services/sync/backoff';
test('backoff exponentiel croissant', () => { expect(nextDelayMs(1)).toBeLessThan(nextDelayMs(3)); });
test('abandon après max', () => { expect(shouldGiveUp(5,5)).toBe(true); expect(shouldGiveUp(2,5)).toBe(false); });
