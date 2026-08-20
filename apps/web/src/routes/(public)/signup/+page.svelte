<script lang="ts">
  import { authClient } from "#lib/auth-client.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "#lib/components/ui/card/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import { Label } from "#lib/components/ui/label/index.ts";
  import { webOrigin } from "#lib/public-origins.ts";

  let email = $state("");
  let name = $state("");
  let password = $state("");
  let status = $state<
    "idle" | "submitting" | "invalid" | "unavailable" | "sent"
  >("idle");

  const signUp = async (event: SubmitEvent) => {
    event.preventDefault();
    status = "submitting";

    const { error } = await authClient.signUp.email({
      callbackURL: `${webOrigin}/login?verified=true`,
      email,
      name,
      password,
    });
    if (error) {
      status =
        error.status === 0 || error.status >= 500 ? "unavailable" : "invalid";
      return;
    }

    status = "sent";
  };
</script>

<svelte:head>
  <title>Create account | Effect template</title>
  <meta
    content="Create an account to manage your Organizations."
    name="description"
  >
</svelte:head>

<main class="flex min-h-screen items-center justify-center px-5 py-12">
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle
        >{status === "sent" ? "Check your email" : "Create account"}</CardTitle
      >
      <CardDescription>
        {status === "sent"
          ? "If an account can be created for that address, we sent a verification link."
          : "Verify your email before signing in."}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {#if status === "sent"}
        <a
          class="text-sm font-medium underline underline-offset-4"
          href="/login"
        >
          Return to sign in
        </a>
      {:else}
        <form class="grid gap-4" onsubmit={signUp}>
          <div class="grid gap-2">
            <Label for="name">Name</Label>
            <Input
              autocomplete="name"
              id="name"
              name="name"
              required
              bind:value={name}
            />
          </div>
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
              autocomplete="new-password"
              id="password"
              maxlength={128}
              minlength={8}
              name="password"
              required
              type="password"
              bind:value={password}
            />
          </div>

          {#if status === "invalid"}
            <p aria-live="polite" class="text-sm text-destructive">
              Check your details and try again.
            </p>
          {:else if status === "unavailable"}
            <p aria-live="polite" class="text-sm text-destructive">
              Registration is unavailable. Try again later.
            </p>
          {/if}

          <Button disabled={status === "submitting"} type="submit">
            {status === "submitting" ? "Creating account…" : "Create account"}
          </Button>
          <p class="text-center text-sm text-muted-foreground">
            Already have an account?
            <a
              class="font-medium text-foreground underline underline-offset-4"
              href="/login"
            >
              Sign in
            </a>
          </p>
        </form>
      {/if}
    </CardContent>
  </Card>
</main>
