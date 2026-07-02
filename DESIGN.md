# Design Brief — StrataFi

> Terminal-grade agency analytics CRM. A pitch-black operations console where fluorescent green and electric blue cut through charcoal like indicators on a trading terminal.

## Direction

Terminal-grade agency analytics. High-density information workspace inspired by Bloomberg/Linear hybrids — dark, precise, alive. Data glows; chrome recedes.

## Tone

Authoritative, surgical, calm under pressure. Confident without bravado. Numbers feel inevitable, not decorative.

## Differentiation

Most CRMs are grey SaaS. StrataFi is a terminal: pitch-black canvas, neon-green live indicators, electric-blue data accents, monospace numerics. Density over whitespace; signal over ornament.

## Color Palette

| Token            | OKLCH                | Usage                            |
| ---------------- | -------------------- | -------------------------------- |
| background       | 0.13 0.005 270       | App canvas (#0d0e12)            |
| card             | 0.16 0.006 270       | Surfaces (#12141a)               |
| sidebar          | 0.12 0.005 270       | Sidebar (deepest)                |
| primary (green)  | 0.78 0.19 145        | Live indicators, active (#22c55e)|
| secondary (blue) | 0.65 0.20 250        | Data accents, links              |
| foreground       | 0.95 0.004 270       | Primary text                     |
| muted-foreground | 0.62 0.012 270       | Secondary text, labels           |
| border           | 0.24 0.008 270       | Hairline dividers                |
| destructive      | 0.62 0.23 22         | Errors, loss states              |

## Typography

- Display: Bricolage Grotesque — headings, brand, hero metrics
- Body: DM Sans — UI text, labels, navigation
- Mono: JetBrains Mono — numbers, tables, event stream, IDs

## Elevation & Depth

No drop shadows on cards; depth comes from subtle OKLCH value shifts (background → card → popover) and 1px hairline borders. Glow utilities reserved for live/active states only.

## Structural Zones

| Zone        | Role                                              |
| ----------- | ------------------------------------------------- |
| Sidebar     | StrataFi brand, Front/Back Office toggle, nav     |
| Topbar      | Tenant switcher, search, live status pill         |
| Metric row  | 3 KPI cards with mono numerics + sparklines       |
| Main grid   | Charts, tables, widgets — dense, bordered         |
| Stream rail | Right-side live event feed, stream-fade-in motion|

## Spacing & Rhythm

8px base. Cards 16/24px padding. 12px gaps in grids. Tight line-height for data density; relaxed for prose. Hairline 1px borders everywhere.

## Component Patterns

- Bordered cards, no shadow, 0.625rem radius
- Mono numerics right-aligned in tables/metrics
- Green pill = active/live; blue pill = informational
- Inputs: charcoal fill, green focus ring + glow
- Sidebar nav: active item gets green left-border + glow

## Motion

Restrained. stream-fade-in (420ms cubic-bezier) for new events. pulse-glow on live indicators only. No page transitions, no parallax, no bounce.

## Constraints

- Dark mode only; no light theme
- No Bootstrap blue, no default Tailwind shadows
- OKLCH only — never raw hex or named colors in components
- Real functional views; no placeholder pages
- Sample mock data loads on initial start

## Signature Detail

The live event stream rail: each new event slides in with stream-fade-in, timestamp in JetBrains Mono, green dot for success / blue for info — a terminal feed embedded in the CRM.
