export const HEALTH = {
  // Simple health (no comps)
  simpleWeights: { leadVelocity: 0.6, recency: 0.4 },

  // Targets & windows
  weekStrongLeadTarget: 5,   // leads/week considered “strong”
  recencyWindowDays: 14,     // score fades to 0 after 14 days without a lead

  // Underperformance rule
  underperformingThreshold: 40,
} as const;

export type HealthConfig = typeof HEALTH;
