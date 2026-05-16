# FIN-DATA-LAB DESIGN SYSTEM
### Read this before writing any component.

## IDENTITY
Name: Fin·Data·Lab
Tagline: Pesquisa Financeira. Dados Abertos. Sem Filtro.
Aesthetic direction: Editorial Financial — think Financial Times meets Bloomberg Terminal (original amber), not SaaS purple gradient.

## COLOR TOKENS (CSS Variables)

### Light Mode (DEFAULT)
--bg-primary: #FAFAF8
--bg-secondary: #F4F3EF
--bg-elevated: #FFFFFF
--bg-sunken: #EEECEA
--text-primary: #1A1814
--text-secondary: #5C5750
--text-muted: #9C9489
--text-disabled: #C4BFB8
--accent-primary: #C8860A
--accent-hover: #A36D08
--accent-light: #FDF3DC
--accent-border: #E8B85A
--positive: #1A7A4A
--positive-bg: #EBF7F1
--negative: #B83232
--negative-bg: #FAECEC
--neutral: #5C5750
--cvm-color: #1E4A8C
--cvm-light: #EBF0F9
--acoes-color: #1A7A4A
--acoes-light: #EBF7F1
--crypto-color: #7B3FA0
--crypto-light: #F3EBF9
--border-subtle: #E8E5DF
--border-default: #D4CFC8
--border-strong: #A8A39C

### Dark Mode ([data-theme="dark"])
--bg-primary: #13120F
--bg-secondary: #1C1B17
--bg-elevated: #242320
--bg-sunken: #0E0D0B
--text-primary: #F0EDE6
--text-secondary: #B8B3AA
--text-muted: #7A756E
--accent-primary: #E8A020
--accent-light: #2A220A
--border-subtle: #2E2C28
--border-default: #3A3830
--positive: #2DA866
--negative: #D94F4F

## TYPOGRAPHY
--font-display: 'Instrument Serif', 'Playfair Display', Georgia, serif;
--font-ui: 'DM Sans', 'Geist', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

--text-xs: 0.75rem
--text-sm: 0.875rem
--text-base: 1rem
--text-lg: 1.125rem
--text-xl: 1.25rem
--text-2xl: 1.5rem
--text-3xl: 1.875rem
--text-4xl: 2.25rem
--text-5xl: 3rem

## SPACING (4px base)
--space-1: 4px   --space-2: 8px   --space-3: 12px  --space-4: 16px
--space-5: 20px  --space-6: 24px  --space-8: 32px  --space-10: 40px
--space-12: 48px --space-16: 64px --space-20: 80px

## LAYOUT
--sidebar-width: 240px
--sidebar-collapsed: 60px
--header-height: 56px

## TRANSITIONS
--transition-fast: 80ms ease
--transition-base: 150ms ease
--transition-slow: 300ms ease

## RULES — NEVER DO THIS
- Never use Inter, Roboto, or Arial as the primary font
- Never use purple gradients on white backgrounds
- Never use a full-page spinner — always use skeleton loading per section
- Never load all data sequentially — always use Promise.allSettled for parallel fetching
- Never use inline styles — always use CSS variables
- Never use !important
- Never create a modal for something that can be done inline
- Never show raw error objects to the user
- Numbers (PL, cota, rentabilidade) always use font-mono
- Financial deltas always use --positive or --negative color, never neutral gray
- Dates always show relative AND absolute: "há 3 dias · 12/05/2026"

## OBSERVATIONS FROM INSPIRATION REPOS
(External repos could not be downloaded due to environment constraints. The design tokens above are derived directly from the FIN-DATA-LAB Master Plan, which synthesized Financial Times, Bloomberg Terminal amber aesthetic, and editorial financial design patterns.)

Key principles extracted:
1. **Clarity over decoration** — Every pixel must serve data comprehension. No decorative gradients.
2. **Typography as hierarchy** — Display fonts (Instrument Serif) for headers create editorial weight; monospace for data prevents misreading of numbers.
3. **Color as signal, not ornament** — Amber/gold for primary accent references classic financial terminals. Green/red for deltas only.
4. **Density with comfort** — Financial dashboards need information density, but whitespace and consistent rhythm prevent cognitive overload.
5. **Skeleton over spinners** — Progressive disclosure keeps the user oriented. Never block the entire UI for a single data fetch.
