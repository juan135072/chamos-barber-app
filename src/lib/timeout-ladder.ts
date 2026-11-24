/**
 * Limit for a check that may never answer. It grows while the check keeps
 * timing out, so a link that is slow but working eventually gets enough time:
 * 20 s, 40 s, 80 s, then 80 s for every later attempt.
 */
export const TIMEOUT_MIN_MS = 20000
export const TIMEOUT_MAX_MS = 80000

export interface TimeoutLadder {
    /** Limit for the next attempt, in milliseconds. */
    current(): number
    /** The attempt reached its limit: the next one gets twice as long, up to the maximum. */
    timedOut(): void
    /** A definitive answer arrived: the next attempt starts over at the minimum. */
    reset(): void
}

export function createTimeoutLadder(min = TIMEOUT_MIN_MS, max = TIMEOUT_MAX_MS): TimeoutLadder {
    let limit = min
    return {
        current() {
            return limit
        },
        timedOut() {
            limit = Math.min(limit * 2, max)
        },
        reset() {
            limit = min
        },
    }
}
