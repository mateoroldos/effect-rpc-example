<script lang="ts">
  import { Button } from "#lib/components/ui/button/index.ts";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "#lib/components/ui/card/index.ts";
  import { acceptInvitationForm } from "#lib/remotes/organizations.remote.ts";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";

  let failed = $state(false);
  const redirectTo = $derived(page.url.pathname);
</script>

<svelte:head>
  <title>Accept invitation | Effect template</title>
  <meta
    content="Accept an invitation to join an Organization."
    name="description"
  >
</svelte:head>

<main class="flex min-h-screen items-center justify-center px-5 py-12">
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>Join the Organization</CardTitle>
      <CardDescription>
        Sign in with the invited email address, then accept the invitation.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <form
        {...acceptInvitationForm.enhance(async (form) => {
          failed = false;
          try {
            if (await form.submit()) {
              await goto("/", { refreshAll: true });
            }
          } catch {
            failed = true;
          }
        })}
      >
        <input
          {...acceptInvitationForm.fields.invitationId.as(
            "hidden",
            page.params.invitationId ?? ""
          )}
        >
        <Button
          class="w-full"
          disabled={!!acceptInvitationForm.pending}
          type="submit"
        >
          {acceptInvitationForm.pending ? "Accepting…" : "Accept invitation"}
        </Button>
      </form>

      {#if failed}
        <div class="space-y-3 text-sm">
          <p class="text-destructive">
            Sign in with the invited email, then try accepting again.
          </p>
          <a
            class="font-medium underline underline-offset-4"
            href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
          >
            Sign in
          </a>
        </div>
      {/if}
    </CardContent>
  </Card>
</main>
