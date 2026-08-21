<script lang="ts">
  import { getOrganizations } from "#lib/remotes/organizations.remote.ts";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";

  const chooseOrganization = async (
    event: Event & { currentTarget: HTMLSelectElement }
  ) => {
    const organizationId = event.currentTarget.value;
    if (organizationId) {
      await goto(`/org/${organizationId}`);
    } else {
      await goto("/");
    }
  };
</script>

<label class="sr-only" for="organization-picker">Organization</label>
<select
  class="h-9 max-w-56 rounded-md border border-input bg-background px-3 text-sm"
  id="organization-picker"
  onchange={chooseOrganization}
  value={page.params.organizationId ?? ""}
>
  <option value="">Organizations</option>
  {#each await getOrganizations() as organization (organization.id)}
    <option value={organization.id}>{organization.name}</option>
  {/each}
</select>
