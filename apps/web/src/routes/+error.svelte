<script lang="ts">
  import ArrowClockwise from "phosphor-svelte/lib/ArrowClockwise";
  import WarningCircle from "phosphor-svelte/lib/WarningCircle";
  import { Button } from "#lib/components/ui/button/index.js";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "#lib/components/ui/card/index.js";
  import { page } from "$app/state";

  const serviceUnavailable = $derived(page.status === 503);
</script>

<svelte:head>
  <title>
    {serviceUnavailable ? "Service unavailable" : "Something went wrong"}
    | Effect template
  </title>
</svelte:head>

<main class="grid min-h-screen place-items-center px-5 py-12">
  <Card class="w-full max-w-md">
    <CardHeader>
      <div
        class="mb-2 grid size-10 place-items-center rounded-lg bg-destructive/10 text-destructive"
      >
        <WarningCircle class="size-5" />
      </div>
      <CardTitle>
        {serviceUnavailable
          ? "The service is temporarily unavailable"
          : "Something went wrong"}
      </CardTitle>
      <CardDescription>
        {serviceUnavailable
          ? "We could not complete this request. Try again in a moment."
          : "An unexpected error prevented us from completing this request."}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <Button onclick={() => location.reload()}>
        <ArrowClockwise />
        Try again
      </Button>
      <p class="text-xs text-muted-foreground">Error {page.status}</p>
    </CardContent>
  </Card>
</main>
