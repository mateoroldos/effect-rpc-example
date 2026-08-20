<script lang="ts">
  import { organizationRoleAllows } from "@effect-template/domain/organization";
  import InviteMemberForm from "#lib/features/organizations/invite-member-form.svelte";
  import MemberList from "#lib/features/organizations/member-list.svelte";
  import { getOrganizationContext } from "#lib/features/organizations/organization-context.ts";
  import { getOrganizationPeople } from "#lib/remotes/organizations.remote.ts";

  const active = getOrganizationContext();
</script>

<svelte:head>
  <title>Members | Effect template</title>
  <meta
    content="Manage Organization Members and invitations."
    name="description"
  >
</svelte:head>

<div
  class={[
    "grid gap-8",
    organizationRoleAllows(active.role, "member:invite") &&
      "lg:grid-cols-[minmax(0,1fr)_22rem]",
  ]}
>
  <MemberList
    {...(await getOrganizationPeople({
      organizationId: active.organization.id,
    }))}
  />
  {#if organizationRoleAllows(active.role, "member:invite")}
    <InviteMemberForm />
  {/if}
</div>
