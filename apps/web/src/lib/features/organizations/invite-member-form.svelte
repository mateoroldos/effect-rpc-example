<script lang="ts">
  import { assignableOrganizationRoles } from "@effect-template/domain/organization";
  import { isHttpError } from "@sveltejs/kit";
  import PaperPlaneTilt from "phosphor-svelte/lib/PaperPlaneTilt";
  import { Button } from "#lib/components/ui/button/index.ts";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "#lib/components/ui/card/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import { Label } from "#lib/components/ui/label/index.ts";
  import { getOrganizationContext } from "#lib/features/organizations/organization-context.ts";
  import { inviteMemberForm } from "#lib/remotes/organizations.remote.ts";

  const active = getOrganizationContext();
  const roles = $derived(assignableOrganizationRoles[active.role]);
  let sent = $state(false);
  let failed = $state<string | null>(null);
</script>

<Card class="lg:sticky lg:top-8">
  <CardHeader>
    <CardTitle>Invite a Member</CardTitle>
    <CardDescription>
      They receive a link that joins this Organization.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form
      class="grid gap-4"
      {...inviteMemberForm.enhance(async (form) => {
        sent = false;
        failed = null;
        try {
          if (await form.submit()) {
            form.element.reset();
            sent = true;
          }
        } catch (cause) {
          failed = isHttpError(cause)
            ? cause.body.message
            : "The invitation could not be sent. Try again later.";
        }
      })}
    >
      <input
        {...inviteMemberForm.fields.organizationId.as(
          "hidden",
          active.organization.id
        )}
      >
      <div class="grid gap-2">
        <Label for="invite-email">Email</Label>
        <Input
          autocomplete="email"
          id="invite-email"
          placeholder="grace@example.com"
          required
          {...inviteMemberForm.fields.email.as("email")}
        />
        {#each inviteMemberForm.fields.email.issues() ?? [] as issue (issue)}
          <p class="text-xs text-destructive">{issue.message}</p>
        {/each}
      </div>

      <div class="grid gap-2">
        <Label for="invite-role">Role</Label>
        <select
          class="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
          id="invite-role"
          {...inviteMemberForm.fields.role.as("select", "member")}
        >
          {#each roles as role (role)}
            <option value={role}>{role}</option>
          {/each}
        </select>
      </div>

      <Button disabled={!!inviteMemberForm.pending} type="submit">
        <PaperPlaneTilt />
        {inviteMemberForm.pending ? "Sending…" : "Send invitation"}
      </Button>

      {#if failed}
        <p aria-live="polite" class="text-sm text-destructive">
          {failed}
        </p>
      {:else if sent}
        <p aria-live="polite" class="text-sm text-emerald-700">
          Invitation sent.
        </p>
      {/if}
    </form>
  </CardContent>
</Card>
