import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/shopper-verify")({ server: { handlers: {
  POST: () => Response.json({ error: "AI shopper verification has been retired. Refresh the page to use click verification." }, { status: 410 }),
  OPTIONS: () => new Response(null, { status: 204 }),
} } });