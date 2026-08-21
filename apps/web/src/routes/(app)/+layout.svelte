<script lang="ts">
  import { authClient } from "#lib/auth-client.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import OrganizationPicker from "#lib/features/organizations/organization-picker.svelte";
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
    await goto("/login", { refreshAll: true });
  };
</script>

<header class="border-b border-border">
  <div
    class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8"
  >
    <div class="flex min-w-0 items-center gap-3">
      <a class="font-semibold" href="/">Effect template</a>
      <svelte:boundary>
        {#snippet pending()}
          <span class="text-sm text-muted-foreground">Organizations…</span>
        {/snippet}
        <OrganizationPicker />
      </svelte:boundary>
    </div>
    <div class="flex min-w-0 items-center gap-3">
      <span class="hidden truncate text-sm text-muted-foreground sm:block"
        >{data.user.email}</span
      >
      <Button disabled={signingOut} onclick={signOut} variant="outline">
        {signingOut ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  </div>
</header>

{@render children()}
