<script lang="ts">
  import InviteMemberForm from "#lib/features/organizations/invite-member-form.svelte";
  import MemberList from "#lib/features/organizations/member-list.svelte";
  import { getOrganizationPeople } from "#lib/remotes/organizations.remote.ts";
  import { page } from "$app/state";
</script>

<svelte:head>
  <title>Members | Effect template</title>
  <meta
    content="Manage Organization Members and invitations."
    name="description"
  >
</svelte:head>

<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
  <MemberList
    {...(await getOrganizationPeople({
      organizationId: page.params.organizationId ?? "",
    }))}
  />
  <InviteMemberForm />
</div>
