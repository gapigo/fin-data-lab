import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { ChartCard } from '../ChartCard';
import { StatCard } from '../StatCard';
import { trafficData, weeklyData, geoData } from '@/data/mockData';
import {
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  MousePointerClick,
} from 'lucide-react';

export const TrafficView = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Visitantes Totais"
          value="146.700"
          change={18.2}
          icon={<Globe className="w-6 h-6" />}
          colorClass="from-primary to-chart-5"
        />
        <StatCard
          title="Sessões"
          value="191.600"
          change={15.4}
          icon={<MousePointerClick className="w-6 h-6" />}
          colorClass="from-accent to-chart-2"
        />
        <StatCard
          title="Bounce Rate"
          value="38.5%"
          change={-4.2}
          icon={<ArrowDownRight className="w-6 h-6" />}
          colorClass="from-chart-3 to-chart-4"
        />
        <StatCard
          title="Páginas/Sessão"
          value="3.8"
          change={8.9}
          icon={<ArrowUpRight className="w-6 h-6" />}
          colorClass="from-chart-4 to-primary"
        />
      </div>

      <ChartCard
        title="Fontes de Tráfego"
        subtitle="Visitantes e sessões por canal"
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="source"
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
            <Legend />
            <Bar
              dataKey="visitors"
              name="Visitantes"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="sessions"
              name="Sessões"
              fill="hsl(var(--accent))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Performance por Dia"
          subtitle="Page Views e Bounce Rate"
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={weeklyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="day"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="pageViews"
                name="Page Views"
                fill="hsl(var(--chart-2))"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bounceRate"
                name="Bounce Rate %"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tráfego por Região" subtitle="Receita por país">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={geoData}>
              <defs>
                <linearGradient
                  id="colorGeoRevenue"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--chart-3))"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--chart-3))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-3))"
                fillOpacity={1}
                fill="url(#colorGeoRevenue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};
