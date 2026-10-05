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
- Admin back office runs only via the token-authenticated `/api/public/admin` endpoint on the Lovable-hosted app; other hosts (Vercel) call it cross-origin — they lack the backend service key, so admin logic must never depend on the serving host.
- Rate limiting and brute-force lockout use the `rate_limit_events` table + `rate_limit_hit` SQL function — server workers are stateless, so limits must be durable.
