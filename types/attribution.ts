export type AttributionRow = {
    id: string;
    created_at: Date;
    portal: string;
    lead_source: string;
  
    listing_id: string;
    listing_title: string;
    listing_portal: string;
    listing_price: number | null;
  };