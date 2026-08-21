<script lang="ts">
  import Plus from "phosphor-svelte/lib/Plus";
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
  import { createOrganizationForm } from "#lib/remotes/organizations.remote.ts";

  let created = $state(false);
  let failed = $state(false);
</script>

<Card>
  <CardHeader>
    <CardTitle>Create an Organization</CardTitle>
    <CardDescription>
      Choose a name and a URL-safe slug for the new Organization.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form
      class="grid gap-4"
      {...createOrganizationForm.enhance(async (form) => {
        created = false;
        failed = false;
        try {
          if (await form.submit()) {
            form.element.reset();
            created = true;
          }
        } catch {
          failed = true;
        }
      })}
    >
      <div class="grid gap-2">
        <Label for="organization-name">Name</Label>
        <Input
          autocomplete="organization"
          id="organization-name"
          required
          {...createOrganizationForm.fields.name.as("text")}
        />
        {#each createOrganizationForm.fields.name.issues() ?? [] as issue (issue)}
          <p class="text-xs text-destructive">{issue.message}</p>
        {/each}
      </div>

      <div class="grid gap-2">
        <Label for="organization-slug">Slug</Label>
        <Input
          autocomplete="off"
          id="organization-slug"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          placeholder="acme-labs"
          required
          {...createOrganizationForm.fields.slug.as("text")}
        />
        {#each createOrganizationForm.fields.slug.issues() ?? [] as issue (issue)}
          <p class="text-xs text-destructive">{issue.message}</p>
        {/each}
      </div>

      <Button disabled={!!createOrganizationForm.pending} type="submit">
        <Plus />
        {createOrganizationForm.pending ? "Creating…" : "Create Organization"}
      </Button>

      {#if failed}
        <p aria-live="polite" class="text-sm text-destructive">
          The Organization could not be created. Try again.
        </p>
      {:else if created}
        <p aria-live="polite" class="text-sm text-emerald-700">
          Organization created. Choose it from the list to continue.
        </p>
      {/if}
    </form>
  </CardContent>
</Card>
