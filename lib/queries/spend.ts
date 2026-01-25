import { prisma } from '@/lib/prisma';

export type SpendRow = {
  id: string;
  portal: string;
  month: string;      // "YYYY-MM"
  amount: number;     // normalized to plain number for the UI
};

export async function getSpendRows(): Promise<SpendRow[]> {
  const rows = await prisma.spend.findMany({
    orderBy: [
      { month: 'desc' },
      { portal: 'asc' },
    ],
  });

  return rows.map((r) => ({
    id: r.id,
    portal: r.portal,
    month: r.month,
    amount: Number(r.amount), // Decimal -> number for display
  }));
}