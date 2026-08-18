<script lang="ts">
  import { goto } from "$app/navigation";
  import { authClient } from "$lib/auth-client.ts";
  import { Button } from "$lib/components/ui/button/index.ts";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.ts";
  import { Input } from "$lib/components/ui/input/index.ts";
  import { Label } from "$lib/components/ui/label/index.ts";

  let email = $state("");
  let password = $state("");
  let status = $state<"idle" | "submitting" | "invalid" | "unavailable">(
    "idle"
  );

  const signIn = async (event: SubmitEvent) => {
    event.preventDefault();
    status = "submitting";

    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      status = error.status === 401 ? "invalid" : "unavailable";
      return;
    }

    await goto("/", { invalidateAll: true });
  };
</script>

<svelte:head>
  <title>Sign in | Effect template</title>
  <meta content="Sign in to manage your Organizations." name="description">
</svelte:head>

<main class="flex min-h-screen items-center justify-center px-5 py-12">
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>Sign in</CardTitle>
      <CardDescription>Use your verified email to continue.</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="grid gap-4" onsubmit={signIn}>
        <div class="grid gap-2">
          <Label for="email">Email</Label>
          <Input
            autocomplete="email"
            id="email"
            name="email"
            required
            type="email"
            bind:value={email}
          />
        </div>
        <div class="grid gap-2">
          <Label for="password">Password</Label>
          <Input
            autocomplete="current-password"
            id="password"
            minlength={8}
            name="password"
            required
            type="password"
            bind:value={password}
          />
        </div>

        {#if status === "invalid"}
          <p aria-live="polite" class="text-sm text-destructive">
            The email or password is incorrect.
          </p>
        {:else if status === "unavailable"}
          <p aria-live="polite" class="text-sm text-destructive">
            Sign in is unavailable. Try again later.
          </p>
        {/if}

        <Button disabled={status === "submitting"} type="submit">
          {status === "submitting" ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </CardContent>
  </Card>
</main>
