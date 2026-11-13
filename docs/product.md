# Product scope

## Customer

Enterprise employees who report time against projects, and managers who need a clear weekly account of hours and delivered work. Teams may also use agents to execute tasks, but a human remains accountable for acceptance and time reporting.

## Primary surface

A compact calendar connects planned work to actual time. Desktop uses a week view; phones use a day agenda. A weekly timesheet provides project totals and concise descriptions without requiring many filters.

## Time reporting

An employee can enter a duration manually or start and stop a timer. Each entry includes date, project, task when applicable, duration and work summary. Store duration as integer minutes. Do not infer labor from scheduled time, task completion or agent activity. Warn about overlapping entries and unusually large totals; never silently change reported time.

Weekly timesheets move Draft → Submitted → Approved, or Returned → Draft. Submission captures a version of entries and totals. Submitted and approved entries cannot be silently edited; changes require returning or reopening the timesheet with a recorded reason. The employee cannot approve their own sheet. Task review is a separate workflow.

Employees can export project/date/duration/summary information. Managers can review only the teams they are authorized to access. Payroll integrations, invoicing and legal compliance claims are outside the initial scope.

## Human and agent work

Tasks move Planned → Working → Needs review → Done, with Needs attention for uncertain runs. Agent runtime, model usage and employee labor remain separate. Employees may log time spent directing or reviewing an agent, but agent execution never creates employee hours automatically.

## Privacy

No screenshots, keystroke logging or inferred productivity scores. Actual customer data requires authentication, tenant isolation, access controls and durable storage. The public repository and demonstration use synthetic data only.

## Calendar and accessibility

Week/month navigation, phone agenda and unscheduled queue. Every drag action has a keyboard-accessible edit alternative. Workspace timezone and week boundaries must be explicit. Preserve local work dates separately from UTC execution timestamps.
