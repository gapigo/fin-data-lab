import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartCard } from '../ChartCard';
import { StatCard } from '../StatCard';
import { productData } from '@/data/mockData';
import { Package, TrendingUp, Star, Layers } from 'lucide-react';

export const ProductsView = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Produtos Ativos"
          value="1.247"
          change={8.5}
          icon={<Package className="w-6 h-6" />}
          colorClass="from-primary to-chart-5"
        />
        <StatCard
          title="SKUs"
          value="4.892"
          change={12.3}
          icon={<Layers className="w-6 h-6" />}
          colorClass="from-accent to-chart-2"
        />
        <StatCard
          title="Avaliação Média"
          value="4.6"
          change={2.1}
          icon={<Star className="w-6 h-6" />}
          colorClass="from-chart-3 to-chart-4"
        />
        <StatCard
          title="Em Estoque"
          value="89%"
          change={-1.2}
          icon={<TrendingUp className="w-6 h-6" />}
          colorClass="from-chart-4 to-primary"
        />
      </div>

      <ChartCard
        title="Performance de Produtos"
        subtitle="Vendas e receita por produto"
      >
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={productData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
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
              tickFormatter={(v) => `${v / 1000}k`}
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
              dataKey="sales"
              name="Unidades Vendidas"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="revenue"
              name="Receita"
              fill="hsl(var(--accent))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold">Detalhes dos Produtos</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Top 5 produtos por performance
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Produto
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Vendas
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Receita
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Crescimento
                </th>
              </tr>
            </thead>
            <tbody>
              {productData.map((product, index) => (
                <tr
                  key={index}
                  className="border-t border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="p-4 font-medium">{product.name}</td>
                  <td className="p-4 text-right">
                    {product.sales.toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    R$ {product.revenue.toLocaleString()}
                  </td>
                  <td
                    className={`p-4 text-right font-medium ${
                      product.growth > 0 ? 'text-accent' : 'text-destructive'
                    }`}
                  >
                    {product.growth > 0 ? '+' : ''}
                    {product.growth}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
