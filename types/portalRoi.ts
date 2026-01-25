export type PortalRoiRow = {
    portal: string;
    month: string; // "YYYY-MM"
    spend: number;
    leads: number;
    cpl: number | null; // cost per lead for this month
    prev_cpl: number | null; // last month CPL
    cpl_change_pct: number | null; // (cpl - prev_cpl) / prev_cpl * 100
  };