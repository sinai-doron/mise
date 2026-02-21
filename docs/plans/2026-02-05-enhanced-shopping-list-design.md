# Enhanced Shopping List Design

## Purpose
Transform the recipe-focused shopping list into a comprehensive, mobile-first shopping experience that handles all grocery store needs - food, household essentials, and more. Enable users to efficiently create lists before shopping and quickly check items off while in-store.

## Users
- Individuals managing personal shopping
- Households/families with shared lists (eventual sync between members)

## Success Criteria
- [ ] One-handed mobile operation with large touch targets (48px+ rows)
- [ ] Add any item in < 3 seconds via quick-add
- [ ] Items from recipes consolidate with manually added items (same "Milk" line)
- [ ] Source visibility - see why you need an item (which recipe, manual add)
- [ ] Purchase history tracked for cadence insights
- [ ] Works offline (critical for in-store use)
- [ ] Supports household essentials beyond food

## Constraints
- Must integrate with existing meal plan / recipe flows
- Firebase Firestore for storage (already in use)
- Household sync via shared list (eventual consistency acceptable)
- Mobile-first but desktop should remain functional

## Out of Scope (v1)
- Inventory tracking (deferred to future version)
- Price comparison / tracking
- Proactive suggestions based on cadence (just show history)
- Store-specific aisle mappings
- Barcode scanning

## Approach Chosen
**Option A: Enhanced Categories Model** - Extend the current category-based structure with new household categories. Items support multiple sources (recipe + manual). Quantities consolidate automatically with source breakdown visible.

Why: Builds on existing architecture, minimal migration, categories work well for both food and household items.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Shopping List Store                       │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐   │
│  │ ShoppingItem│   │  ItemSource │   │  PurchaseHistory│   │
│  │ - id        │◄──│ - recipeId? │   │  - itemName     │   │
│  │ - name      │   │ - manual?   │   │  - purchasedAt  │   │
│  │ - category  │   │ - quantity  │   │  - quantity     │   │
│  │ - quantity  │   └─────────────┘   └─────────────────┘   │
│  │ - bought    │                                            │
│  │ - sources[] │   (items can have multiple sources)        │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Firestore                        │
│  users/{uid}/shoppingItems/{itemId}                         │
│  users/{uid}/purchaseHistory/{historyId}                    │
└─────────────────────────────────────────────────────────────┘
```

**Key additions:**
1. **Multi-source items**: A single "Milk - 2L" line can track that 1L is for a recipe, 1L is manual
2. **Extended categories**: Add Cleaning, Personal Care, Paper Products, Pet, Baby
3. **Purchase history**: When items are checked off, log to history for cadence insights later

## Components

### New/Modified Components

1. **ShoppingListPage** (enhanced)
   - Mobile-first redesign with larger touch targets
   - Quick-add input at top (always visible)
   - Collapsible category sections
   - Swipe gestures for check-off (optional enhancement)

2. **ShoppingItem** (new component)
   - Displays item with quantity and source indicators
   - Shows recipe badges when item comes from recipes
   - Tap to check off, long-press for edit/delete
   - Quantity adjuster (+/- buttons)

3. **QuickAddInput** (new component)
   - Text input with auto-suggest from history
   - Smart category detection ("dish soap" → Cleaning)
   - Quick quantity/unit picker

4. **CategorySection** (new component)
   - Collapsible group header with item count
   - Progress indicator (3/5 items bought)
   - Sorted: unbought items first

5. **ItemSourceBadges** (new component)
   - Small pills showing where item came from
   - "Chocolate Cake" recipe badge
   - "Manual" or custom tag

### Existing Components (unchanged)
- UserMenu, Header, Navigation - reuse as-is

## Data Flow

### Adding Items

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│  Quick Add      │────▶│  Zustand Store  │────▶│  Firebase   │
│  (manual entry) │     │  addShoppingItem│     │  (sync)     │
└─────────────────┘     └─────────────────┘     └─────────────┘
                              │
                              ▼
┌─────────────────┐     ┌─────────────────┐
│  Recipe Page    │────▶│  addFromRecipe  │  (includes recipeId + name as source)
│  "Add to list"  │     │                 │
└─────────────────┘     └─────────────────┘
```

**Item consolidation logic:**
- When adding "Milk 1L", check if "Milk" already exists
- If yes: increase quantity, add new source to sources[]
- If no: create new item

### Checking Off Items

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│  Tap checkbox   │────▶│  toggleItem     │────▶│  Firebase   │
│  (or swipe)     │     │  + logPurchase  │     │  (sync)     │
└─────────────────┘     └─────────────────┘     └─────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │ Purchase History│  (for cadence tracking later)
                        │ {item, date, qty}│
                        └─────────────────┘
```

### Viewing Purchase History (for cadence)

```
┌─────────────────┐     ┌─────────────────┐
│  Item detail    │────▶│  Query history  │
│  or stats view  │     │  for this item  │
└─────────────────┘     └─────────────────┘
                              │
                              ▼
                        "Bought 4 times in last 2 months"
                        "Last purchased: Jan 15"
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| **Offline in store** | Optimistic updates - changes queue locally, sync when connection returns. Critical for in-store use. |
| **Sync conflict** | Last-write-wins for simple fields. For quantities, take the higher value (safer to buy more than less). |
| **Add duplicate item** | Consolidate automatically - never show two "Milk" entries. Show toast: "Added to existing item" |
| **Delete item with recipe source** | Warn if item is linked to a meal plan recipe. Allow deletion but remove the source link. |
| **Invalid quantity** | Coerce to 1 if invalid. No negative quantities. |
| **Category detection fails** | Default to "Other Items" category. User can recategorize manually. |

## Testing Strategy

### Unit Tests
- **Item consolidation**: Adding same item twice merges quantities correctly
- **Source tracking**: Recipe sources preserved when manually adjusting quantity
- **Category detection**: "Laundry detergent" → Cleaning, "Eggs" → Dairy
- **Quantity math**: Handles fractions (1/2 cup + 1/4 cup = 3/4 cup)

### Integration Tests
- **Firebase sync**: Items persist across sessions, sync between devices
- **Recipe integration**: Adding recipe ingredients creates proper source links
- **Offline mode**: Changes made offline sync correctly when reconnected

### Manual/E2E Tests
- **Mobile UX**: One-handed operation on various phone sizes
- **Touch targets**: All interactive elements ≥ 44x44px
- **Quick add flow**: < 3 seconds to add a simple item
- **In-store simulation**: Walk through checking off 10+ items rapidly

## UI Mockups

### Main Shopping List View (Phone)

```
┌─────────────────────────────────────┐
│ ← Shopping List              [···]  │  ← Minimal header
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🔍 Add item...            [+]   │ │  ← Always visible quick-add
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│                                     │
│ ▼ Produce                    2/4    │  ← Collapsible, shows progress
│ ┌─────────────────────────────────┐ │
│ │ ○  Bananas                  6   │ │  ← Large touch target
│ │    [Chocolate Cake] [Manual]    │ │  ← Source badges (small)
│ ├─────────────────────────────────┤ │
│ │ ○  Spinach              1 bag   │ │
│ ├─────────────────────────────────┤ │
│ │ ✓  Apples                   4   │ │  ← Checked, muted style
│ │ ✓  Onions                   2   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ▼ Dairy                      0/3    │
│ ┌─────────────────────────────────┐ │
│ │ ○  Milk                    2L   │ │
│ │    1L recipe + 1L manual        │ │  ← Quantity breakdown
│ ├─────────────────────────────────┤ │
│ │ ○  Eggs               1 dozen   │ │
│ ├─────────────────────────────────┤ │
│ │ ○  Butter              200g     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ▶ Cleaning                   0/2    │  ← Collapsed section
│ ▶ Personal Care              0/1    │
│                                     │
├─────────────────────────────────────┤
│    6 of 10 items  ·  Clear done     │  ← Bottom status bar
└─────────────────────────────────────┘
```

### Quick Add Flow

```
┌─────────────────────────────────────┐
│ ← Add Item                          │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ dish soap                    ▼  │ │  ← Text input
│ └─────────────────────────────────┘ │
│                                     │
│ Recent:                             │
│ ┌─────────────────────────────────┐ │
│ │ Dish soap          last: 3w ago │ │  ← Tap to add
│ │ Paper towels       last: 2w ago │ │
│ │ Laundry detergent  last: 1mo ago│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌───────┐  ┌────────────────────┐   │
│ │  1    │  │ bottle         ▼  │   │  ← Qty + unit picker
│ │ [-][+]│  │                   │   │
│ └───────┘  └────────────────────┘   │
│                                     │
│ Category: Cleaning (auto-detected)  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │          Add to List            │ │  ← Big primary button
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Key Mobile UX Decisions

- **Touch targets**: All rows minimum 48px height
- **One-handed**: Primary actions on right side (thumb reach)
- **Checked items**: Grouped at bottom of each category, muted
- **No horizontal scroll**: Everything fits in portrait
- **Swipe optional**: Tap works everywhere, swipe is bonus

## Extended Categories

Current categories:
- produce, dairy, meat, bakery, frozen, pantry, spices, other

New categories to add:
- **cleaning**: Dish soap, laundry detergent, cleaning sprays
- **personal_care**: Shampoo, toothpaste, razors, deodorant
- **paper_products**: Paper towels, toilet paper, tissues, napkins
- **pet**: Pet food, treats, litter
- **baby**: Diapers, formula, baby food, wipes

## Data Types

```typescript
interface ShoppingItem {
  id: string;
  name: string;
  category: ItemCategory;
  totalQuantity: number;
  unit: string;
  bought: boolean;
  sources: ItemSource[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ItemSource {
  type: 'recipe' | 'manual';
  recipeId?: string;
  recipeName?: string;
  quantity: number;
  addedAt: Timestamp;
}

interface PurchaseHistoryEntry {
  id: string;
  itemName: string;
  normalizedName: string; // for matching across variations
  category: ItemCategory;
  quantity: number;
  unit: string;
  purchasedAt: Timestamp;
}

type ItemCategory =
  | 'produce' | 'dairy' | 'meat' | 'bakery' | 'frozen'
  | 'pantry' | 'spices' | 'cleaning' | 'personal_care'
  | 'paper_products' | 'pet' | 'baby' | 'other';
```

## Questions Resolved

- Q: What's the core problem - in-store or planning?
  A: Both equally - the full journey from planning to shopping

- Q: Who are the users?
  A: Individuals and households/families with shared lists

- Q: What non-food items?
  A: Household essentials (cleaning, toiletries, paper products) - things you buy at grocery stores

- Q: How should cadence tracking work?
  A: Just track history for now - show purchase history, no proactive suggestions

- Q: What's most important for in-store UX?
  A: Speed & simplicity - one-handed operation, big touch targets, quick check-off

- Q: How should recipe items integrate?
  A: Unified list with source tracking. If milk is needed for a recipe and manually, show one line with quantity breakdown

- Q: What level of household sharing?
  A: Shared list with eventual sync - no need for instant real-time updates

## Next Steps

1. Create implementation plan (if complex)
2. Or start building directly (if simple)
3. Reference this design throughout implementation
