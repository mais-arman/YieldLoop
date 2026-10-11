---
name: Recovery verification
description: Why a logical restore must distinguish data equality from textual constraint reserialization
---

Do not approve database recovery solely because rows and sequence values match,
or relax constraint verification just to make a drill pass.

**Why:** In this environment, the PostgreSQL 17 client emitted a session setting
unsupported by the older server; after addressing that mismatch, restoration
reparsed some text-array CHECK casts differently. The strict schema comparison
therefore remained unresolved despite matching data. Text differences alone
neither prove data corruption nor establish semantic equivalence.

**How to apply:** Prefer matching client/server tools. Review equivalent-looking
constraint expressions and exercise accepted/rejected values before approving
semantic normalization. Keep the production write guard unchanged and conduct
all recovery experiments on explicitly identified isolated targets.
