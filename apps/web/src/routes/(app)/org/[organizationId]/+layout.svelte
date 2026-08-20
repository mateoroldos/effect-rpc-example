<script lang="ts">
  import OrganizationShell from "#lib/features/organizations/organization-shell.svelte";
  import { getOrganization } from "#lib/remotes/organizations.remote.ts";
  import { page } from "$app/state";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
</script>

<OrganizationShell
  {children}
  organization={await getOrganization({
    organizationId: page.params.organizationId ?? "",
  })}
/>
