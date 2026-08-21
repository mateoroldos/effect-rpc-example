import { RpcGroup } from "effect/unstable/rpc";
import { AgentsRpc } from "../agents/index.ts";
import { OrganizationsRpc } from "../organizations/index.ts";

/** The complete RPC contract served by the application. */
export const group = RpcGroup.make()
  .merge(AgentsRpc.group)
  .merge(OrganizationsRpc.group);
