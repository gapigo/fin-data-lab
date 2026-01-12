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
import { revenueData } from '@/data/mockData';
import { Zap, Brain, Target, Sparkles } from 'lucide-react';

// Simulated prediction data
const predictionData = revenueData.map((item, index) => ({
  ...item,
  predicted: item.revenue * (1 + index * 0.02),
  lower: item.revenue * (0.9 + index * 0.015),
  upper: item.revenue * (1.1 + index * 0.025),
}));

export const PredictionsView = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Confiança"
          value="94.5%"
          change={2.3}
          icon={<Brain className="w-6 h-6" />}
          colorClass="from-primary to-chart-5"
        />
        <StatCard
          title="Precisão"
          value="91.2%"
          change={5.8}
          icon={<Target className="w-6 h-6" />}
          colorClass="from-accent to-chart-2"
        />
        <StatCard
          title="Tendência"
          value="Alta"
          change={12.5}
          icon={<Zap className="w-6 h-6" />}
          colorClass="from-chart-3 to-chart-4"
        />
        <StatCard
          title="Insights"
          value="24"
          change={8}
          icon={<Sparkles className="w-6 h-6" />}
          colorClass="from-chart-4 to-primary"
        />
      </div>

      <ChartCard
        title="Previsão de Receita"
        subtitle="Modelo preditivo com intervalo de confiança"
      >
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={predictionData}>
            <defs>
              <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.2}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
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
                `R$ ${Math.round(value).toLocaleString()}`,
                '',
              ]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="upper"
              name="Limite Superior"
              stroke="transparent"
              fill="url(#colorConfidence)"
            />
            <Area
              type="monotone"
              dataKey="lower"
              name="Limite Inferior"
              stroke="transparent"
              fill="hsl(var(--background))"
            />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Real"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--accent))', r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              name="Previsto"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Previsão de Lucro" subtitle="Próximos 12 meses">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={predictionData}>
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
              <Line
                type="monotone"
                dataKey="profit"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
          <h3 className="font-semibold mb-4">Insights de Previsão</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-sm font-medium text-accent">
                📈 Crescimento Projetado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Receita prevista para crescer 28% no próximo trimestre baseado
                em tendências atuais.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm font-medium text-primary">
                🎯 Meta de Vendas
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                85% de probabilidade de atingir a meta de R$ 1M até dezembro.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/20">
              <p
                className="text-sm font-medium"
                style={{ color: 'hsl(var(--chart-3))' }}
              >
                ⚡ Oportunidade
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Categoria "Eletrônicos" mostra potencial de crescimento de 45%
                com investimento em marketing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
