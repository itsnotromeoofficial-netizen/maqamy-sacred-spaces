import { createFileRoute } from "@tanstack/react-router";
import { handleShopperVerification } from "@/lib/shopper-security.server";
export const Route = createFileRoute("/api/public/shopper-verify")({ server: { handlers: {
  POST: ({ request }) => handleShopperVerification(request),
  OPTIONS: ({ request }) => handleShopperVerification(request),
} } });