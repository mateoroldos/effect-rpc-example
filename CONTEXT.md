# effect-template context

The project's ubiquitous language — what the words mean here. Use them exactly,
in code, comments, and conversation. When you add or rename a concept, update
this file in the same change.

## Language

### Domain

**Agent**:
A registered AI agent with a stable identity
_Avoid_: Bot, Entity, Record

### Conventions

Recurring role names. A new capability reuses them. `check` enforces the
generic ones (`rules/no-vague-names.grit`): a class/interface/type named
`*Repository`, `*Registry`, `*Manager`, `*Processor`, `*Helper`, or `*DAO` is a
lint error.

**Directory**:
A service that owns a collection and the policy over it. Here, the registry of
Agents — not a filesystem.
_Avoid_: Registry, Manager, Repository

**Store**:
The persistence boundary a service depends on to remember its data. The Store
remembers; the service decides.
_Avoid_: Repository, DAO, Persistence
