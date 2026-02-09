/**
 * Configuração do menu lateral por visão (view mode)
 * 
 * Três visões disponíveis:
 * - dev: Mostra tudo (visão de desenvolvimento)
 * - financas: Agrupa tudo em "Fundos" (visão finanças gerais)
 * - fundos: Foco em fundos de investimento com melhor organização
 */

import {
    BarChart3,
    LineChart,
    Users2,
    FlaskConical,
    Home,
    Database,
    Wallet,
    TrendingUp,
    Activity,
    Users,
    Globe,
    Target,
    DollarSign,
    ShoppingCart,
    Layers,
    PieChart,
    Zap,
    LucideProps,
    Briefcase,
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

export interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<LucideProps>;
    hidden?: boolean; // Se true, o item está disponível mas oculto nesta visão
}

export interface NavGroup {
    id: string;
    label: string;
    color: string;
    items: NavItem[];
    analyticsOnly?: boolean;
    hidden?: boolean; // Se true, o grupo está disponível mas oculto nesta visão
}

export type ViewMode = 'dev' | 'financas' | 'fundos';

export interface ViewModeConfig {
    id: ViewMode;
    label: string;
    description: string;
    icon: React.ComponentType<LucideProps>;
}

// ============================================================================
// CONFIGURAÇÃO DAS VISÕES
// ============================================================================

export const VIEW_MODES: ViewModeConfig[] = [
    {
        id: 'fundos',
        label: 'Fundos de Investimento',
        description: 'Foco em análise de fundos com navegação otimizada',
        icon: TrendingUp,
    },
    {
        id: 'financas',
        label: 'Finanças Gerais',
        description: 'Todos os ativos agrupados em uma visão consolidada',
        icon: Briefcase,
    },
    {
        id: 'dev',
        label: 'Desenvolvedor',
        description: 'Acesso a todas as funcionalidades e ferramentas',
        icon: FlaskConical,
    },
];

// ============================================================================
// DEFINIÇÃO DOS MENUS POR VISÃO
// ============================================================================

/**
 * Visão DEV - Mostra tudo como está atualmente
 */
const devMenuGroups: NavGroup[] = [
    {
        id: 'home-group',
        label: 'Início',
        color: 'nav-group-1',
        items: [
            { id: 'home', label: 'Início', icon: Home },
        ]
    },
    {
        id: 'funds',
        label: 'Fundos',
        color: 'nav-group-2',
        items: [
            { id: 'fund-summary', label: 'Resumo Fundo', icon: LineChart },
            { id: 'fund-lab', label: 'Lab', icon: FlaskConical },
            { id: 'flagship-peer', label: 'Flagship Peer', icon: Users2 },
        ]
    },
    {
        id: 'allocators',
        label: 'Alocadores',
        color: 'nav-group-3',
        items: [
            { id: 'allocators', label: 'Alocadores', icon: Wallet },
            { id: 'allocators-simplified', label: 'Simplificado', icon: BarChart3 },
        ]
    },
    {
        id: 'utilities',
        label: 'Utilidades',
        color: 'nav-group-4',
        items: [
            { id: 'cache-manager', label: 'Caching', icon: Database },
        ]
    },
];

/**
 * Visão FINANÇAS GERAIS - Tudo agrupado em "Fundos de Investimento"
 * Por enquanto, só inclui a visão simplificado
 */
const financasMenuGroups: NavGroup[] = [
    {
        id: 'home-group',
        label: 'Início',
        color: 'nav-group-1',
        items: [
            { id: 'home', label: 'Início', icon: Home },
        ]
    },
    {
        id: 'fundos-investimento',
        label: 'Fundos de Investimento',
        color: 'nav-group-2',
        items: [
            { id: 'allocators-simplified', label: 'Visão Geral', icon: BarChart3 },
        ]
    },
    // Grupos ocultos (mas funcionalidade ainda disponível por URL/código)
    {
        id: 'funds',
        label: 'Fundos',
        color: 'nav-group-2',
        hidden: true, // Oculto nesta visão
        items: [
            { id: 'fund-summary', label: 'Resumo Fundo', icon: LineChart },
            { id: 'fund-lab', label: 'Lab', icon: FlaskConical },
            { id: 'flagship-peer', label: 'Flagship Peer', icon: Users2 },
        ]
    },
    {
        id: 'allocators',
        label: 'Alocadores',
        color: 'nav-group-3',
        hidden: true,
        items: [
            { id: 'allocators', label: 'Alocadores', icon: Wallet },
        ]
    },
    {
        id: 'utilities',
        label: 'Utilidades',
        color: 'nav-group-4',
        hidden: true,
        items: [
            { id: 'cache-manager', label: 'Caching', icon: Database },
        ]
    },
];

/**
 * Visão FUNDOS DE INVESTIMENTO - Foco em fundos com melhor organização
 * Redistribui peer group e simplificado de forma lógica
 */
const fundosMenuGroups: NavGroup[] = [
    {
        id: 'home-group',
        label: 'Início',
        color: 'nav-group-1',
        items: [
            { id: 'home', label: 'Início', icon: Home },
        ]
    },
    {
        id: 'analise-individual',
        label: 'Análise Individual',
        color: 'nav-group-2',
        items: [
            { id: 'fund-summary', label: 'Resumo', icon: LineChart },
            { id: 'fund-lab', label: 'Laboratório', icon: FlaskConical },
        ]
    },
    {
        id: 'analise-comparativa',
        label: 'Análise Comparativa',
        color: 'nav-group-3',
        items: [
            { id: 'flagship-peer', label: 'Peer Group', icon: Users2 },
            { id: 'allocators-simplified', label: 'Distribuição', icon: BarChart3 },
        ]
    },
    // Grupos ocultos nesta visão
    {
        id: 'allocators',
        label: 'Alocadores',
        color: 'nav-group-4',
        hidden: true,
        items: [
            { id: 'allocators', label: 'Alocadores', icon: Wallet },
        ]
    },
    {
        id: 'utilities',
        label: 'Utilidades',
        color: 'nav-group-4',
        hidden: true,
        items: [
            { id: 'cache-manager', label: 'Caching', icon: Database },
        ]
    },
];

// ============================================================================
// GRUPOS DE ANALYTICS (mantidos para compatibilidade)
// ============================================================================

const analyticsNavGroups: NavGroup[] = [
    {
        id: 'overview',
        label: 'Visão Geral',
        color: 'nav-group-1',
        analyticsOnly: true,
        items: [
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'realtime', label: 'Tempo Real', icon: Activity },
        ],
    },
    {
        id: 'analytics',
        label: 'Analytics',
        color: 'nav-group-2',
        analyticsOnly: true,
        items: [
            { id: 'users', label: 'Usuários', icon: Users },
            { id: 'traffic', label: 'Tráfego', icon: Globe },
            { id: 'engagement', label: 'Engajamento', icon: Target },
        ],
    },
    {
        id: 'business',
        label: 'Negócios',
        color: 'nav-group-3',
        analyticsOnly: true,
        items: [
            { id: 'revenue', label: 'Receita', icon: DollarSign },
            { id: 'sales', label: 'Vendas', icon: ShoppingCart },
            { id: 'products', label: 'Produtos', icon: Layers },
        ],
    },
    {
        id: 'insights',
        label: 'Insights',
        color: 'nav-group-4',
        analyticsOnly: true,
        items: [
            { id: 'trends', label: 'Tendências', icon: LineChart },
            { id: 'distribution', label: 'Distribuição', icon: PieChart },
            { id: 'predictions', label: 'Previsões', icon: Zap },
        ],
    },
];

// ============================================================================
// FUNÇÃO PARA OBTER MENUS POR VISÃO
// ============================================================================

export function getMenuGroupsByViewMode(
    viewMode: ViewMode,
    showAnalytics: boolean = false
): NavGroup[] {
    let groups: NavGroup[];

    switch (viewMode) {
        case 'dev':
            groups = devMenuGroups;
            break;
        case 'financas':
            groups = financasMenuGroups;
            break;
        case 'fundos':
            groups = fundosMenuGroups;
            break;
        default:
            groups = fundosMenuGroups; // Default é fundos
    }

    // Filtrar grupos ocultos
    const visibleGroups = groups.filter(g => !g.hidden);

    // Adicionar analytics se habilitado
    if (showAnalytics) {
        return [...visibleGroups, ...analyticsNavGroups];
    }

    return visibleGroups;
}

// ============================================================================
// CHAVE DO LOCAL STORAGE
// ============================================================================

export const VIEW_MODE_STORAGE_KEY = 'fin_data_lab_view_mode';

// ============================================================================
// HELPERS
// ============================================================================

export function getDefaultViewMode(): ViewMode {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved && ['dev', 'financas', 'fundos'].includes(saved)) {
        return saved as ViewMode;
    }
    return 'fundos'; // Default é a visão de fundos
}

export function saveViewMode(viewMode: ViewMode): void {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
}
