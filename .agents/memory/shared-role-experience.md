---
name: Shared role experience
description: Shared visual system with role-specific navigation and operational landing pages
---

Cutting Operator, Production Supervisor and Manager share a visual system and
navigation component, but must have role-specific menus and landing experiences.
Operators start with operational Open jobs, Supervisors with production monitoring
and exceptions, and Managers with management oversight. Employees remains Manager-only.

**Why:** The complete-redesign brief explicitly superseded the earlier uniform
navigation requirement; the user no longer wants the administrative dashboard
shown to all three roles.

**How to apply:** Inspect existing backend policies before changing route visibility.
Do not invent unsupported routes, assignments or new permissions. A stricter UI
menu does not itself change server authorization; document differences instead
of silently changing backend policy during a design task.
