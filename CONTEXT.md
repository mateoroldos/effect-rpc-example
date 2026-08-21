# effect-template context

The project's ubiquitous language — what the words mean here. Use them exactly,
in code, comments, and conversation. When you add or rename a concept, update
this file in the same change.

## Language

### Domain

**Agent**:
A registered AI agent with a stable identity that belongs to one Organization
_Avoid_: Bot, Entity, Record

**User**:
A person whose identity is managed by Better Auth
_Avoid_: Account, Identity

**Principal**:
The authenticated User identity used to authorize an application operation
_Avoid_: Session, Actor

**Organization**:
A tenant that owns Agents and has Members
_Avoid_: Tenant, Workspace, Team

**Member**:
A User's membership in one Organization
_Avoid_: Membership, OrganizationUser

**Invitation**:
A request for a User identified by email to become a Member of one Organization
_Avoid_: Invite, MembershipRequest

**Organization Role**:
A named set of Organization Permissions assigned to a Member
_Avoid_: Group, AccessLevel

**Organization Permission**:
A named application action controlled by an Organization Role
_Avoid_: Scope, Privilege, Capability

**Authorization**:
The request-scoped capability that requires the current caller to hold an
Organization Permission
_Avoid_: Authorizer, OrganizationAccess, AccessManager, PermissionChecker

### Conventions

Recurring role names. A new capability reuses them. `check` enforces the
generic ones (`rules/no-vague-names.grit`): a class/interface/type named
`*Repository`, `*Registry`, `*Manager`, `*Processor`, `*Helper`, or `*DAO` is a
lint error.

**Directory**:
A service that owns a collection and the policy over it. Here, the directories
of Agents and Organizations — not filesystems.
_Avoid_: Registry, Manager, Repository, Service

**Store**:
The persistence boundary a service depends on to remember its data. The Store
remembers; the service decides.
_Avoid_: Repository, DAO, Persistence
