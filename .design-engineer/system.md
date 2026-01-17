# Design System - THAC Admin

**Design Direction**: Precision & Density (Linear/Raycast風)
**Philosophy**: 情報密度を重視し、クリーンで機能的な管理画面UI

---

## Spacing

**Base Unit**: 4px grid

| Token | Value | Usage |
|-------|-------|-------|
| `spacing-1` | 4px | Micro spacing (icons in buttons) |
| `spacing-2` | 8px | Compact spacing (gap-2, p-2) |
| `spacing-3` | 12px | Small spacing (gap-3) |
| `spacing-4` | 16px | **Standard** (gap-4, p-4, most common) |
| `spacing-6` | 24px | Large spacing (section gaps, p-6) |
| `spacing-8` | 32px | Extra large (page margins) |

**Primary**: `spacing-4` (16px) for most gaps and padding
**Secondary**: `spacing-2` (8px) for compact elements

---

## Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 8px | `rounded-lg` - Buttons, inputs, badges |
| `radius-md` | 8px | `rounded-lg` - Cards, dialogs, dropdowns |
| `radius-full` | 9999px | `rounded-full` - Avatars, circular buttons |

**Default**: `radius-sm` (8px) for most interactive elements

---

## Depth Strategy: Borders-Only

**Primary Method**: Borders for all depth and separation

| Element | Style |
|---------|-------|
| Dividers | `border-base-300` |
| Cards | `border border-base-300` |
| Inputs | `border border-base-300` |
| Containers | `border-b border-base-200` |

**Shadows**: Reserved for floating elements only

| Element | Shadow |
|---------|--------|
| Dropdowns | `shadow-lg` |
| Modals | `shadow-xl` |
| Hover states | `shadow-lg` (on interaction only) |

**DO NOT USE**: `shadow-sm` on static cards (use borders instead)

---

## Icons

**Standard Size**: `h-4 w-4` (16px) for all inline icons

| Context | Class | Size |
|---------|-------|------|
| Buttons, Actions | `h-4 w-4` | 16px |
| Navigation | `h-4 w-4` | 16px |
| Table actions | `h-4 w-4` | 16px |
| Error states (large) | `h-16 w-16` | 64px |

**DEPRECATED**: `size-[18px]` - Replace with `h-4 w-4`
**AVOID**: `h-5 w-5` unless specifically needed for emphasis

---

## Typography

### Font Sizes

| Token | Class | Size | Usage |
|-------|-------|------|-------|
| `text-xs` | `text-xs` | 12px | Helper text, timestamps |
| `text-sm` | `text-sm` | 14px | **Body text**, descriptions |
| `text-base` | `text-base` | 16px | Default (rarely explicit) |
| `text-lg` | `text-lg` | 18px | Card titles, dialog titles |
| `text-2xl` | `text-2xl` | 24px | Page headers |

### Font Weights

| Token | Class | Weight | Usage |
|-------|-------|--------|-------|
| `normal` | `font-normal` | 400 | Body text |
| `medium` | `font-medium` | 500 | Labels, active states |
| `semibold` | `font-semibold` | 600 | Table headers |
| `bold` | `font-bold` | 700 | Page titles, dialogs |

### Text Hierarchy (Opacity)

| Level | Class | Usage |
|-------|-------|-------|
| Primary | `text-base-content` | Main text |
| Secondary | `text-base-content/70` | Descriptions, secondary info |
| Tertiary | `text-base-content/50` | Hints, timestamps |

---

## Colors (daisyUI)

### Background

| Token | Class | Usage |
|-------|-------|-------|
| `bg-primary` | `bg-base-100` | Main content area |
| `bg-secondary` | `bg-base-200` | Sidebar, subtle backgrounds |
| `bg-tertiary` | `bg-base-200/30` | Page backdrop |

### Interactive States

| State | Class |
|-------|-------|
| Hover | `hover:bg-base-200` |
| Active | `bg-primary/10 border-l-3 border-primary` |
| Focus | `focus-ring` utility class |

### Focus States

| State | Class |
|-------|-------|
| Default | `focus-ring` |
| Inset | `focus-ring-inset` |

**Utility Classes** (defined in index.css):
- `.focus-ring`: `focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- `.focus-ring-inset`: `focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset`

### Semantic Colors

| Token | Class | Usage |
|-------|-------|-------|
| Primary | `primary` | Primary actions, links |
| Error | `error` | Error states, destructive |
| Success | `success` | Success states |
| Warning | `warning` | Warning states |

---

## Component Patterns

### Button

```tsx
// Primary action
<button className="btn btn-primary gap-1">
  <Icon className="h-4 w-4" />
  Label
</button>

// Secondary action
<button className="btn btn-ghost gap-1">
  <Icon className="h-4 w-4" />
  Label
</button>

// Icon-only
<button className="btn btn-ghost btn-sm btn-square">
  <Icon className="h-4 w-4" />
</button>
```

**Sizes**: `btn-sm` (32px), `btn` (40px), `btn-lg` (48px)

### Card

```tsx
<div className="card border border-base-300 bg-base-100">
  <div className="card-body">
    <h3 className="card-title text-lg font-bold">Title</h3>
    <p className="text-sm text-base-content/70">Description</p>
  </div>
</div>
```

**Hover effect**: `hover:shadow-lg hover:ring-2 hover:ring-primary/10` (optional)

### Input

```tsx
<input
  type="text"
  className="input input-bordered w-full"
  placeholder="Placeholder"
/>
```

### Form Field

```tsx
<div className="form-control">
  <label className="label">
    <span className="label-text font-medium">Label</span>
  </label>
  <input className="input input-bordered" />
  <label className="label">
    <span className="label-text-alt text-error">Error message</span>
  </label>
</div>
```

### Table

```tsx
<table className="table table-zebra">
  <thead>
    <tr>
      <th className="font-semibold">Header</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Content</td>
    </tr>
  </tbody>
</table>
```

### Dialog

```tsx
<dialog className="modal">
  <div className="modal-box">
    <h3 className="font-bold text-lg">Dialog Title</h3>
    <p className="py-4">Content</p>
    <div className="modal-action">
      <button className="btn">Cancel</button>
      <button className="btn btn-primary">Confirm</button>
    </div>
  </div>
</dialog>
```

---

## Anti-Patterns (Avoid)

| Pattern | Issue | Fix |
|---------|-------|-----|
| `size-[18px]` | Non-standard size | Use `h-4 w-4` |
| `shadow-sm` on cards | Unnecessary depth | Use `border border-base-300` |
| `h-5 w-5` for icons | Inconsistent | Use `h-4 w-4` |
| `gap-1` mixed with `gap-4` | Inconsistent spacing | Stick to `gap-2` or `gap-4` |
| Custom colors | Off-brand | Use daisyUI semantic colors |

---

## Audit Checklist

- [ ] All icons are `h-4 w-4` (except large error states)
- [ ] No `size-[18px]` in codebase
- [ ] Cards use `border border-base-300`, not `shadow-sm`
- [ ] Spacing follows 4px grid
- [ ] Text hierarchy uses opacity, not multiple grays
- [ ] Button icons have `gap-1` with text
