'use client';

import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Tooltip,
} from 'recharts';

const data = [
  { name: 'Daily payments', value: 55, fill: 'var(--brand-lime)' },
  { name: 'Leads from ads', value: 20, fill: 'var(--brand-primary)' },
];

export default function ActivityDonut() {
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          startAngle={180}
          endAngle={0}
          innerRadius="60%"
          outerRadius="100%"
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background cornerRadius={12} />
          <Tooltip
            wrapperStyle={{ outline: 'none' }}
            contentStyle={{
              background: 'rgba(0,0,0,.6)',
              border: '1px solid rgba(255,255,255,.08)',
              color: 'white',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number, n: string) => [`${v}%`, n]}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--brand-lime)' }} />
          Daily payments&nbsp;55%
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--brand-primary)' }} />
          Leads from ads&nbsp;20%
        </div>
      </div>
    </div>
  );
}