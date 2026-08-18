import type { Principal, User } from "@effect-template/domain/identity";

declare global {
  // biome-ignore lint/style/noNamespace: SvelteKit requires the global App namespace for framework type augmentation.
  namespace App {
    interface Locals {
      principal: Principal | undefined;
      user: User | undefined;
    }
  }
}
