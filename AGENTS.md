<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Shopper confirmation is a local click-only convenience gate, not bot-proof authentication; signup and order creation must not depend on AI requests or challenge proofs.
- Typography may use the existing public read-only settings policy when an older hosted admin service lacks its read action; all settings writes remain owner-authorized on the hosted admin endpoint.
- Enforce admin permissions centrally on the server and resolve staff UUID/team on every request; deleted/recreated usernames must not revive old tokens.
- Bind Stripe checkout and webhook updates to the authenticated customer's immutable order snapshot, session ID and environment; never let browser metadata or cart prices establish payment ownership.
- External-host checkout calls the token-authenticated Lovable payment endpoint; share order processing with server functions so Vercel never needs payment secrets.
- Keep banner media probing in the browser-side admin input, using native image/video loading so extensionless direct media URLs are detected without server fetches.
- Keep public-page mastheads in SiteHeader with a centred logo and separate navigation row so desktop and mobile share the same brand hierarchy.
- Keep bilingual brand-story paragraphs in a shared browser-safe copy module so the story page renders matching English and Malay narratives.
- Reference the supplied logo through its transparent asset pointer resolved against the absolute Lovable-hosted origin so external deployments load it; derive transparency from the original pixels to preserve the exact lettering on light and dark placements.
- Admin back office runs only via the token-authenticated `/api/public/admin` endpoint on the Lovable-hosted app; other hosts (Vercel) call it cross-origin — they lack the backend service key, so admin logic must never depend on the serving host.
- Rate limiting and brute-force lockout use the `rate_limit_events` table + `rate_limit_hit` SQL function — server workers are stateless, so limits must be durable.

- Store owner-managed typography overrides by semantic text role and independent desktop/mobile sizes; apply only to customer pages so admin controls remain usable, with empty overrides preserving original responsive sizing.
