<script lang="ts">
  import type { Agent } from "@effect-template/domain/agent";
  import Robot from "phosphor-svelte/lib/Robot";
  import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "#lib/components/ui/card/index.js";

  let { agent }: { readonly agent: Agent } = $props();
</script>

<Card>
  <CardHeader class="flex-row items-center gap-4">
    <div
      class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"
    >
      <Robot class="size-5" />
    </div>
    <div class="min-w-0">
      <CardTitle class="truncate text-base">{agent.name}</CardTitle>
      <CardDescription class="truncate font-mono text-xs">
        {agent.id}
      </CardDescription>
    </div>
  </CardHeader>
</Card>
