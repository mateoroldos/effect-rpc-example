<script lang="ts">
  import { authClient } from "#lib/auth-client.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { goto } from "$app/navigation";
  import type { LayoutProps } from "./$types";

  let { children, data }: LayoutProps = $props();
  let signingOut = $state(false);

  const signOut = async () => {
    signingOut = true;
    const { error } = await authClient.signOut();
    if (error) {
      signingOut = false;
      return;
    }
    await goto("/login", { invalidateAll: true });
  };
</script>

<header class="border-b border-border">
  <div
    class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8"
  >
    <span class="truncate text-sm text-muted-foreground"
      >{data.user.email}</span
    >
    <Button disabled={signingOut} onclick={signOut} variant="outline">
      {signingOut ? "Signing out…" : "Sign out"}
    </Button>
  </div>
</header>

{@render children()}
