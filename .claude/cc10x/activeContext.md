# Active Context

## Current Focus
Enhanced Shopping List design completed. Ready for planning or building.

## Recent Changes
- Recipe sharing feature implemented (individual recipes)
- Recipe Collections design created
- Enhanced Shopping List design created (mobile-first, household items, multi-source)

## Designs
1. **Recipe Sharing** (implemented): `docs/plans/2026-01-30-recipe-sharing-design.md`
2. **Recipe Collections** (designed): `docs/plans/2026-01-31-recipe-collections-design.md`
3. **Enhanced Shopping List** (designed): `docs/plans/2026-02-05-enhanced-shopping-list-design.md`

## Enhanced Shopping List Summary
- Mobile-first shopping experience with large touch targets
- Supports household essentials (cleaning, personal care, paper products, pet, baby)
- Items from recipes consolidate with manual items (multi-source tracking)
- Quick-add with auto-suggest from purchase history
- Purchase history tracked for cadence insights (v2: smart suggestions)
- Offline-first for in-store use
- Household sharing with eventual sync

## Next Steps
1. Create implementation plan for Enhanced Shopping List
2. Or start building directly
3. Reference design at `docs/plans/2026-02-05-enhanced-shopping-list-design.md`

## Active Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| Architecture | Enhanced Categories Model | Extends existing, minimal migration |
| Item sources | Multi-source (recipe + manual) | Consolidates quantities with visibility |
| New categories | cleaning, personal_care, paper_products, pet, baby | Household essentials |
| Cadence tracking | History only (v1) | Show data, defer smart suggestions |
| Household sync | Eventual consistency | Real-time not needed |
| Out of scope | Inventory tracking, price comparison | Keep v1 focused |

## Last Updated
2026-02-05
