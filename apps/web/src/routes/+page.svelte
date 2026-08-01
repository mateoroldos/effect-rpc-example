<script lang="ts">
  import AgentDirectory from "$lib/features/agents/agent-directory/agent-directory.svelte";
  import CreateAgentForm from "$lib/features/agents/create-agent-form.svelte";
</script>

<svelte:head>
  <title>Agents | Effect template</title>
  <meta
    content="Create and inspect Agents through Effect RPC."
    name="description"
  >
</svelte:head>

<div class="mx-auto min-h-screen w-full max-w-5xl px-5 py-12 sm:px-8">
  <header class="mb-10 max-w-2xl space-y-3">
    <div
      class="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm"
    >
      <span class="size-1.5 rounded-full bg-emerald-500"></span>
      Effect RPC · Svelte remote functions
    </div>
    <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
      Agent directory
    </h1>
    <p class="text-base leading-7 text-muted-foreground">
      A small frontend boundary over the typed Agents RPC. Create an Agent here
      and the remote function refreshes the directory in the same request.
    </p>
  </header>

  <main class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <AgentDirectory />
    <CreateAgentForm />
  </main>
</div>
