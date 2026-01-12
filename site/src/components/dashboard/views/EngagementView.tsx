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
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { ChartCard } from '../ChartCard';
import { StatCard } from '../StatCard';
import { funnelData, revenueData } from '@/data/mockData';
import {
  Target,
  MousePointerClick,
  ShoppingCart,
  CreditCard,
} from 'lucide-react';

export const EngagementView = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Taxa de Engajamento"
          value="67.8%"
          change={5.2}
          icon={<Target className="w-6 h-6" />}
          colorClass="from-primary to-chart-5"
        />
        <StatCard
          title="CTR Médio"
          value="4.2%"
          change={12.3}
          icon={<MousePointerClick className="w-6 h-6" />}
          colorClass="from-accent to-chart-2"
        />
        <StatCard
          title="Add to Cart"
          value="23.4%"
          change={-2.1}
          icon={<ShoppingCart className="w-6 h-6" />}
          colorClass="from-chart-3 to-chart-4"
        />
        <StatCard
          title="Conversão Final"
          value="8.2%"
          change={8.5}
          icon={<CreditCard className="w-6 h-6" />}
          colorClass="from-chart-4 to-primary"
        />
      </div>

      <ChartCard title="Funil de Conversão" subtitle="Jornada do usuário">
        <ResponsiveContainer width="100%" height={350}>
          <FunnelChart>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [
                value.toLocaleString(),
                'Usuários',
              ]}
            />
            <Funnel dataKey="value" data={funnelData} isAnimationActive>
              <LabelList
                position="center"
                fill="hsl(var(--foreground))"
                stroke="none"
                dataKey="stage"
                fontSize={14}
              />
              <LabelList
                position="right"
                fill="hsl(var(--muted-foreground))"
                stroke="none"
                dataKey={(entry: { rate: number }) => `${entry.rate}%`}
                fontSize={12}
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Tendência de Engajamento" subtitle="Últimos 12 meses">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient
                  id="colorEngagement"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
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
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorEngagement)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Etapas do Funil" subtitle="Comparativo">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={[0, 100]}
              />
              <YAxis
                dataKey="stage"
                type="category"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="rate"
                fill="hsl(var(--accent))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};
