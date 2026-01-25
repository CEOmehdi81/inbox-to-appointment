export type ListingHealthInputs = {
    leads7d: number;
    daysSinceListed: number;
    daysSinceLastLead: number | null;
  };
  
  export type ListingHealthOutputs = {
    healthScore: number;         // 0–100
    isUnderperforming: boolean;  // flag_underperforming
  };
  
  export function computeListingHealth(
    { leads7d, daysSinceListed, daysSinceLastLead }: ListingHealthInputs
  ): ListingHealthOutputs {
    const targetLeads7d = 3;
  
    const engagementRaw = (leads7d / targetLeads7d) * 70;
    const engagementScore = clamp(engagementRaw, 0, 70);
  
    let recencyScore = 0;
    if (daysSinceLastLead != null) {
      const maxDays = 21;
      const recencyRaw = ((maxDays - daysSinceLastLead) / maxDays) * 30;
      recencyScore = clamp(recencyRaw, 0, 30);
    }
  
    const healthScore = Math.round(engagementScore + recencyScore);
  
    const isUnderperforming = daysSinceListed >= 7 && healthScore < 40;
  
    return { healthScore, isUnderperforming };
  }
  
  function clamp(v: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, v));
  }