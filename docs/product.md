# Product scope

## Customer and use case

People coordinating work performed by themselves and multiple agent systems need one calendar and a clear handoff between planning, execution and review. The first customer will use the product privately; portfolio visitors see a separate fictional workspace.

## Calendar

Week view is the desktop default, with month navigation and an unscheduled queue. Phones open a day agenda with a date strip. Tasks show a title, owner, planned time and status. Projects supply a restrained color marker. Keep filters secondary and avoid large empty cards.

Every drag operation has an accessible edit/reschedule alternative. Timezones are explicit. Store instants in UTC, recurrence rules in the workspace's IANA timezone, and all-day dates as local dates rather than midnight UTC.

## Task lifecycle

Planned → Working → Needs review → Done.

Tasks can also be canceled or marked Needs attention. An expired agent lease leads to Needs attention; it does not prove that the agent stopped or that an external action failed. Completed occurrences remain historical records when recurring plans change.

## Ownership and review

Each task has one accountable human or agent owner. A reviewer can differ from that owner. Instructions include acceptance criteria and allowed actions. An agent submits evidence and a result summary; where approval is required, only an authorized reviewer completes the handoff. Publishing and applying changes remain separate recorded actions.

## First integration

Connect one runner through the API. It can list its assignments, claim a task, send a heartbeat, report progress, attach a result link and request review. Add MCP as an adapter after this flow works. Later providers can include Codex, Claude and other agents without product logic depending on any particular model.

## Out of scope initially

Social-network publishing, billing, autonomous agent provisioning, embedded model execution, replacing existing runner schedulers, and broad third-party integrations.
