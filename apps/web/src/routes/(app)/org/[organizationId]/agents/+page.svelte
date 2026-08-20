<script lang="ts">
  import { organizationRoleAllows } from "@effect-template/domain/organization";
  import AgentDirectory from "#lib/features/agents/agent-directory/agent-directory.svelte";
  import CreateAgentForm from "#lib/features/agents/create-agent-form.svelte";
  import { getOrganizationContext } from "#lib/features/organizations/organization-context.ts";

  const active = getOrganizationContext();
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

  <div
    class={[
      "grid gap-8",
      organizationRoleAllows(active.role, "agent:create") &&
        "lg:grid-cols-[minmax(0,1fr)_22rem]",
    ]}
  >
    <AgentDirectory organizationId={active.organization.id} />
    {#if organizationRoleAllows(active.role, "agent:create")}
      <CreateAgentForm organizationId={active.organization.id} />
    {/if}
  </div>
</main>
