<script lang="ts">
  import AgentDirectory from "$lib/features/agents/agent-directory/agent-directory.svelte";
  import CreateAgentForm from "$lib/features/agents/create-agent-form.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Agents | Effect template</title>
  <meta
    content="Manage Agents within the selected Organization."
    name="description"
  >
</svelte:head>

<main class="mx-auto min-h-screen w-full max-w-6xl px-5 py-12 sm:px-8">
  <header class="mb-8">
    <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">Agents</h1>
    <p class="mt-3 text-base leading-7 text-muted-foreground">
      Organization-scoped Agent management.
    </p>
  </header>

  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <AgentDirectory organizationId={data.organizationId} />
    <CreateAgentForm organizationId={data.organizationId} />
  </div>
</main>
