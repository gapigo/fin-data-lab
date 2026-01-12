// Revenue data for line/area charts
export const revenueData = [
  { month: 'Jan', revenue: 45000, expenses: 32000, profit: 13000 },
  { month: 'Fev', revenue: 52000, expenses: 35000, profit: 17000 },
  { month: 'Mar', revenue: 48000, expenses: 31000, profit: 17000 },
  { month: 'Abr', revenue: 61000, expenses: 38000, profit: 23000 },
  { month: 'Mai', revenue: 55000, expenses: 36000, profit: 19000 },
  { month: 'Jun', revenue: 67000, expenses: 40000, profit: 27000 },
  { month: 'Jul', revenue: 72000, expenses: 42000, profit: 30000 },
  { month: 'Ago', revenue: 69000, expenses: 41000, profit: 28000 },
  { month: 'Set', revenue: 78000, expenses: 45000, profit: 33000 },
  { month: 'Out', revenue: 82000, expenses: 48000, profit: 34000 },
  { month: 'Nov', revenue: 91000, expenses: 52000, profit: 39000 },
  { month: 'Dez', revenue: 98000, expenses: 55000, profit: 43000 },
];

// Traffic data for bar charts
export const trafficData = [
  { source: 'Orgânico', visitors: 45200, sessions: 62500 },
  { source: 'Direto', visitors: 32100, sessions: 41200 },
  { source: 'Social', visitors: 28400, sessions: 35800 },
  { source: 'Referência', visitors: 18900, sessions: 24100 },
  { source: 'Email', visitors: 12300, sessions: 15600 },
  { source: 'Pago', visitors: 9800, sessions: 12400 },
];

// User demographics for pie charts
export const demographicsData = [
  { name: '18-24', value: 22, color: 'hsl(var(--chart-1))' },
  { name: '25-34', value: 35, color: 'hsl(var(--chart-2))' },
  { name: '35-44', value: 25, color: 'hsl(var(--chart-3))' },
  { name: '45-54', value: 12, color: 'hsl(var(--chart-4))' },
  { name: '55+', value: 6, color: 'hsl(var(--chart-5))' },
];

// Product performance
export const productData = [
  { name: 'Produto A', sales: 4250, revenue: 127500, growth: 12.5 },
  { name: 'Produto B', sales: 3890, revenue: 116700, growth: 8.2 },
  { name: 'Produto C', sales: 3420, revenue: 102600, growth: -2.4 },
  { name: 'Produto D', sales: 2980, revenue: 89400, growth: 15.8 },
  { name: 'Produto E', sales: 2650, revenue: 79500, growth: 5.3 },
];

// Real-time data
export const realtimeData = [
  { time: '00:00', users: 245 },
  { time: '01:00', users: 189 },
  { time: '02:00', users: 132 },
  { time: '03:00', users: 98 },
  { time: '04:00', users: 87 },
  { time: '05:00', users: 112 },
  { time: '06:00', users: 198 },
  { time: '07:00', users: 324 },
  { time: '08:00', users: 567 },
  { time: '09:00', users: 823 },
  { time: '10:00', users: 945 },
  { time: '11:00', users: 1023 },
  { time: '12:00', users: 1156 },
  { time: '13:00', users: 1089 },
  { time: '14:00', users: 1234 },
  { time: '15:00', users: 1345 },
  { time: '16:00', users: 1289 },
  { time: '17:00', users: 1456 },
  { time: '18:00', users: 1678 },
  { time: '19:00', users: 1543 },
  { time: '20:00', users: 1234 },
  { time: '21:00', users: 987 },
  { time: '22:00', users: 678 },
  { time: '23:00', users: 456 },
];

// Conversion funnel
export const funnelData = [
  { stage: 'Visitantes', value: 100000, rate: 100 },
  { stage: 'Visualizações', value: 65000, rate: 65 },
  { stage: 'Adições ao carrinho', value: 23400, rate: 23.4 },
  { stage: 'Checkout iniciado', value: 12500, rate: 12.5 },
  { stage: 'Compras', value: 8200, rate: 8.2 },
];

// Geographic data
export const geoData = [
  { country: 'Brasil', users: 125000, revenue: 2450000 },
  { country: 'Portugal', users: 45000, revenue: 890000 },
  { country: 'EUA', users: 32000, revenue: 720000 },
  { country: 'Argentina', users: 18000, revenue: 340000 },
  { country: 'México', users: 15000, revenue: 280000 },
];

// Weekly performance
export const weeklyData = [
  { day: 'Seg', pageViews: 12500, uniqueVisitors: 8900, bounceRate: 42 },
  { day: 'Ter', pageViews: 14200, uniqueVisitors: 10100, bounceRate: 38 },
  { day: 'Qua', pageViews: 13800, uniqueVisitors: 9800, bounceRate: 40 },
  { day: 'Qui', pageViews: 15600, uniqueVisitors: 11200, bounceRate: 36 },
  { day: 'Sex', pageViews: 16200, uniqueVisitors: 11800, bounceRate: 35 },
  { day: 'Sáb', pageViews: 11200, uniqueVisitors: 7800, bounceRate: 48 },
  { day: 'Dom', pageViews: 9800, uniqueVisitors: 6500, bounceRate: 52 },
];

// Engagement metrics
export const engagementData = [
  { metric: 'Tempo médio', value: '4m 32s', change: 8.5 },
  { metric: 'Páginas/sessão', value: '3.8', change: 12.3 },
  { metric: 'Taxa de retorno', value: '45%', change: -2.1 },
  { metric: 'NPS Score', value: '72', change: 5.0 },
];

// Sales by category
export const salesByCategoryData = [
  { category: 'Eletrônicos', value: 35 },
  { category: 'Moda', value: 25 },
  { category: 'Casa & Jardim', value: 18 },
  { category: 'Esportes', value: 12 },
  { category: 'Outros', value: 10 },
];

// Scatter plot data - correlation between marketing spend and sales
export const correlationData = [
  { spend: 1000, sales: 5200, category: 'A' },
  { spend: 2500, sales: 8900, category: 'A' },
  { spend: 3200, sales: 10500, category: 'B' },
  { spend: 4100, sales: 12800, category: 'B' },
  { spend: 5500, sales: 16200, category: 'A' },
  { spend: 6800, sales: 18900, category: 'C' },
  { spend: 7200, sales: 19500, category: 'B' },
  { spend: 8500, sales: 23100, category: 'C' },
  { spend: 9200, sales: 25800, category: 'A' },
  { spend: 10500, sales: 28400, category: 'C' },
];

// Radar chart data - performance metrics
export const performanceRadarData = [
  { subject: 'Vendas', A: 85, B: 72, fullMark: 100 },
  { subject: 'Marketing', A: 78, B: 85, fullMark: 100 },
  { subject: 'Suporte', A: 92, B: 68, fullMark: 100 },
  { subject: 'Produto', A: 88, B: 79, fullMark: 100 },
  { subject: 'Operações', A: 75, B: 82, fullMark: 100 },
  { subject: 'Financeiro', A: 82, B: 76, fullMark: 100 },
];
