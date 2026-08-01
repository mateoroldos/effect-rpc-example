<script lang="ts">
  import ArrowClockwise from "phosphor-svelte/lib/ArrowClockwise";
  import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";

  let { name }: { readonly name: string } = $props();
</script>

<Card class="border-dashed opacity-70">
  <CardHeader class="flex-row items-center gap-4">
    <div
      class="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
    >
      <ArrowClockwise class="size-5 motion-safe:animate-spin" />
    </div>
    <div class="min-w-0">
      <CardTitle class="truncate text-base">{name}</CardTitle>
      <CardDescription>Creating Agent…</CardDescription>
    </div>
  </CardHeader>
</Card>
