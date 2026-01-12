import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { ChartCard } from '../ChartCard';
import { StatCard } from '../StatCard';
import { revenueData, realtimeData } from '@/data/mockData';
import {
  LineChart as LineChartIcon,
  TrendingUp,
  ArrowUpRight,
  BarChart2,
} from 'lucide-react';

export const TrendsView = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tendência Geral"
          value="Crescimento"
          change={15.8}
          icon={<TrendingUp className="w-6 h-6" />}
          colorClass="from-accent to-chart-2"
        />
        <StatCard
          title="Previsão Q1"
          value="R$ 285k"
          change={12.3}
          icon={<LineChartIcon className="w-6 h-6" />}
          colorClass="from-primary to-chart-5"
        />
        <StatCard
          title="YoY Growth"
          value="+42.5%"
          change={8.2}
          icon={<ArrowUpRight className="w-6 h-6" />}
          colorClass="from-chart-3 to-chart-4"
        />
        <StatCard
          title="Momentum"
          value="Alto"
          change={5.4}
          icon={<BarChart2 className="w-6 h-6" />}
          colorClass="from-chart-4 to-primary"
        />
      </div>

      <ChartCard
        title="Tendência de Crescimento"
        subtitle="Receita, despesas e lucro"
      >
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="colorTrendRev" x1="0" y1="0" x2="0" y2="1">
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
              <linearGradient id="colorTrendExp" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--chart-4))"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--chart-4))"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="colorTrendProf" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--accent))"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--accent))"
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
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorTrendRev)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Despesas"
              stroke="hsl(var(--chart-4))"
              fillOpacity={1}
              fill="url(#colorTrendExp)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="profit"
              name="Lucro"
              stroke="hsl(var(--accent))"
              fillOpacity={1}
              fill="url(#colorTrendProf)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Padrão de Atividade"
        subtitle="Tendência de usuários por hora"
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={realtimeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="users"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
