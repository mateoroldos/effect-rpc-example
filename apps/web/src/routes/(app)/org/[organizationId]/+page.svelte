<script lang="ts">
  import { getOrganizationContext } from "#lib/features/organizations/organization-context.ts";

  const organization = getOrganizationContext();
</script>

<section aria-labelledby="organization-overview" class="max-w-2xl space-y-3">
  <h2 class="text-xl font-semibold" id="organization-overview">Overview</h2>
  <p class="text-muted-foreground">
    {organization.organization.name}
    is ready for Agents and Members.
  </p>
</section>
