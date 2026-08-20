<script lang="ts">
  import type { OrganizationId } from "@effect-template/domain/organization";
  import ArrowClockwise from "phosphor-svelte/lib/ArrowClockwise";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "#lib/components/ui/alert/index.js";
  import { Button } from "#lib/components/ui/button/index.js";
  import { Skeleton } from "#lib/components/ui/skeleton/index.js";
  import { getAgents } from "#lib/remotes/agents.remote.js";
  import AgentGrid from "./agent-grid.svelte";

  let { organizationId }: { organizationId: OrganizationId } = $props();
</script>

<section aria-labelledby="agents-heading" class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="font-semibold" id="agents-heading">Agents</h2>
      <p class="text-sm text-muted-foreground">Backed by PostgreSQL</p>
    </div>
    <Button
      aria-label="Refresh Agents"
      onclick={() => getAgents({ organizationId }).refresh()}
      size="icon-sm"
      variant="outline"
    >
      <ArrowClockwise />
    </Button>
  </div>

  <svelte:boundary>
    {#snippet pending()}
      <div class="grid gap-3">
        <Skeleton class="h-24 w-full" />
        <Skeleton class="h-24 w-full" />
      </div>
    {/snippet}

    {#snippet failed(_error: unknown, reset: () => void)}
      <Alert variant="destructive">
        <AlertTitle>Agents could not be loaded</AlertTitle>
        <AlertDescription class="mt-2">
          Check that the API server is running, then try again.
          <Button class="mt-4" onclick={reset} size="sm" variant="outline">
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    {/snippet}

    <AgentGrid items={await getAgents({ organizationId })} />
  </svelte:boundary>
</section>
