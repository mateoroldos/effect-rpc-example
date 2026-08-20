<script lang="ts">
  import {
    type Organization,
    type OrganizationRole,
    organizationRoleAllows,
  } from "@effect-template/domain/organization";
  import type { Snippet } from "svelte";
  import { setOrganizationContext } from "./organization-context.ts";

  let {
    children,
    organization,
    role,
  }: {
    children: Snippet;
    organization: Organization;
    role: OrganizationRole;
  } = $props();

  setOrganizationContext({
    get organization() {
      return organization;
    },
    get role() {
      return role;
    },
  });
</script>

<svelte:head>
  <title>{organization.name} | Effect template</title>
  <meta
    content={`Manage Agents and Members in ${organization.name}.`}
    name="description"
  >
</svelte:head>

<main class="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
  <header class="border-b border-border pb-6">
    <p class="text-sm text-muted-foreground">Organization</p>
    <h1 class="mt-1 text-3xl font-semibold tracking-tight">
      {organization.name}
    </h1>
    <nav aria-label="Organization" class="mt-5 flex gap-4 text-sm">
      <a
        class="underline-offset-4 hover:underline"
        href={`/org/${organization.id}`}
      >
        Overview
      </a>
      <a
        class="underline-offset-4 hover:underline"
        href={`/org/${organization.id}/agents`}
      >
        Agents
      </a>
      {#if organizationRoleAllows(role, "member:read")}
        <a
          class="underline-offset-4 hover:underline"
          href={`/org/${organization.id}/members`}
        >
          Members
        </a>
      {/if}
    </nav>
  </header>

  <div class="pt-8">{@render children()}</div>
</main>
