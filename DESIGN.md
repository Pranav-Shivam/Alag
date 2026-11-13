# ALAG design system

One theme, three files in `src/styles/`. Everything else uses what they define.

| File | Holds |
|---|---|
| `tokens.css` | Every color, radius, shadow, chart color and the smallest text size. Light and dark values. The only place a color is written. |
| `base.css` | Element defaults, the type scale (`t-*`) and the `surface` and `page` layout utilities. |
| `components.css` | Real-CSS components: loaders, toasts, icon font, sidebar rail. |

## Rules

1. **No raw colors.** Use semantic names: `bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-ok-soft`, `text-chart-1`. Never hex, rgb or Tailwind palette names (`bg-blue-500`). Dark mode comes free from the tokens.
2. **Three radii.** `rounded-chip` (tags, tiny bars), `rounded-control` (buttons, inputs, callouts), `rounded-surface` (cards, panels, drawers). Pills and circles use `rounded-full`. Do not use `rounded-md/lg/xl`.
3. **Two shadows.** `shadow-surface` for resting cards, `shadow-raised` for menus, drawers, toasts.
4. **One type scale.** Use these, not ad hoc `text-* font-*` mixes.

   | Class | Use |
   |---|---|
   | `t-page` | The app header. The page's one `<h1>`. |
   | `t-title` | Title under the header (`<h2>`), usually through `PageHeader`. |
   | `t-section` | Card or panel title. |
   | `t-label` | Sub-heading or group label inside a card. |
   | `t-eyebrow` | Small uppercase caption above a value. |

   Body copy is `text-sm`. Secondary copy is `text-sm text-muted`. Captions are `text-xs text-muted`. Denser than that is `text-2xs`.
5. **Cards are `surface`.** Use `<Card>` or the `surface` class. Do not rebuild `rounded border bg-surface shadow` by hand.
6. **Every page starts the same.** Wrap the page in `className="page"` (same width, left edge and 1.5rem rhythm), and open with `<PageHeader title description />`. Do not add `mx-auto`, `max-w-*` or `space-y-*` on the page root, and do not add `mt-*` to its direct children.
7. **Use the primitives** in `src/components/ui.tsx` (`Button`, `Chip`, `Card`, `Callout`, `Segmented`, `Select`, `TextInput`, `PageHeader`) before writing a new control.
8. **Status is never color alone.** Pair a tone with an icon and a word.
9. **Charts** use `text-chart-1` to `text-chart-5`, in that order.

## Brand icons

`src/data/brandIcons.ts` is generated from the Iconify "logos" set and simple-icons. Do not edit it by hand. Products with no available mark get an initials badge in theme colors from `BrandIcon`, so a placeholder never looks like a logo. Brand marks belong to their owners and identify the connected product only.
