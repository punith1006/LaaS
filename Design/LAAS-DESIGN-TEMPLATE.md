# Lambda.ai Design System Template

## Design Style: "Utilitarian Minimalism" (Dev-Tool Aesthetic)

This document provides comprehensive styling guidelines for reproducing Lambda.ai's visual aesthetics in any web application. Use this as a reference when building UI components.

---

## 1. FONTS

### Primary Font Families
```
font-family: "Suisse Intl", ui-sans-serif, system-ui, sans-serif;
font-family: "Suisse Intl Mono", ui-monospace, monospace;
```

### Fallback Chain (use for implementation)
```css
font-family: "Suisse Intl", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
font-family: "Suisse Intl Mono", "SF Mono", Consolas, monospace;
```

### Font Weights
| Weight | Value | Usage |
|--------|-------|-------|
| Normal | 400 | Body text, secondary elements |
| Medium | 500 | Navigation items, labels |
| Semibold | 600 | Headings, emphasis |
| Bold | 700 | Page titles, strong emphasis |

### Typography Scale

**Headings (Desktop)**
| Element | Font Size | Line Height | Letter Spacing |
|---------|-----------|-------------|----------------|
| H1 | 2rem (32px) | 2.5rem (40px) | -0.04em |
| H2 | 1.5rem (24px) | 2rem (32px) | 0.02em |

**Headings (Mobile)**
| Element | Font Size | Line Height |
|---------|-----------|-------------|
| H1 | 1.5rem (24px) | 2rem (32px) |
| H2 | 1.125rem (18px) | 1.5rem (24px) |

**Body Text**
| Size | Font Size | Line Height | Usage |
|------|-----------|-------------|-------|
| xs | 0.625rem (10px) | 1rem (16px) | Micro labels, badges |
| sm | 0.75rem (12px) | 1rem (16px) | Table headers, captions |
| md | 0.875rem (14px) | 1.375rem (22px) | Body text, form inputs |
| lg | 1.125rem (18px) | 1.5rem (24px) | Subheadings |

**Monospace**
```css
font-family: "Suisse Intl Mono", monospace;
font-size: 0.875rem; /* 14px */
```

### Navigation Typography
- **Nav items**: Uppercase, letter-spacing: 0.06em, font-size: 0.875rem
- **Nav labels**: Capitalized, font-size: 0.875rem
- **Section headers**: Uppercase, muted color

---

## 2. COLORS - Light Theme

### Background Colors
| Variable | Hex | Usage |
|----------|-----|-------|
| `--bgColor-default` | `#F0EFE2` | Main content area background |
| `--bgColor-mild` | `#E7E6D9` | Sidebar, header background |
| `--bgColor-muted` | `#D7D6CE` | Section backgrounds, table headers |
| `--bgColor-inverse` | `#0B0B0B` | Dark elements |
| `--bgColor-elevated` | `#F0EFE2` | Modals, dropdowns |

### Foreground Colors
| Variable | Hex | Usage |
|----------|-----|-------|
| `--fgColor-default` | `#0B0B0B` | Primary text (near-black) |
| `--fgColor-mild` | `#2E2E2E` | Secondary text |
| `--fgColor-muted` | `#636363` | Tertiary text, placeholders |
| `--fgColor-inverse` | `#E7E6D9` | Text on dark backgrounds |
| `--fgColor-shell` | `#E7E6D9` | Header/shell text |

### Semantic Colors
| Variable | Hex | Usage |
|----------|-----|-------|
| `--fgColor-accent` | `#6236F4` | Accent color (ultraviolet) |
| `--fgColor-info` | `#3A73FF` | Information |
| `--fgColor-success` | `#009C00` | Success states |
| `--fgColor-warning` | `#D98B0C` | Warning states |
| `--fgColor-critical` | `#E70000` | Error/danger states |

### Border Colors
| Variable | Hex | Usage |
|----------|-----|-------|
| `--borderColor-default` | `#BFBEB4` | Default borders |
| `--borderColor-strong` | `#9F9F96` | Emphasized borders |
| `--borderColor-muted` | `#D7D6CE` | Subtle borders |

### Neutral Palette (Reference)
| Name | Hex |
|------|-----|
| neutral-0 | `#FFFFFF` |
| neutral-50 | `#F0EFE2` |
| neutral-100 | `#E7E6D9` |
| neutral-200 | `#BFBEB4` |
| neutral-300 | `#9F9F96` |
| neutral-400 | `#818178` |
| neutral-500 | `#636363` |
| neutral-600 | `#484848` |
| neutral-700 | `#2E2E2E` |
| neutral-800 | `#161616` |
| neutral-900 | `#0B0B0B` |

---

## 3. COLORS - Dark Theme

### Background Colors
| Variable | Hex | Usage |
|----------|-----|-------|
| `--bgColor-default` | `#0B0B0B` | Main background |
| `--bgColor-mild` | `#161616` | Sidebar, header |
| `--bgColor-muted` | `#2E2E2E` | Section backgrounds |
| `--bgColor-inverse` | `#E7E6D9` | Light elements |
| `--bgColor-elevated` | `#222222` | Modals, dropdowns |

### Foreground Colors
| Variable | Hex | Usage |
|----------|-----|-------|
| `--fgColor-default` | `#F0EFE2` | Primary text (cream) |
| `--fgColor-mild` | `#BFBEB4` | Secondary text |
| `--fgColor-muted` | `#818178` | Tertiary text |
| `--fgColor-inverse` | `#0B0B0B` | Text on light |

### Semantic Colors (Dark)
| Variable | Hex | Usage |
|----------|-----|-------|
| `--fgColor-accent` | `#7565F6` | Accent (lighter violet) |
| `--fgColor-info` | `#6C9AFF` | Information |
| `--fgColor-success` | `#05C004` | Success |
| `--fgColor-warning` | `#FDA422` | Warning |
| `--fgColor-critical` | `#FF6742` | Error/danger |

---

## 4. SPACING & SIZING

### Border Radius
| Name | Value | Usage |
|------|-------|-------|
| none | 0px | No radius |
| sm | 2px | Small elements |
| md | 4px | Buttons, inputs |
| lg | 8px | Cards, modals |

### Component Heights
| Component | Height | Usage |
|-----------|--------|-------|
| Header | 60px | Top navigation bar |
| Sidebar Nav Width | 256px | Left navigation |
| Nav Item | 40px | Individual nav items |
| Button (default) | 40px | Primary buttons |
| Button (compact) | 32px | Secondary buttons |
| Input | 40px | Form inputs |
| Table Row | 48px | Table data rows |

### Standard Spacing
| Size | Value | Usage |
|------|-------|-------|
| xs | 4px | Tight spacing |
| sm | 8px | Icon gaps |
| md | 12px | Element padding |
| lg | 16px | Section padding |
| xl | 24px | Page margins |
| xxl | 32px | Large gaps |

### Navigation Padding
```css
.nav-item {
  padding: 0 12px;
  height: 40px;
  gap: 8px;
}

.nav-label {
  padding: 6px 24px 18px;
}

.nav-content-padding {
  padding: 16px;
}
```

---

## 5. LAYOUT STRUCTURE

### Page Architecture
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER (60px height)                                       │
│  ┌──────────────┬──────────────────────────────────────────┤
│  │ LOGO BOX     │  Header Content (nav, user menu)        │
│  │ (square)     │                                          │
├──┴──────────────┴────────────────────────────────────────────┤
│ SIDEBAR │  MAIN CONTENT                                     │
│ (256px) │                                                   │
│         │  ┌─────────────────────────────────────────────┐ │
│  NAV    │  │ Page Header                                 │ │
│  ITEMS  │  │ - Title (H1)                               │ │
│         │  │ - Description                               │ │
│         │  │ - Action Buttons                            │ │
│         │  ├─────────────────────────────────────────────┤ │
│         │  │ Content Area                                │ │
│         │  │ - Tables, Cards, Forms                     │ │
│         │  │                                             │ │
│         │  │                                             │ │
│         │  └─────────────────────────────────────────────┘ │
└─────────┴───────────────────────────────────────────────────┘
```

### Grid Layout (Desktop - 769px+)
```css
main {
  display: grid;
  grid-template-columns: 256px 1fr;
  grid-template-rows: 60px 1fr;
  grid-template-areas:
    "header header"
    "nav content";
}
```

### Header Logo Box
- Square dimension matching header height (60x60px)
- Border-right: 1px solid var(--borderColor-default)
- Border-bottom: 1px solid var(--borderColor-default)
- Background: var(--bgColor-mild)
- Contains centered logo text

### Sidebar
- Width: 256px
- Border-right: 1px solid var(--borderColor-default)
- Background: var(--bgColor-mild)
- Contains navigation items with icons

### Content Area
- Background: var(--bgColor-default)
- Padding: 16px 24px
- Overflow-y: auto

---

## 6. NAVIGATION COMPONENTS

### Nav Item Structure
```css
.nav-item {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 40px;
  gap: 8px;
  border-radius: 4px;
  
  /* States */
  color: var(--fgColor-muted);  /* Default */
  background-color: var(--nav-rest);
}

.nav-item:hover {
  color: var(--fgColor-default);
  background-color: var(--nav-hover);
}

.nav-item.selected,
.nav-item:active {
  color: var(--fgColor-default);
  background-color: var(--nav-active);
}
```

### Nav Item Typography
```css
.nav-item {
  font-family: "Suisse Intl Mono", monospace;  /* or "Suisse Intl" */
  font-size: 0.875rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

### Nav Active Indicator
```css
.nav-item.selected {
  position: relative;
}

.nav-item.selected::before {
  content: "";
  position: absolute;
  top: 0;
  left: 2px;
  width: 2px;
  height: 100%;
  background-color: var(--fgColor-default);
}
```

### Nav Icons
```css
.nav-item svg {
  font-size: 22px;  /* Icon size */
}
```

---

## 7. BUTTONS

### Button Variants

**Primary Button**
```css
.button-primary {
  color: #E7E6D9;  /* Light text */
  background-color: #2E2E2E;  /* Dark bg */
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0 24px;
  height: 40px;
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
}

.button-primary:hover {
  background-color: #0B0B0B;
}
```

**Outline Button**
```css
.button-outline {
  color: #2E2E2E;
  background-color: transparent;
  border: 1px solid #818178;
  border-radius: 4px;
  padding: 0 24px;
  height: 40px;
}

.button-outline:hover {
  background-color: rgba(11, 11, 11, 0.05);
  border-color: #818178;
}
```

**Ghost/Invisible Button**
```css
.button-ghost {
  color: #2E2E2E;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0 24px;
  height: 40px;
}

.button-ghost:hover {
  background-color: rgba(11, 11, 11, 0.05);
}
```

**Destructive Button**
```css
.button-destructive {
  color: #E7E6D9;
  background-color: #BC0000;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0 24px;
  height: 40px;
}

.button-destructive:hover {
  background-color: #8B0201;
}
```

### Button Sizes
| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| Default | 40px | 0 24px | 0.875rem |
| Compact | 32px | 0 12px | 0.75rem |

### Button States
```css
.button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.button:focus-visible {
  outline: 3px solid var(--focusColor-default);
  outline-offset: 2px;
}
```

---

## 8. FORM INPUTS

### Text Input
```css
.input {
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.375rem;
  color: var(--fgColor-default);
  caret-color: var(--fgColor-default);
  
  background-color: transparent;
  border: 1px solid #818178;
  border-radius: 4px;
  outline: none;
  
  padding: 8px;
  width: 100%;
  height: 40px;
}

.input:hover:not([disabled]) {
  background-color: rgba(11, 11, 11, 0.05);
}

.input:focus {
  border: 1px solid #0B0B0B;
}

.input[disabled] {
  opacity: 0.4;
}

.input::placeholder {
  color: var(--fgColor-muted);
}
```

### Label
```css
.label {
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1rem;
  display: block;
  color: var(--fgColor-default);
  padding-bottom: 4px;
}
```

### Hint/Helper Text
```css
.hint {
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1rem;
  display: block;
  color: var(--fgColor-muted);
  padding-top: 4px;
}
```

### Error State
```css
.input.error {
  border: 1px solid var(--control-borderColor-critical);
}

.error-message {
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1rem;
  color: var(--fgColor-critical);
  padding-top: 4px;
}
```

---

## 9. TABLES

### Table Structure
```css
.table {
  min-width: 100%;
  overflow-x: auto;
  font-size: 0.875rem;
  line-height: 18px;
  display: flex;
  align-items: center;
}

.table-header {
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1rem;
  
  border-bottom-width: 1px;
  border-color: var(--borderColor-muted);
  border-style: solid;
  white-space: nowrap;
  
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 4px;
  color: var(--fgColor-muted);
}

.table-cell {
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  
  display: flex;
  align-items: center;
  height: 48px;
  border-bottom: 1px solid var(--borderColor-muted);
  padding-right: 4px;
  margin-right: 1px;
}
```

---

## 10. MODALS

### Modal Structure
```css
.modal-root {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;  /* Desktop only */
}

.modal-background {
  overflow: hidden;
  background-color: rgba(11, 11, 11, 0.15);
  width: 100%;
  height: 100%;
  position: absolute;
  z-index: 1;
}

.modal {
  z-index: 2;
  overscroll-behavior-y: none;
  border: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-default);
  display: flex;
  flex-direction: column;
  max-height: 95%;
  width: calc(100% - 32px);  /* Mobile: 100% */
}

/* Modal Sizes */
.modal.narrow { max-width: 420px; }
.modal.wide { max-width: 640px; }
.modal.extra-wide { max-width: 1000px; }
```

### Modal Header
```css
.modal-header {
  display: flex;
  line-height: 1.375rem;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--borderColor-default);
}

.modal-header .title {
  flex: 1;
  color: var(--fgColor-default);
  font-size: 1.125rem;
  font-family: "Suisse Intl", sans-serif;
  font-weight: 400;
}
```

### Modal Content
```css
.modal-content {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
}
```

---

## 11. BADGES & TAGS

### Status Badge
```css
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  height: 22px;
  border-radius: 2px;
  font-size: 0.75rem;
  font-family: "Suisse Intl", sans-serif;
  font-weight: 500;
}

/* Color variants use semantic colors */
.badge.gray { background-color: var(--dataColor-gray-default); }
.badge.red { background-color: var(--dataColor-red-default); }
.badge.green { background-color: var(--dataColor-green-default); }
.badge.yellow { background-color: var(--dataColor-yellow-default); }
```

### Tag (Gem Style)
```css
.gem {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 2px;
  padding: 0 8px;
  height: 22px;
  font-size: 13px;
  color: var(--fgColor-inverse);
  background-color: var(--dataColor-gray-default);
}
```

---

## 12. TOOLTIPS

```css
.tooltip {
  position: absolute;
  white-space: normal;
  background: var(--tooltip-background);
  color: var(--tooltip-text);
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 16px;
  font-size: 12px;
  font-family: "Suisse Intl", sans-serif;
  font-weight: 400;
  pointer-events: none;
  max-width: 224px;
  width: max-content;
  opacity: 0;
  transition: opacity 0.1s ease-in;
}

.tooltip.showing {
  opacity: 1;
}
```

---

## 13. DROPDOWN MENUS

```css
.dropdown-menu {
  border: 1px solid var(--borderColor-muted);
  border-radius: 4px;
  background: var(--bgColor-elevated);
  box-shadow: 0 4px 20px 0 rgba(11, 11, 11, 0.15);
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  width: 240px;
  gap: 4px;
}

.dropdown-item {
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.375rem;
  color: var(--fgColor-default);
  border-radius: 2px;
  padding: 5px 8px;
  margin: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: rgba(11, 11, 11, 0.05);
}

.dropdown-item.danger {
  color: var(--fgColor-critical);
}

.dropdown-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dropdown-separator {
  height: 1px;
  background-color: var(--borderColor-default);
  width: 100%;
}
```

---

## 14. TABS

```css
.tab-list {
  position: relative;
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 24px;
  gap: 8px;
  box-shadow: inset 0 -1px 0 var(--borderColor-default);
}

.tab {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
  color: var(--fgColor-muted);
  height: 40px;
}

.tab[data-selected] {
  color: var(--fgColor-default);
}

.tab-label {
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.375rem;
  display: block;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: transparent;
}

.tab:not([data-selected]):hover .tab-label {
  background-color: rgba(11, 11, 11, 0.05);
  color: var(--fgColor-default);
}

.tab-highlight-line {
  position: absolute;
  z-index: 1;
  bottom: 0;
  left: 8px;
  right: 8px;
  height: 2px;
  background-color: var(--fgColor-default);
  transition-property: translate, width;
  transition-duration: 0.2s;
  transition-timing-function: ease;
}
```

---

## 15. TOAST NOTIFICATIONS

```css
.toast {
  min-width: 320px;
  border: 1px solid var(--borderColor-muted);
  background-color: var(--bgColor-elevated);
  box-shadow: 0 4px 20px rgba(11, 11, 11, 0.15);
  line-height: 22px;
  border-radius: 8px;
  padding: 12px;
  margin-inline: 32px;
  display: flex;
  gap: 12px;
  align-items: center;
  opacity: 1;
  color: var(--fgColor-default);
  transform: translate(100%);
  transition: all ease 0.2s;
}

.toast.appearing {
  transform: translate(0);
}

.toast.success { /* Icon color: var(--fgColor-success) */ }
.toast.warning { /* Icon color: var(--fgColor-warning) */ }
.toast.error { /* Icon color: var(--fgColor-critical) */ }
.toast.info { /* Icon color: var(--fgColor-info) */ }
```

---

## 16. LOADING STATES

### Spinner
```css
.loading {
  color: var(--loading-icon);
  /* or use CSS animation */
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Progress Bar
```css
.progress-bar {
  transition: width 30s cubic-bezier(0.03, 0.33, 0.27, 1.04);
  background: var(--highlight-secondary);
  position: absolute;
  z-index: 3;
  top: 0;
  left: 0;
  width: 0;
  height: 3px;
}

.progress-bar.running {
  width: 100%;
}
```

---

## 17. CHECKBOXES & RADIOS

### Checkbox
```css
.checkbox {
  color: transparent;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
  border: 2px solid var(--fgColor-default);
  border-radius: 2px;
}

.checkbox:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.checkbox.active {
  background-color: #0B0B0B;
  color: #E7E6D9;
  border-color: #0B0B0B;
}

.checkbox.disabled {
  border-color: var(--toggle-border-disabled);
  background-color: var(--toggle-background-disabled);
  cursor: not-allowed;
}
```

---

## 18. PAGE HEADER

```css
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 16px;
}

.page-header .title-section {
  padding-top: 4px;
}

.page-header h1 {
  display: inline-block;
  font-size: var(--text-font-size-h1);  /* 2rem desktop */
  font-family: "Suisse Intl", sans-serif;
  font-weight: 400;
  line-height: var(--text-line-height-h1);  /* 2.5rem */
}

.page-header .description {
  font-family: "Suisse Intl", sans-serif;
  margin-top: 12px;
  font-size: 14px;
  line-height: 22px;
}

.page-header .buttons-section {
  display: flex;
  gap: 16px;
}
```

---

## 19. CSS VARIABLE QUICK REFERENCE

### Light Theme (Default)
```css
:root {
  /* Borders */
  --borderColor-default: #BFBEB4;
  --borderColor-muted: #D7D6CE;
  
  /* Backgrounds */
  --bgColor-default: #F0EFE2;
  --bgColor-mild: #E7E6D9;
  --bgColor-muted: #D7D6CE;
  
  /* Foreground */
  --fgColor-default: #0B0B0B;
  --fgColor-muted: #636363;
  
  /* Navigation */
  --nav-bgColor: #E7E6D9;
  --nav-rest: transparent;
  --nav-hover: #F0EFE2;
  --nav-active: #F0EFE2;
  
  /* Buttons */
  --button-primary-bgColor-rest: #2E2E2E;
  --button-primary-fgColor-rest: #E7E6D9;
  
  /* Focus */
  --focusColor-default: #6236F4;
}
```

### Dark Theme
```css
.theme-dark {
  /* Borders */
  --borderColor-default: #2E2E2E;
  
  /* Backgrounds */
  --bgColor-default: #0B0B0B;
  --bgColor-mild: #161616;
  --bgColor-muted: #2E2E2E;
  
  /* Foreground */
  --fgColor-default: #F0EFE2;
  --fgColor-muted: #818178;
  
  /* Navigation */
  --nav-bgColor: #000000;
  --nav-hover: #161616;
  --nav-active: #161616;
  
  /* Buttons */
  --button-primary-bgColor-rest: #BFBEB4;
  --button-primary-fgColor-rest: #161616;
  
  /* Focus */
  --focusColor-default: #7565F6;
}
```

---

## 20. KEY DESIGN PRINCIPLES

1. **Warm Neutrals**: Never pure white (#FFFFFF) or pure black (#000000) - use warm off-whites and near-blacks
2. **Subtle Contrast**: Backgrounds differ by only 1-2 shades
3. **Uppercase Navigation**: All nav items use uppercase with letter-spacing
4. **Monospace Accents**: Use "Suisse Intl Mono" for code, IDs, and technical content
5. **Minimal Decoration**: No gradients, shadows, or rounded corners (except 2-4px)
6. **Functional Color**: Color used sparingly for status and semantic meaning only
7. **Heavy Whitespace**: Content should breathe with generous padding
8. **Consistent Height**: All interactive elements align to 40px or 48px height
9. **Borders Over Shadows**: Depth achieved through borders, not shadows
10. **No Hover Overload**: Hover states are subtle (slight background change)

---

## 21. IMPLEMENTATION CHECKLIST

When building components, verify:

- [ ] Font family is "Suisse Intl" for text, "Suisse Intl Mono" for code
- [ ] Font sizes match the typography scale
- [ ] Colors use CSS variables for theme support
- [ ] Border radius is 4px max (or 0 for sharp edges)
- [ ] Interactive elements have 40px height
- [ ] Nav items use uppercase + letter-spacing
- [ ] No pure white/black in color values
- [ ] Subtle hover states (not dramatic)
- [ ] Focus states use `--focusColor-default`
- [ ] Consistent padding/margin values

---

## 22. FILE STORE / FILE LIST

The File Store section displays user files and folders in a structured table format with navigation capabilities.

### File List Structure
```css
.file-list-container {
  background-color: var(--bgColor-default);
  border: 1px solid var(--borderColor-default);
  border-radius: 4px;
  overflow: hidden;
}

.file-list-header {
  display: grid;
  grid-template-columns: 1fr 100px 100px 160px 40px;
  gap: 12px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--borderColor-muted);
  background-color: var(--bgColor-muted);
  height: 40px;
  align-items: center;
}

.file-list-header-cell {
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--fgColor-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

### File Row
```css
.file-row {
  display: grid;
  grid-template-columns: 1fr 100px 100px 160px 40px;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--borderColor-muted);
  align-items: center;
  height: 48px;
  transition: background-color 0.1s ease;
}

.file-row:hover {
  background-color: rgba(11, 11, 11, 0.02);
}

/* Dark theme */
.theme-dark .file-row:hover {
  background-color: rgba(240, 239, 226, 0.02);
}
```

### File Name Cell
```css
.file-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.file-icon-container {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: var(--bgColor-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon {
  width: 18px;
  height: 18px;
}

.file-icon.folder {
  stroke: var(--fgColor-info);
}

.file-icon.file {
  stroke: var(--fgColor-muted);
}

.file-name {
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.875rem;
  color: var(--fgColor-default);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Folder names are clickable */
.folder-name {
  color: var(--fgColor-info);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin-left: -8px;
  border-radius: 4px;
  border: none;
  background: transparent;
  transition: all 0.15s ease;
}

.folder-name:hover {
  background-color: var(--bgColor-muted);
  text-decoration: underline;
}

.folder-arrow {
  width: 12px;
  height: 12px;
  opacity: 0.6;
}
```

### File Metadata Cells
```css
.file-type {
  font-family: "Suisse Intl Mono", monospace;
  font-size: 0.8125rem;
  color: var(--fgColor-muted);
  text-transform: capitalize;
}

.file-size {
  font-family: "Suisse Intl Mono", monospace;
  font-size: 0.8125rem;
  color: var(--fgColor-muted);
}

.file-date {
  font-family: "Suisse Intl Mono", monospace;
  font-size: 0.8125rem;
  color: var(--fgColor-muted);
}
```

### Breadcrumb Navigation
```css
.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background-color: var(--bgColor-muted);
  border-bottom: 1px solid var(--borderColor-muted);
}

.back-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background-color: var(--bgColor-default);
  border: 1px solid var(--borderColor-default);
  border-radius: 4px;
  cursor: pointer;
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--fgColor-default);
  transition: all 0.15s ease;
}

.back-button:hover {
  background-color: var(--bgColor-muted);
  border-color: var(--fgColor-muted);
}

.breadcrumb-path {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-item {
  padding: 4px 8px;
  background-color: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--fgColor-info);
  transition: background-color 0.15s ease;
}

.breadcrumb-item:hover {
  background-color: var(--bgColor-default);
}

.breadcrumb-item.current {
  background-color: var(--bgColor-default);
  font-weight: 600;
  color: var(--fgColor-default);
  cursor: default;
}

.breadcrumb-separator {
  width: 14px;
  height: 14px;
  stroke: var(--fgColor-muted);
}
```

### Action Menu (Three-dot)
```css
.action-menu-container {
  position: relative;
}

.action-menu-button {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--fgColor-muted);
  transition: background-color 0.15s ease;
}

.action-menu-button:hover {
  background-color: var(--bgColor-muted);
}

.action-menu-button.active {
  background-color: var(--bgColor-muted);
}

/* Dropdown rendered via Portal */
.action-dropdown {
  position: fixed;
  background-color: var(--bgColor-default);
  border: 1px solid var(--borderColor-default);
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 140px;
  overflow: hidden;
}

.action-dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background-color: transparent;
  border: none;
  cursor: pointer;
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.8125rem;
  color: var(--fgColor-default);
  text-align: left;
  transition: background-color 0.15s ease;
}

.action-dropdown-item:hover {
  background-color: var(--bgColor-muted);
}

.action-dropdown-item.danger {
  color: var(--fgColor-critical);
}
```

### Empty State
```css
.empty-state {
  padding: 48px 24px;
  text-align: center;
}

.empty-state-icon {
  width: 48px;
  height: 48px;
  stroke: var(--fgColor-muted);
  stroke-width: 1.5;
  margin: 0 auto 16px;
}

.empty-state-text {
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.875rem;
  color: var(--fgColor-muted);
  margin: 0;
}
```

### Toolbar / Filter Bar
```css
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-default);
}

.search-input-container {
  position: relative;
  width: 240px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  stroke: var(--fgColor-muted);
}

.search-input {
  width: 100%;
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.875rem;
  color: var(--fgColor-default);
  background-color: transparent;
  border: 1px solid var(--borderColor-default);
  border-radius: 4px;
  padding: 0 12px 0 36px;
  height: 32px;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--fgColor-default);
}

.search-input::placeholder {
  color: var(--fgColor-muted);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.icon-button {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: transparent;
  border: 1px solid var(--borderColor-default);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--fgColor-muted);
  transition: all 0.15s ease;
}

.icon-button:hover {
  background-color: var(--bgColor-muted);
  border-color: var(--fgColor-muted);
}
```

### Filter Tabs
```css
.filter-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-tab {
  padding: 4px 12px;
  background-color: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: "Suisse Intl", sans-serif;
  font-size: 0.875rem;
  color: var(--fgColor-muted);
  transition: all 0.15s ease;
}

.filter-tab:hover {
  background-color: rgba(11, 11, 11, 0.05);
  color: var(--fgColor-default);
}

.filter-tab.active {
  background-color: var(--bgColor-muted);
  color: var(--fgColor-default);
  font-weight: 500;
}
```
