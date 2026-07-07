# Product

## Register

product

## Users

General public and students in Meycauayan City, Bulacan. Users arrive in two modes:
1. **Urgency mode** — someone needs emergency contacts or facility locations fast
2. **Exploration mode** — students or curious residents browsing the city's emergency infrastructure

Both groups are non-technical. The interface must be instantly readable, navigation must be obvious, and critical information (hotlines, locations) must surface in 1–2 taps.

## Product Purpose

An interactive GIS portal that maps all 26 barangays of Meycauayan City alongside its emergency facilities — police stations, fire stations, hospitals, and health centers. Residents can locate facilities, get contact numbers, and understand coverage at a glance. The admin dashboard lets authorized staff manage facility data.

Success = a resident can find the nearest hospital and get its contact in under 20 seconds.

## Brand Personality

Authoritative, precise, alive. The system should feel like it is *monitoring the city* — not just displaying a static map. Three words: **Command. Clarity. Civic.**

## Anti-references

- Generic Google Maps clone aesthetic (blue pins, white cards, stock UI)
- Bootstrap default theme (gray cards, blue buttons, no identity)
- Warm/editorial GIS sites (Felt, felt.com style — too casual for emergency services)
- Cluttered government portals that feel 2010-era

## Design Principles

1. **The map is the product** — UI chrome serves the map, never competes with it
2. **Emergency information is never decorative** — red/amber only signals real urgency
3. **Data before decoration** — every visual element must earn its place by surfacing information faster
4. **Dark map, light data** — the city at night lit by data points; information panels are bright, clinical, readable
5. **Accessible by default** — WCAG AA contrast, reduced motion respected, keyboard navigable

## Accessibility & Inclusion

WCAG AA target. `prefers-reduced-motion` respected (already implemented). High contrast between interactive elements and their backgrounds. Font sizes ≥ 11px for all readable content.
