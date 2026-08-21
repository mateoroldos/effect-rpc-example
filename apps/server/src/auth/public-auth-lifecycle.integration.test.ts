import { NodeCrypto, NodeHttpServer } from "@effect/platform-node";
import { assert, it } from "@effect/vitest";
import { AgentDirectory } from "@effect-template/core/agent-directory";
import { EmailSender } from "@effect-template/core/email";
import { OrganizationDirectory } from "@effect-template/core/organization-directory";
import { AgentStorePostgres } from "@effect-template/database/agents/postgres";
import { DatabasePostgres } from "@effect-template/database/postgres";
import { AgentName } from "@effect-template/domain/agent";
import {
  OrganizationName,
  OrganizationSlug,
} from "@effect-template/domain/organization";
import { AppRpc } from "@effect-template/rpc/rpc";
import { Effect, Layer, Redacted } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  type HttpClientResponse,
} from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import { httpServerLayer } from "../http/server.ts";
import { effectDatabaseLayer } from "../infra/database.ts";
import { PostgresPool } from "../infra/postgres-pool/index.ts";
import { agentsHandlersLayer } from "../rpc/agents.ts";
import { organizationsHandlersLayer } from "../rpc/organizations.ts";
import { acquireDisposableDatabaseUrl } from "../test/disposable-postgres.ts";
import { authLayer } from "./layer.ts";

const rpcHandlersLayer = Layer.merge(
  agentsHandlersLayer.pipe(
    Layer.provide(AgentDirectory.layerWithoutDependencies),
    Layer.provide(AgentStorePostgres.layer)
  ),
  organizationsHandlersLayer.pipe(Layer.provide(OrganizationDirectory.layer))
);
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
      const serverLayer = httpServerLayer(webBaseUrl.origin).pipe(
        Layer.provide(rpcHandlersLayer),
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

        const ownerClient = yield* makeRpcClient(ownerCookie);
        const organization = yield* ownerClient["Organizations.Create"]({
          name: OrganizationName.make("Analytical Engines"),
          slug: OrganizationSlug.make("analytical-engines"),
        });
        yield* ownerClient["Members.Invite"]({
          email: "grace@example.com",
          organizationId: organization.id,
          role: "member",
        });
        assert.lengthOf(sent, 2);
        const people = yield* ownerClient["Members.List"]({
          organizationId: organization.id,
        });
        const invitation = people.invitations.find(
          ({ email }) => email === "grace@example.com"
        );
        assert.isDefined(invitation);

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
        const graceClient = yield* makeRpcClient(graceCookie);
        yield* graceClient["Invitations.Accept"]({
          invitationId: invitation.id,
        });

        const created = yield* ownerClient["Agents.Create"]({
          name: AgentName.make("Ada"),
          organizationId: organization.id,
        });
        assert.strictEqual(created.organizationId, organization.id);
      }).pipe(Effect.provide(serverContext));
    })
  )
);

const makeRpcClient = Effect.fn("PublicAuthLifecycle.makeRpcClient")(function* (
  cookie: string
) {
  const protocol = yield* Layer.build(
    RpcClient.layerProtocolHttp({
      transformClient: HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.appendUrl("/rpc"),
          HttpClientRequest.setHeader("cookie", cookie)
        )
      ),
      url: "",
    }).pipe(Layer.provide(RpcSerialization.layerNdjson))
  );
  return yield* RpcClient.make(AppRpc.group).pipe(Effect.provide(protocol));
});

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
    const response = yield* authRequest(
      http,
      `${url.pathname.replace("/api/auth", "")}${url.search}`,
      undefined,
      undefined,
      "GET"
    ).pipe(
      Effect.provideService(FetchHttpClient.RequestInit, {
        redirect: "manual",
      })
    );
    assert.strictEqual(response.status, 302);
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
