# Rebuild MAQAMY as a multi-page luxury storefront

## Pages
- **Introduction (`/`)** — keep the 0.5-second spinning-bar opening, then present only the full-screen brand introduction and clear links onward.
- **Story (`/story`)** — give the exact PDF wording its own spacious editorial page, retaining the green scroll-focus treatment.
- **Collections (`/collections`)** — present Noor and Janna as two deliberate product chapters. Show each supplied image in full with `object-contain`, never cropped or half-hidden, followed by details and the three package choices.
- **Cart (`/cart`)** — replace the side drawer with a full page for saved selections, quantities, totals, sign-in state, and consultation action.
- Keep **Account**, **Privacy**, and **Password reset** as separate pages.

## Shared luxury presentation
- Add a consistent MAQAMY header and footer across the public pages, with real page links instead of one-page anchors.
- Preserve the forest, cream, and restrained gold identity while increasing whitespace, image prominence, and editorial pacing.
- Remove every “A-Z” reference. Copyright will read **MAQAMY Living Concepts © 2026**.

## Technical details
- Extract shared navigation, footer, cart access, and cart data actions into focused reusable modules.
- Preserve the existing customer accounts and database-backed cart.
- Give every new page distinct title and social metadata.
- Verify navigation, full-image rendering, signed-out cart behavior, mobile layout, and the latest build status.
