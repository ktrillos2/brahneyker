// The salon works in Colombia; the server clock is UTC, so "today" must be computed in Bogotá time.
export function todayInBogota() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
}
