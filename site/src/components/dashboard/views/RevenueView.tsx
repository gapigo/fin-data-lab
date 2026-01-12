import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Legend,
} from 'recharts';
import { ChartCard } from '../ChartCard';
import { StatCard } from '../StatCard';
import { revenueData, geoData } from '@/data/mockData';
import { DollarSign, TrendingUp, Wallet, PiggyBank } from 'lucide-react';

export const RevenueView = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Receita Total"
          value="R$ 818.000"
          change={23.5}
          icon={<DollarSign className="w-6 h-6" />}
          colorClass="from-chart-3 to-chart-4"
        />
        <StatCard
          title="Lucro Líquido"
          value="R$ 323.000"
          change={18.2}
          icon={<PiggyBank className="w-6 h-6" />}
          colorClass="from-accent to-chart-2"
        />
        <StatCard
          title="Ticket Médio"
          value="R$ 212"
          change={5.8}
          icon={<Wallet className="w-6 h-6" />}
          colorClass="from-primary to-chart-5"
        />
        <StatCard
          title="MRR"
          value="R$ 68.166"
          change={12.4}
          icon={<TrendingUp className="w-6 h-6" />}
          colorClass="from-chart-4 to-primary"
        />
      </div>

      <ChartCard
        title="Receita vs Despesas vs Lucro"
        subtitle="Evolução mensal"
      >
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={revenueData}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--chart-2))"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--chart-2))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(v) => `${v / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [
                `R$ ${value.toLocaleString()}`,
                '',
              ]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Receita"
              stroke="hsl(var(--chart-2))"
              fillOpacity={1}
              fill="url(#colorRev)"
              strokeWidth={2}
            />
            <Bar
              dataKey="expenses"
              name="Despesas"
              fill="hsl(var(--chart-4))"
              radius={[4, 4, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="profit"
              name="Lucro"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Receita por País" subtitle="Top 5 mercados">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={geoData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="country"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [
                  `R$ ${value.toLocaleString()}`,
                  'Receita',
                ]}
              />
              <Bar
                dataKey="revenue"
                fill="hsl(var(--chart-3))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Crescimento do Lucro" subtitle="Margem de lucro">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorProfit2" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--accent))"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--accent))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [
                  `R$ ${value.toLocaleString()}`,
                  'Lucro',
                ]}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="hsl(var(--accent))"
                fillOpacity={1}
                fill="url(#colorProfit2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};
