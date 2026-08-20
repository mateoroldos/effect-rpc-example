<script lang="ts">
  import { setOrganizationContext } from "#lib/features/organizations/organization-context.ts";
  import { getOrganization } from "#lib/remotes/organizations.remote.ts";
  import { page } from "$app/state";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
  const organization = $derived(
    await getOrganization({
      organizationId: page.params.organizationId ?? "",
    })
  );

  setOrganizationContext({
    get organization() {
      return organization;
    },
  });
</script>

<svelte:head>
  <title>{organization.name} | Effect template</title>
  <meta
    content={`Manage Agents and Members in ${organization.name}.`}
    name="description"
  >
</svelte:head>

<main class="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
  <header class="border-b border-border pb-6">
    <p class="text-sm text-muted-foreground">Organization</p>
    <h1 class="mt-1 text-3xl font-semibold tracking-tight">
      {organization.name}
    </h1>
  </header>

  <div class="pt-8">{@render children()}</div>
</main>
