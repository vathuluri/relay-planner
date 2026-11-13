# Architecture outline

## Components

React/Next.js serves the calendar, task editor and review queue. PostgreSQL stores workspace-owned plans, occurrences, execution attempts and events. A worker materializes recurring occurrences and detects expired leases. External runners execute work; an MCP adapter calls the same application service as the UI and API.

Authentication and tenant authorization must be implemented before private customer data or external agent access is enabled. The demo is a separate read-only synthetic workspace.

## Records

- Workspace: timezone, members and workspace policy.
- Project: grouping and calendar color.
- Actor: human member or workspace-scoped agent connection.
- Plan: reusable instructions, acceptance criteria, owner, schedule and review policy.
- Occurrence: one scheduled instance, including the local recurrence identity.
- Execution attempt: claim token, lease expiry, actual timestamps, result and recovery status.
- Activity event: append-only actor, action, timestamp and relevant record IDs.

An occurrence may have several execution attempts, but at most one current unexpired claim. Enforce this with a transaction and conditional update. Validate the claim token on heartbeat and agent-owned state changes.

## Initial API operations

Suggested paths, subject to implementation:

| Operation | Route |
| --- | --- |
| List calendar occurrences | GET /api/v1/occurrences |
| Create a plan | POST /api/v1/plans |
| Reschedule an occurrence | PATCH /api/v1/occurrences/:id |
| Claim assigned work | POST /api/v1/occurrences/:id/claims |
| Renew an execution lease | POST /api/v1/attempts/:id/heartbeat |
| Report progress or results | POST /api/v1/attempts/:id/events |
| Request human review | POST /api/v1/attempts/:id/review-request |
| Record a review decision | POST /api/v1/occurrences/:id/reviews |

Mutations accept an idempotency key scoped to actor and workspace. Reusing a key with a different payload returns a conflict. Workspace access is derived from authenticated membership, not trusted from request fields. Agent tokens are revocable, narrowly scoped and stored as hashes.

## Recovery and side effects

A heartbeat expiry marks an attempt uncertain. Pause dispatch for that occurrence until the prior result is reconciled or an authorized owner chooses recovery. A claim lock alone cannot guarantee exactly-once behavior in GitHub or another external service. Record external operation identifiers and require idempotent handlers or human confirmation before repeating those operations.

## Scheduling

Materialize occurrences with a unique plan-and-recurrence identity to prevent duplicate scheduling after worker restarts. Specify daylight-saving handling before enabling recurring schedules. Changing future occurrences must preserve completed work and recorded review decisions.

## Validation milestones

Test tenant isolation, concurrent claims, lease-token fencing, idempotency conflicts, recurrence across daylight-saving changes, review authorization and interrupted side-effect recovery. Use fake runners and synthetic artifacts without paid APIs.
