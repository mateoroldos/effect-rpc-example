import type { User } from "@effect-template/domain/identity";

declare global {
  // biome-ignore lint/style/noNamespace: SvelteKit requires the global App namespace for framework type augmentation.
  namespace App {
    interface Locals {
      user: User | undefined;
    }
  }
}
