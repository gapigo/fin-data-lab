import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard } from '../ChartCard';
import { StatCard } from '../StatCard';
import { realtimeData } from '@/data/mockData';
import { Activity, Users, Clock, Wifi } from 'lucide-react';

export const RealtimeView = () => {
  const currentUsers = realtimeData[realtimeData.length - 5].users;
  const peakUsers = Math.max(...realtimeData.map((d) => d.users));

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Usuários Agora"
          value={currentUsers.toLocaleString()}
          change={8.5}
          icon={<Users className="w-6 h-6" />}
          colorClass="from-accent to-chart-2"
        />
        <StatCard
          title="Pico Hoje"
          value={peakUsers.toLocaleString()}
          icon={<Activity className="w-6 h-6" />}
          colorClass="from-primary to-chart-5"
        />
        <StatCard
          title="Tempo Médio"
          value="4m 32s"
          change={12.3}
          icon={<Clock className="w-6 h-6" />}
          colorClass="from-chart-3 to-chart-4"
        />
        <StatCard
          title="Conexões Ativas"
          value="2.847"
          change={-2.1}
          icon={<Wifi className="w-6 h-6" />}
          colorClass="from-chart-4 to-primary"
        />
      </div>

      <ChartCard title="Usuários em Tempo Real" subtitle="Últimas 24 horas">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={realtimeData}>
            <defs>
              <linearGradient id="colorRealtime" x1="0" y1="0" x2="0" y2="1">
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
              stroke="hsl(var(--accent))"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: 'hsl(var(--accent))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
