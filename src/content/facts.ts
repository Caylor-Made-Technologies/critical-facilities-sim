/**
 * Small facts about the content (counts and ids) for code that runs on every
 * page: badges, Home stats. Keeps the big content files out of the first
 * download. A unit test (facts.test.ts) fails if any of this drifts from the
 * real content, so update it whenever content is added.
 */
export const FACTS = {
  equipment: 19,
  quiz: 46,
  tips: 220,
  glossaryTerms: ["ATS", "STS", "UPS", "Double conversion", "Static bypass", "Maintenance bypass", "BESS", "SOC", "Ride-through", "Paralleling", "Back-feed", "Main-tie-main", "Kirk key", "SKRU", "PDU / RPP", "Busway", "Dual-corded", "Arc flash", "Incident energy", "EPMS", "Load bank", "Wet stacking", "Chiller", "Head pressure", "Lift", "Approach temperature", "Delta-T", "Wet bulb", "Dew point", "Economizer / free cooling", "CRAH", "CRAC", "CDU", "TCS", "FWS", "DOAS", "Energy recovery wheel", "TES", "Containment", "VFD", "Differential pressure (DP)", "Legionella", "N, N+1, 2N", "Concurrently maintainable", "Fault tolerant", "PUE", "MOP", "SOP", "EOP", "MOC", "LOTOTO", "CAT rating", "Try out", "EEWP", "Restricted approach boundary", "Limited approach boundary", "Fire watch", "Impairment", "Stop-work authority", "ESWC", "AHJ", "Peer check", "Hold point", "Rounds", "RCA"],
  /** Goals per career ladder rung (rung id -> number of "do now" items). */
  ladderGoals: {"r1": 5, "r2": 5, "r3": 5, "r4": 5, "r5": 5, "r6": 5, "r7": 4} as Record<string, number>,
  lotoIds: ["loto-crah", "loto-pump", "loto-ups"],
  huntIds: ["hunt-battery", "hunt-gen", "hunt-gear", "hunt-roof", "hunt-hotwork"],
} as const;
