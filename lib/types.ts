// lib/types.ts

export type Listing = {
  id: string;
  title: string;
  portal: string;
  location: string;
  price: number | null;       // 👈 nullable
  status: string;
  listed_at: string | null;   // 👈 nullable ISO string
};

export type Lead = {
  id: string;
  listing_id: string;
  portal: string;
  lead_source: string;
  created_at: string;         // ISO string
};

export type Spend = {
  id: string;
  portal: string;
  month: string;              // "YYYY-MM"
  amount: number;
};

// (keep your existing Dashboard, LeadsByPortal, CplByPortal etc.)