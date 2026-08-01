<script lang="ts">
  import Plus from "phosphor-svelte/lib/Plus";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { createAgent, getAgents } from "$lib/remotes/agents.remote";

  let created = $state(false);
  let createError = $state<string | null>(null);
</script>

<Card class="lg:sticky lg:top-8">
  <CardHeader>
    <CardTitle>Create an Agent</CardTitle>
    <CardDescription>
      Names are trimmed and validated by the shared domain Schema.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form
      class="grid gap-4"
      {...createAgent.enhance(async (form) => {
        created = false;
        createError = null;
        const name = form.fields.name.value()?.trim();

        try {
          const submitted = name
            ? await form
                .submit()
                .updates(
                  getAgents().withOverride((items) => [
                    { _tag: "Creating", name },
                    ...items,
                  ]),
                )
            : await form.submit();

          if (submitted) {
            form.element.reset();
            created = true;
          }
        } catch {
          createError = "The Agent could not be created.";
        }
      })}
    >
      <div class="grid gap-2">
        <Label for="agent-name">Name</Label>
        <Input
          autocomplete="off"
          id="agent-name"
          placeholder="Ada"
          required
          {...createAgent.fields.name.as("text")}
        />
        {#each createAgent.fields.name.issues() ?? [] as issue (issue)}
          <p class="text-xs text-destructive">{issue.message}</p>
        {/each}
      </div>

      <Button disabled={!!createAgent.pending} type="submit">
        <Plus />
        {createAgent.pending ? "Creating…" : "Create Agent"}
      </Button>

      {#if createError}
        <Alert role="alert" variant="destructive">
          <AlertTitle>Agent could not be created</AlertTitle>
          <AlertDescription>{createError}</AlertDescription>
        </Alert>
      {:else if created}
        <p aria-live="polite" class="text-sm text-emerald-700">
          Agent created successfully.
        </p>
      {/if}
    </form>
  </CardContent>
</Card>
