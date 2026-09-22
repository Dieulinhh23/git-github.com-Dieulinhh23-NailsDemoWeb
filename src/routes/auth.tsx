import { createFileRoute, redirect } from "@tanstack/react-router";

// Customers should never land on a sign-in page. Any visit to /auth
// goes straight to the public salon homepage instead.
export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    throw redirect({ to: "/" });
  },
});
