import { prisma } from '@/lib/prisma';
import { PortalRoiRow } from '@/types/portalRoi';

// format Date -> "YYYY-MM"
function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// first day of month (00:00) / first day of next month (00:00)
function getMonthRange(monthStr: string): { start: Date; end: Date } {
  const [yearStr, monthStr2] = monthStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr2); // 1–12

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0); // next month
  return { start, end };
}

type GetPortalRoiRowsOptions = {
  month?: string; // "YYYY-MM", default = current month
};

export async function getPortalRoiRows(
  options: GetPortalRoiRowsOptions = {}
): Promise<PortalRoiRow[]> {
  const now = new Date();
  const currentMonth = options.month ?? formatMonth(now);

  // also need previous month for trend
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  const prevMonthDate = new Date(year, month - 2, 1); // JS months 0-based
  const prevMonth = formatMonth(prevMonthDate);

  const { start: curStart, end: curEnd } = getMonthRange(currentMonth);
  const { start: prevStart, end: prevEnd } = getMonthRange(prevMonth);

  // --- Leads by portal for current & previous month -------------------------
  const prismaLeadAny = prisma.lead as any;
  const prismaSpendAny = prisma.spend as any;

  const [leadsCur, leadsPrev, spendCur, spendPrev] = await Promise.all([
    prismaLeadAny.groupBy({
      by: ['portal'],
      where: {
        created_at: {
          gte: curStart,
          lt: curEnd,
        },
      },
      _count: { _all: true },
    }),
    prismaLeadAny.groupBy({
      by: ['portal'],
      where: {
        created_at: {
          gte: prevStart,
          lt: prevEnd,
        },
      },
      _count: { _all: true },
    }),
    prismaSpendAny.groupBy({
      by: ['portal'],
      where: {
        month: currentMonth,
      },
      _sum: { amount: true },
    }),
    prismaSpendAny.groupBy({
      by: ['portal'],
      where: {
        month: prevMonth,
      },
      _sum: { amount: true },
    }),
  ]);

  // Build maps for easy lookup
  const leadsCurMap = new Map<string, number>();
  (leadsCur as any[]).forEach((g: any) => {
    leadsCurMap.set(g.portal, g._count?._all ?? 0);
  });

  const leadsPrevMap = new Map<string, number>();
  (leadsPrev as any[]).forEach((g: any) => {
    leadsPrevMap.set(g.portal, g._count?._all ?? 0);
  });

  const spendCurMap = new Map<string, number>();
  (spendCur as any[]).forEach((g: any) => {
    const amount = g._sum?.amount ?? 0;
    spendCurMap.set(g.portal, Number(amount));
  });

  const spendPrevMap = new Map<string, number>();
  (spendPrev as any[]).forEach((g: any) => {
    const amount = g._sum?.amount ?? 0;
    spendPrevMap.set(g.portal, Number(amount));
  });

  // union of portals present in leads or spend this month
  const portals = new Set<string>();
  for (const key of leadsCurMap.keys()) portals.add(key);
  for (const key of spendCurMap.keys()) portals.add(key);

  const rows: PortalRoiRow[] = [];

  portals.forEach((portal) => {
    const spend = spendCurMap.get(portal) ?? 0;
    const leads = leadsCurMap.get(portal) ?? 0;

    const cpl = leads > 0 ? spend / leads : null;

    const prevSpend = spendPrevMap.get(portal) ?? 0;
    const prevLeads = leadsPrevMap.get(portal) ?? 0;
    const prev_cpl =
      prevLeads > 0 && prevSpend > 0 ? prevSpend / prevLeads : null;

    let cpl_change_pct: number | null = null;
    if (cpl != null && prev_cpl != null && prev_cpl > 0) {
      cpl_change_pct = ((cpl - prev_cpl) / prev_cpl) * 100;
    }

    rows.push({
      portal,
      month: currentMonth,
      spend,
      leads,
      cpl,
      prev_cpl,
      cpl_change_pct,
    });
  });

  // sort: highest spend first
  rows.sort((a, b) => b.spend - a.spend);

  return rows;
}