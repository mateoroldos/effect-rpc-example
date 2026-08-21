<script lang="ts">
  import type {
    OrganizationInvitation,
    OrganizationMember,
  } from "@effect-template/domain/organization";

  let {
    invitations,
    members,
  }: {
    invitations: readonly OrganizationInvitation[];
    members: readonly OrganizationMember[];
  } = $props();

  const pendingInvitations = $derived(
    invitations.filter(({ status }) => status === "pending")
  );
</script>

<div class="space-y-8">
  <section aria-labelledby="members-heading" class="space-y-4">
    <h2 class="font-semibold" id="members-heading">Members</h2>
    <ul class="grid gap-3">
      {#each members as member (member.user.id)}
        <li
          class="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
        >
          <span class="min-w-0">
            <span class="block truncate font-medium">{member.user.name}</span>
            <span class="block truncate text-sm text-muted-foreground">
              {member.user.email}
            </span>
          </span>
          <span class="text-sm capitalize text-muted-foreground">
            {member.role}
          </span>
        </li>
      {/each}
    </ul>
  </section>

  {#if pendingInvitations.length > 0}
    <section aria-labelledby="invitations-heading" class="space-y-4">
      <h2 class="font-semibold" id="invitations-heading">
        Pending invitations
      </h2>
      <ul class="grid gap-3">
        {#each pendingInvitations as invitation (invitation.id)}
          <li
            class="flex items-center justify-between gap-4 rounded-lg border border-dashed border-border p-4"
          >
            <span class="min-w-0 truncate text-sm">{invitation.email}</span>
            <span class="text-sm capitalize text-muted-foreground">
              {invitation.role}
            </span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
