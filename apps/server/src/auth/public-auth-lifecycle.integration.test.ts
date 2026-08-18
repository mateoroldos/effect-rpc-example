import { NodeCrypto, NodeHttpServer } from "@effect/platform-node";
import { assert, it } from "@effect/vitest";
import { EmailSender } from "@effect-template/core/email";
import { DatabasePostgres } from "@effect-template/database/postgres";
import { AgentName } from "@effect-template/domain/agent";
import { OrganizationId } from "@effect-template/domain/organization";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { Effect, Layer, Redacted, Schema } from "effect";
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import { httpServerLayer } from "../http/server.ts";
import { effectDatabaseLayer } from "../infra/database.ts";
import { PostgresPool } from "../infra/postgres-pool/index.ts";
import { agentsHandlersLayerPostgres } from "../rpc/agents.ts";
import { acquireDisposableDatabaseUrl } from "../test/disposable-postgres.ts";
import { authLayer } from "./layer.ts";

const OrganizationResponse = Schema.Struct({ id: OrganizationId });
const InvitationResponse = Schema.Struct({ id: Schema.String });
const apiBaseUrl = new URL("https://api.example.com");
const webBaseUrl = new URL("https://app.example.com");

it.effect("public authentication and Organization lifecycle", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const databaseUrl = yield* acquireDisposableDatabaseUrl;
      const sent: EmailSender.EmailMessage[] = [];
      const emailLayer = Layer.succeed(
        EmailSender.Service,
        EmailSender.Service.of({
          send: (message) =>
            Effect.sync(() => {
              sent.push(message);
            }),
        })
      );
      const serverLayer = httpServerLayer("http://localhost:5173").pipe(
        Layer.provide(agentsHandlersLayerPostgres),
        Layer.provide(
          authLayer({
            origins: {
              api: apiBaseUrl,
              cookieDomain: "example.com",
              web: webBaseUrl,
            },
            secret: Redacted.make(
              "integration-test-secret-at-least-32-characters"
            ),
          })
        ),
        Layer.provideMerge(effectDatabaseLayer),
        Layer.provide(PostgresPool.layer(databaseUrl)),
        Layer.provide(NodeCrypto.layer),
        Layer.provide(RpcSerialization.layerNdjson),
        Layer.provide(emailLayer),
        Layer.provideMerge(NodeHttpServer.layerTest)
      );

      const serverContext = yield* Layer.build(serverLayer);
      yield* Effect.gen(function* () {
        yield* DatabasePostgres.runMigrations;
        const http = yield* HttpClient.HttpClient;

        const signup = yield* authRequest(http, "/sign-up/email", {
          callbackURL: `${webBaseUrl.origin}/login?verified=true`,
          email: "ada@example.com",
          name: "Ada",
          password: "correct-horse-battery-staple",
        });
        assert.strictEqual(signup.status, 200);
        assert.isUndefined(signup.headers["set-cookie"]);
        assert.lengthOf(sent, 1);
        yield* verifyEmail(http, sent[0]);
        const ownerCookie = yield* signIn(
          http,
          "ada@example.com",
          "correct-horse-battery-staple"
        );

        const session = yield* authRequest(
          http,
          "/get-session",
          undefined,
          ownerCookie,
          "GET"
        );
        assert.strictEqual(session.status, 200);

        const organizationResponse = yield* authRequest(
          http,
          "/organization/create",
          { name: "Analytical Engines", slug: "analytical-engines" },
          ownerCookie
        );
        assert.strictEqual(organizationResponse.status, 200);
        const organization =
          yield* HttpClientResponse.schemaBodyJson(OrganizationResponse)(
            organizationResponse
          );

        const invitationResponse = yield* authRequest(
          http,
          "/organization/invite-member",
          {
            email: "grace@example.com",
            organizationId: organization.id,
            role: "member",
          },
          ownerCookie
        );
        assert.strictEqual(invitationResponse.status, 200);
        assert.lengthOf(sent, 2);
        const invitation =
          yield* HttpClientResponse.schemaBodyJson(InvitationResponse)(
            invitationResponse
          );

        const graceSignup = yield* authRequest(http, "/sign-up/email", {
          callbackURL: `${webBaseUrl.origin}/login?verified=true`,
          email: "grace@example.com",
          name: "Grace",
          password: "correct-horse-battery-staple",
        });
        assert.strictEqual(graceSignup.status, 200);
        assert.lengthOf(sent, 3);
        yield* verifyEmail(http, sent[2]);
        const graceCookie = yield* signIn(
          http,
          "grace@example.com",
          "correct-horse-battery-staple"
        );
        const accepted = yield* authRequest(
          http,
          "/organization/accept-invitation",
          { invitationId: invitation.id },
          graceCookie
        );
        assert.strictEqual(accepted.status, 200);

        const rpcProtocolLayer = RpcClient.layerProtocolHttp({
          transformClient: HttpClient.mapRequest((request) =>
            request.pipe(
              HttpClientRequest.appendUrl("/rpc"),
              HttpClientRequest.setHeader("cookie", ownerCookie)
            )
          ),
          url: "",
        }).pipe(Layer.provide(RpcSerialization.layerNdjson));
        const rpcContext = yield* Layer.build(rpcProtocolLayer);
        const created = yield* Effect.gen(function* () {
          const client = yield* RpcClient.make(AgentsRpc.group);
          return yield* client["Agents.Create"]({
            name: AgentName.make("Ada"),
            organizationId: organization.id,
          });
        }).pipe(Effect.provide(rpcContext));
        assert.strictEqual(created.organizationId, organization.id);
      }).pipe(Effect.provide(serverContext));
    })
  )
);

const authRequest = (
  http: HttpClient.HttpClient,
  path: string,
  body?: unknown,
  cookie?: string,
  method: "GET" | "POST" = "POST"
) => {
  const request = HttpClientRequest.make(method)(`/api/auth${path}`).pipe(
    HttpClientRequest.setHeader("origin", webBaseUrl.origin)
  );
  const withCookie =
    cookie === undefined
      ? request
      : HttpClientRequest.setHeader(request, "cookie", cookie);
  const withBody =
    body === undefined
      ? withCookie
      : HttpClientRequest.bodyJsonUnsafe(withCookie, body);
  return http.execute(withBody);
};

const verifyEmail = (
  http: HttpClient.HttpClient,
  message: EmailSender.EmailMessage | undefined
) =>
  Effect.gen(function* () {
    assert.isDefined(message);
    const verificationUrl = message.text.split("\n\n").at(-1);
    assert.isDefined(verificationUrl);
    const url = new URL(verificationUrl);
    yield* authRequest(
      http,
      `${url.pathname.replace("/api/auth", "")}${url.search}`,
      undefined,
      undefined,
      "GET"
    ).pipe(Effect.catch(() => Effect.void));
  });

const signIn = (http: HttpClient.HttpClient, email: string, password: string) =>
  authRequest(http, "/sign-in/email", { email, password }).pipe(
    Effect.map(requireCookie)
  );

const requireCookie = (response: HttpClientResponse.HttpClientResponse) => {
  const setCookie = response.headers["set-cookie"];
  assert.isDefined(setCookie);
  assert.include(setCookie, "Domain=example.com");
  assert.include(setCookie, "Secure");
  const [cookie] = setCookie.split(";", 1);
  assert.isDefined(cookie);
  return cookie;
};
