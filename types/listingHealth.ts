export type ListingHealthRow = {
    id: string;
    title: string;
    portal: string;
    price: number | null;
    leads_7d: number;
    days_since_listed: number;
    days_since_last_lead: number | null;
    health_score: number;
    flag_underperforming: boolean;
  };