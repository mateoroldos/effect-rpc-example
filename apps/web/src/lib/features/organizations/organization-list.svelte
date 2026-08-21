<script lang="ts">
  import ArrowRight from "phosphor-svelte/lib/ArrowRight";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "#lib/components/ui/card/index.ts";
  import { getOrganizations } from "#lib/remotes/organizations.remote.ts";

  const organizations = $derived(await getOrganizations());
</script>

<section aria-labelledby="organizations-heading" class="space-y-4">
  <div>
    <h2 class="font-semibold" id="organizations-heading">Your Organizations</h2>
    <p class="text-sm text-muted-foreground">
      Choose an Organization to manage its resources.
    </p>
  </div>

  {#if organizations.length === 0}
    <Card>
      <CardHeader>
        <CardTitle>No Organizations yet</CardTitle>
        <CardDescription>
          Create one to start organizing Agents and Members.
        </CardDescription>
      </CardHeader>
    </Card>
  {:else}
    <div class="grid gap-3">
      {#each organizations as organization (organization.id)}
        <a href={`/org/${organization.id}`}>
          <Card class="transition-colors hover:bg-muted/50">
            <CardContent class="flex items-center justify-between py-5">
              <div class="min-w-0">
                <p class="truncate font-medium">{organization.name}</p>
                <p class="truncate text-sm text-muted-foreground">
                  {organization.slug}
                </p>
              </div>
              <ArrowRight aria-hidden="true" />
            </CardContent>
          </Card>
        </a>
      {/each}
    </div>
  {/if}
</section>
