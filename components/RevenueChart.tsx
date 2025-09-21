'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const data = [
  { month: 'Jan', income: 32000, outcome: 18000 },
  { month: 'Feb', income: 28000, outcome: 22000 },
  { month: 'Mar', income: 36000, outcome: 19000 },
  { month: 'Apr', income: 31000, outcome: 25000 },
  { month: 'May', income: 42000, outcome: 26000 },
  { month: 'Jun', income: 27000, outcome: 23000 },
  { month: 'Jul', income: 24000, outcome: 21000 },
  { month: 'Aug', income: 33000, outcome: 28000 },
];

export default function RevenueChart() {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fillOutcome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D1FF25" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#D1FF25" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#0B0C0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
            itemStyle={{ color: '#fff' }}
          />
          <Area type="monotone" dataKey="income" stroke="#7C5CFF" fill="url(#fillIncome)" strokeWidth={2} />
          <Area type="monotone" dataKey="outcome" stroke="#D1FF25" fill="url(#fillOutcome)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}