<script lang="ts">
  import Robot from "phosphor-svelte/lib/Robot";
  import { Card, CardContent } from "$lib/components/ui/card";
  import type { AgentListItem } from "../agent-list-item";
  import AgentCard from "./agent-card.svelte";
  import CreatingAgentCard from "./creating-agent-card.svelte";

  let { items }: { readonly items: readonly AgentListItem[] } = $props();
</script>

<div class="grid gap-3">
  {#each items as item (item._tag === "Persisted" ? item.agent.id : "creating")}
    {#if item._tag === "Creating"}
      <CreatingAgentCard name={item.name} />
    {:else}
      <AgentCard agent={item.agent} />
    {/if}
  {:else}
    <Card class="border-dashed">
      <CardContent class="flex flex-col items-center py-12 text-center">
        <Robot class="mb-4 size-8 text-muted-foreground" />
        <p class="font-medium">No Agents yet</p>
        <p class="mt-1 max-w-xs text-sm text-muted-foreground">
          Create the first Agent to verify the full browser-to-database path.
        </p>
      </CardContent>
    </Card>
  {/each}
</div>
