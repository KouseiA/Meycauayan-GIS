# Design System — NEXUS Grid

This document outlines the visual language and core design tokens of the Meycauayan City Emergency GIS Portal.

## Color System

### Base Palette (Space Navy)

Used for all dark viewport surfaces, app headers, sidebar backgrounds, and general layout framing.

- **Void** (`#060d18`): Deepest background for map surroundings.
- **Surface 0** (`#080e1a`): Core background of the application viewport.
- **Surface 1** (`#0c1525`): Card surfaces, maps controls card, and dropdown panels.
- **Surface 2** (`#111e35`): Elevated components, focused inputs, active dropdown list items.
- **Surface 3** (`#1a2d48`): Hover highlights and active controls.
- **Border** (`rgba(255, 255, 255, 0.07)`): Subtle line separators.
- **Border Accent** (`rgba(0, 196, 230, 0.20)`): Thematic highlight boundaries.

### Accent (Electric Cyan)

Used as the primary brand element, focus indicator, and interactive action highlights.

- **Primary Accent** (`#00c2e0` / `--clr-cyan-400`): Bright brand indicator.
- **Accent Glow** (`rgba(0, 194, 224, 0.22)`): Shadows and pulse rings.
- **Secondary Blue** (`#0090cc` / `--clr-blue-400`): Auxiliary actions.

### Light Panel (Info Panel)

For data-dense exploration, a bright, clinical, highly readable viewport overlay is utilized.

- **Panel Background** (`#f0f5fb`): Off-white clinical gray.
- **Panel Surface** (`#ffffff`): Plain white content container background.
- **Panel Border** (`rgba(0, 194, 224, 0.18)`): Border separators.
- **Panel Text** (`#102030`): Stark, highly accessible dark text.
- **Panel Muted** (`#4e6880`): Muted descriptors.

### Emergency Colors

- **Emergency Red** (`#e03030` / `--clr-red-500`): High alert states, FAB hotlines toggle, nav hotlines button.

---

## Typography

The typography leverages a robust sans-serif paired with a monospace utility family to distinguish data outputs (coordinates, numeric metrics) from static UI copy.

### Headings and Body

- **Font Family**: `"Plus Jakarta Sans", sans-serif`
- **Sizes**:
  - H1 Display: `22px`
  - H2 Section Header: `18px`
  - Body: `12px` (Regular / Medium)
  - Labels: `9px` (Uppercase, tracked wide at `0.15em`)

### Monospace / Data

- **Font Family**: `"JetBrains Mono", monospace`
- **Used for**: LAT/LNG coordinates HUD, stat counts, index numerals in listings.

---

## Components

### 1. The Global Navbar
Sleek semi-transparent navbar with a cyan brand accent line at the top. The shield brand icon uses the primary cyan background. The only colored element on the navbar is the solid red Emergency Hotlines button.

### 2. Interactive Map HUD
Positioned centered above the bottom margin of the map view, rendering current latitudinal, longitudinal, and zoom readouts in the monospace font.

### 3. Slide-out Info Panel
Stark light mode contrast against the dark map viewport. Uses high-contrast badges for each facility type.

---

## Motion & Transition

- **Reduced Motion**: All animations are suppressed (`duration: 0.01ms`) if user preferences request reduced motion.
- **Pulse Indicators**: Soft pulsing ring around the Emergency FAB and active targets using CSS keyframes.
