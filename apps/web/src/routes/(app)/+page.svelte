<script lang="ts">
  import CreateOrganizationForm from "#lib/features/organizations/create-organization-form.svelte";
  import OrganizationList from "#lib/features/organizations/organization-list.svelte";
</script>

<svelte:head>
  <title>Organizations | Effect template</title>
  <meta content="Choose or create an Organization." name="description">
</svelte:head>

<main class="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
  <header class="max-w-2xl">
    <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
      Organizations
    </h1>
    <p class="mt-4 text-base leading-7 text-muted-foreground">
      Choose the Organization whose Agents and Members you want to manage.
    </p>
  </header>

  <div class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <svelte:boundary>
      {#snippet pending()}
        <p class="text-sm text-muted-foreground">Loading Organizations…</p>
      {/snippet}
      {#snippet failed(_error: unknown, reset: () => void)}
        <div class="space-y-3">
          <p class="text-sm text-destructive">
            Organizations could not be loaded.
          </p>
          <button class="text-sm underline" onclick={reset} type="button">
            Try again
          </button>
        </div>
      {/snippet}
      <OrganizationList />
    </svelte:boundary>

    <CreateOrganizationForm />
  </div>
</main>
