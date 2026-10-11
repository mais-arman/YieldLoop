# YieldLoop — current application inventory

Audit date: 2026-10-11. Read-only audit; only this report is written.

## 1. Executive summary

17 explicit URL patterns (including root redirect and public health), plus authenticated wildcard fallback, implemented through 16 page modules; reports.tsx supplies both Dashboard and Reports. Significant embedded material, plan/history and account workflows are not independent routes. Shared styling does not imply shared role permissions. Core weight accounting and the two persisted demonstration cases are present. Rework and usable offcut consumption are missing; live AI remains unavailable according to prior verification, not a new provider probe. 3D is a conceptual extra.

Evidence legend: **C** observed in current code; **D** verified by current read-only database query; **T-prior** existing automated-test/browser evidence from docs/complete-ui-redesign.md and prior work, not re-executed; **U** not independently established in this audit; **R** recommendation. This audit did not sign in, create sessions/accounts, run mutating tests or operate production controls. Source inspection cannot prove every runtime handler works.

## 2. Complete route inventory

All paths below are registered in src/App.tsx except query parameters, which select state rather than register another route. O=Operator, S=Supervisor, M=Manager. Normal routes require an active authenticated account; forced password change intercepts them.

|Path|Component|Access and protection|Status|
|---|---|---|---|
|/login|login.tsx|Public; authenticated redirects home|Implemented; runtime scope as detailed below|
|/jobs|jobs.tsx|O,S,M; O Open only|Implemented; runtime scope as detailed below|
|/jobs/new|job-new.tsx|M only; backend creator check|Implemented; runtime scope as detailed below|
|/jobs/:id|job-detail.tsx|O Open; S,M all visible statuses|Implemented; runtime scope as detailed below|
|/inventory|inventory.tsx|O scoped Open-job lots; S,M broader|Implemented; runtime scope as detailed below|
|/inventory/:id|inventory-detail.tsx|Scoped as inventory; backend object visibility|Implemented; runtime scope as detailed below|
|/reports|reports.tsx|UI S,M; API also O with Open scope|Implemented; runtime scope as detailed below|
|/comparison?left=:id&right=:id|comparison.tsx|UI S,M; API existing job visibility also O|Implemented; runtime scope as detailed below|
|/cutting|cutting-entry.tsx|O,S,M view accessible jobs|Implemented; runtime scope as detailed below|
|/jobs/:id/cutting|cutting-studio.tsx|O view only Open; M edit Draft/Open; S edit Open|Implemented; runtime scope as detailed below|
|/assistant?job_id=:id|assistant.tsx|O,S,M authorized job scope; no primary sidebar link|Implemented; runtime scope as detailed below|
|/employees|employees.tsx|M only frontend and backend|Implemented; runtime scope as detailed below|
|/password|password.tsx|All authenticated; forced-change gate supersedes other routes|Implemented; runtime scope as detailed below|
|/packaging|packaging.tsx|All authenticated direct; only S,M sidebar; no production entity|Implemented; runtime scope as detailed below|
|/health|connectivity.tsx|Public route bypasses Protected despite role-access health entry|Implemented; runtime scope as detailed below|
|* (authenticated fallback)|not-found.tsx|Unknown authenticated paths; anonymous redirects login|Implemented; runtime scope as detailed below|
|/|Redirect|Role home: O /jobs; S,M /dashboard|Registered redirect|
|/dashboard|DashboardPage in reports.tsx|O redirects /jobs; S,M frontend; underlying report API also scopes O|Implemented|

/login redirects authenticated users home. /password takes precedence when required. Forbidden is an inline localized Access restricted state, not a URL. Material recording lives at /jobs/:id#materials; saved plans/history are cutting-workspace state, not additional routes. No standalone Materials, catalogue administration, tenant, signup, assigned-jobs, settings or historical-report page was found. Assistant and comparison are contextual routes, not sidebar items. /health remains public even though the presentation policy lists Manager: actual Router order wins.

## 3. Cutting Operator page inventory

Sidebar order: **My Work → Cutting Studio → Inventory**. Home /jobs. Accessible detail pages: Open job card/materials, Open-job cutting read-only, permitted lot details, contextual evidence; password/account. Packaging is directly reachable but omitted from primary navigation. /dashboard redirects home; /reports and /comparison show frontend denial; /employees and /jobs/new denied with corresponding backend protection. Operator needs recording, corrections and balanced closure—not management aggregate dashboards. See page sections for exact controls/copy; only Open records are returned by job scope.

## 4. Production Supervisor page inventory

Sidebar order: **Production Overview → Production Jobs → Inventory → Reports → Cutting Studio → Packaging**. Home /dashboard emphasizes exceptions before indicators and omits Manager composition charts. Accessible job/material details, comparison, evidence, lot history and password. Can open Draft jobs, record/correct/close Open jobs, register/void eligible lots and edit Open cutting plans. Cannot create jobs, create material definitions or manage employees. The optional Packaging menu introduces non-core complexity.

## 5. Manager page inventory

Sidebar order: **Dashboard → Production Jobs → Inventory → Reports → Cutting Studio → Packaging → Employees**. Home /dashboard. Also /jobs/new, job/material details, comparison, evidence, inventory details, account/password; Manager creates definitions through existing material picker and selects machines through supported job controls. No separate material-administration page. Dashboard material weights require a selected material; count cards are not fake trends.

## 6. Exact English and Arabic interface copy

Per-page static translation references are reproduced in section 7, with the full exact bilingual source catalogue in Appendix A. Templates retain placeholders verbatim. Shared dialogs/components use that catalogue; not every catalogue entry is currently rendered. In particular legacy freshness/expanded-definition wording can remain in translation objects despite removal from the mounted UI. Dynamic record text (names, notes, machine names, reasons) is not translated; no private employee data is reproduced. Static extraction cannot establish every conditional message was visible in a browser.

## 7. Page layouts, elements and interaction behavior

Shared shell: navy desktop sidebar with remembered collapse; mobile drawer; account dropdown with identity/role, English/العربية, password and sign out. Normal content max width 6xl; wide cutting/packaging workspace up to 1680px. White surfaces, teal actions, localized status indicators. Tables may scroll within their containers. RTL uses logical spacing and directional arrows. Loading skeletons, retry/errors and permission states are conditional. Page templates below distinguish implementation paths from prior exercised controls.

## Page: Sign in

- Route: /login
- Purpose: Core secure entry; no public registration.
- Actors allowed: Public; authenticated redirects home
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/login.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on auth/csrf GET; auth/login POST; auth/me GET.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|signIn|Sign in|artifacts/yieldloop/src/lib/i18n.tsx:43|
|signingIn|Signing in|artifacts/yieldloop/src/lib/i18n.tsx:44|
|username|Username|artifacts/yieldloop/src/lib/i18n.tsx:47|
|password|Password|artifacts/yieldloop/src/lib/i18n.tsx:48|
|noAccount|No account? Ask a Manager at your site to create one.|artifacts/yieldloop/src/lib/i18n.tsx:51|
|passwordChangedNotice|Your password was changed. Sign in again with the new password.|artifacts/yieldloop/src/lib/i18n.tsx:52|
|sessionEndedNotice|Your session ended. Sign in again to continue.|artifacts/yieldloop/src/lib/i18n.tsx:53|
|loginTagline|Production & Material Yield|artifacts/yieldloop/src/lib/ui-i18n.ts:47|
|loginLead|Track material, understand scrap, and identify reusable offcuts.|artifacts/yieldloop/src/lib/ui-i18n.ts:48|
|orgName|Ibn Khaldoun Printing and Publishing|artifacts/yieldloop/src/lib/ui-i18n.ts:49|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|signIn|تسجيل الدخول|artifacts/yieldloop/src/lib/i18n.tsx:452|
|signingIn|جارٍ تسجيل الدخول|artifacts/yieldloop/src/lib/i18n.tsx:453|
|username|اسم المستخدم|artifacts/yieldloop/src/lib/i18n.tsx:456|
|password|كلمة المرور|artifacts/yieldloop/src/lib/i18n.tsx:457|
|noAccount|ليس لديك حساب؟ اطلب من مدير موقعك إنشاء حساب لك.|artifacts/yieldloop/src/lib/i18n.tsx:460|
|passwordChangedNotice|تم تغيير كلمة المرور. سجّل الدخول مجددًا بكلمة المرور الجديدة.|artifacts/yieldloop/src/lib/i18n.tsx:461|
|sessionEndedNotice|انتهت جلستك. سجّل الدخول مجددًا للمتابعة.|artifacts/yieldloop/src/lib/i18n.tsx:462|
|loginTagline|الإنتاج وكفاءة استخدام المواد|artifacts/yieldloop/src/lib/ui-i18n.ts:122|
|loginLead|تابع استهلاك المواد، وافهم أسباب الهدر، وحدد القصاصات القابلة لإعادة الاستخدام.|artifacts/yieldloop/src/lib/ui-i18n.ts:123|
|orgName|مطبعة ابن خلدون للطباعة والنشر|artifacts/yieldloop/src/lib/ui-i18n.ts:124|

### Layout and elements
Two-column brand/form desktop; single-column mobile. Login globe remains outside account menu. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Enter username/password; reveal password; submit once; loading prevents repeats. Server-confirmed identity is cached after cancelling old queries; Wouter replace navigates without document reload. Invalid credentials clear password and focus it. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useRef, useState, useMutation, useQueryClient, useLocation, useI18n, useUt, navigate, onSubmit, onChange.

### Data and calculations
auth/csrf GET; auth/login POST; auth/me GET. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Retained layout and long dynamic labels require representative record-based visual review; no new page-specific visual defect is claimed without observation.

### Original requirement mapping
Core secure entry; no public registration. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Production Jobs / My Work

- Route: /jobs
- Purpose: Digital job cards; no assignments.
- Actors allowed: O,S,M; O Open only
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/jobs.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on jobs GET.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|retry|Retry|artifacts/yieldloop/src/lib/i18n.tsx:14|
|colStatus|Status|artifacts/yieldloop/src/lib/i18n.tsx:82|
|colActions|Actions|artifacts/yieldloop/src/lib/i18n.tsx:84|
|jobsTitle|Production jobs|artifacts/yieldloop/src/lib/i18n.tsx:160|
|jobsSubtitle|Each job is a numbered unit of production work. Drafts are prepared by Managers and opened for the floor.|artifacts/yieldloop/src/lib/i18n.tsx:161|
|jobsSubtitleOperator|Jobs currently open for the floor. This list is read-only.|artifacts/yieldloop/src/lib/i18n.tsx:162|
|newJob|New job|artifacts/yieldloop/src/lib/i18n.tsx:163|
|searchJobs|Search by job number or title|artifacts/yieldloop/src/lib/i18n.tsx:164|
|statusFilter|Status|artifacts/yieldloop/src/lib/i18n.tsx:165|
|allStatuses|All statuses|artifacts/yieldloop/src/lib/i18n.tsx:166|
|colJob|Job|artifacts/yieldloop/src/lib/i18n.tsx:173|
|colCreatedBy|Created by|artifacts/yieldloop/src/lib/i18n.tsx:174|
|colUpdated|Updated|artifacts/yieldloop/src/lib/i18n.tsx:175|
|jobsLoadError|Could not load production jobs.|artifacts/yieldloop/src/lib/i18n.tsx:176|
|emptyJobs|No production jobs yet|artifacts/yieldloop/src/lib/i18n.tsx:177|
|emptyJobsManager|Create the first draft job to start planning work.|artifacts/yieldloop/src/lib/i18n.tsx:178|
|emptyJobsOther|Jobs appear here once a Manager prepares them.|artifacts/yieldloop/src/lib/i18n.tsx:179|
|emptyJobsOperator|No jobs are open right now.|artifacts/yieldloop/src/lib/i18n.tsx:180|
|noJobMatches|No jobs match these filters.|artifacts/yieldloop/src/lib/i18n.tsx:181|
|clearFilters|Clear filters|artifacts/yieldloop/src/lib/i18n.tsx:182|
|jobsCount|{n} jobs|artifacts/yieldloop/src/lib/i18n.tsx:184|
|pageCutting|Cutting Studio|artifacts/yieldloop/src/lib/ui-i18n.ts:14|
|recordMaterials|Record|artifacts/yieldloop/src/lib/ui-i18n.ts:24|
|opRecTitle|Open jobs needing reconciliation|artifacts/yieldloop/src/lib/ui-i18n.ts:24|
|opRecClear|Open jobs are balanced|artifacts/yieldloop/src/lib/ui-i18n.ts:24|
|opRecUnmeasured|No material balance recorded yet|artifacts/yieldloop/src/lib/ui-i18n.ts:24|
|opRecVariance|Unexplained variance {v} kg|artifacts/yieldloop/src/lib/ui-i18n.ts:24|
|colJob|Job|artifacts/yieldloop/src/pages/reports.tsx:42|
|colStatus|Status|artifacts/yieldloop/src/pages/reports.tsx:42|
|clearFilters|Clear filters|artifacts/yieldloop/src/pages/reports.tsx:48|
|colActions||artifacts/yieldloop/src/pages/reports.tsx:61|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|retry|إعادة المحاولة|artifacts/yieldloop/src/lib/i18n.tsx:423|
|colStatus|الحالة|artifacts/yieldloop/src/lib/i18n.tsx:491|
|colActions|الإجراءات|artifacts/yieldloop/src/lib/i18n.tsx:493|
|jobsTitle|أوامر الإنتاج|artifacts/yieldloop/src/lib/i18n.tsx:569|
|jobsSubtitle|كل أمر هو وحدة عمل إنتاجي مرقّمة. يُعدّ المديرون المسودات ثم تُفتح لأرض المصنع.|artifacts/yieldloop/src/lib/i18n.tsx:570|
|jobsSubtitleOperator|الأوامر المفتوحة حاليًا لأرض المصنع. هذه القائمة للعرض فقط.|artifacts/yieldloop/src/lib/i18n.tsx:571|
|newJob|أمر جديد|artifacts/yieldloop/src/lib/i18n.tsx:572|
|searchJobs|ابحث برقم الأمر أو العنوان|artifacts/yieldloop/src/lib/i18n.tsx:573|
|statusFilter|الحالة|artifacts/yieldloop/src/lib/i18n.tsx:574|
|allStatuses|كل الحالات|artifacts/yieldloop/src/lib/i18n.tsx:575|
|colJob|الأمر|artifacts/yieldloop/src/lib/i18n.tsx:582|
|colCreatedBy|أنشأه|artifacts/yieldloop/src/lib/i18n.tsx:583|
|colUpdated|آخر تحديث|artifacts/yieldloop/src/lib/i18n.tsx:584|
|jobsLoadError|تعذّر تحميل أوامر الإنتاج.|artifacts/yieldloop/src/lib/i18n.tsx:585|
|emptyJobs|لا توجد أوامر إنتاج بعد|artifacts/yieldloop/src/lib/i18n.tsx:586|
|emptyJobsManager|أنشئ أول مسودة أمر لبدء تخطيط العمل.|artifacts/yieldloop/src/lib/i18n.tsx:587|
|emptyJobsOther|تظهر الأوامر هنا عندما يُعدّها المدير.|artifacts/yieldloop/src/lib/i18n.tsx:588|
|emptyJobsOperator|لا توجد أوامر مفتوحة حاليًا.|artifacts/yieldloop/src/lib/i18n.tsx:589|
|noJobMatches|لا توجد أوامر تطابق هذه المرشحات.|artifacts/yieldloop/src/lib/i18n.tsx:590|
|clearFilters|مسح المرشحات|artifacts/yieldloop/src/lib/i18n.tsx:591|
|jobsCount|{n} أمر|artifacts/yieldloop/src/lib/i18n.tsx:593|
|pageCutting|استوديو القص|artifacts/yieldloop/src/lib/ui-i18n.ts:89|
|recordMaterials|تسجيل|artifacts/yieldloop/src/lib/ui-i18n.ts:99|
|opRecTitle|أوامر مفتوحة تحتاج إلى تسوية|artifacts/yieldloop/src/lib/ui-i18n.ts:99|
|opRecClear|الأوامر المفتوحة متوازنة|artifacts/yieldloop/src/lib/ui-i18n.ts:99|
|opRecUnmeasured|لم يُسجَّل رصيد المواد بعد|artifacts/yieldloop/src/lib/ui-i18n.ts:99|
|opRecVariance|فرق غير مفسَّر {v} كغ|artifacts/yieldloop/src/lib/ui-i18n.ts:99|
|colJob|الأمر|artifacts/yieldloop/src/pages/reports.tsx:80|
|colStatus|الحالة|artifacts/yieldloop/src/pages/reports.tsx:80|
|clearFilters|مسح عوامل التصفية|artifacts/yieldloop/src/pages/reports.tsx:86|
|colActions||artifacts/yieldloop/src/pages/reports.tsx:99|

### Layout and elements
Heading/search/status above responsive job list; Open recording links; arrow pager hidden on one page. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Search/status/page update bounded query; Manager New job; job and Record links open detail/material section. Operator exceptions come from a separate first-ten-Open report request. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useEffect, useRef, useState, useLocation, useReportOverview, useFormatDate, useJobs, useI18n, useUt, navigate, onClick, onChange.

### Data and calculations
jobs GET. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Retained layout and long dynamic labels require representative record-based visual review; no new page-specific visual defect is claimed without observation.

### Original requirement mapping
Digital job cards; no assignments. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: New production job

- Route: /jobs/new
- Purpose: Digital job creation, machine selection.
- Actors allowed: M only; backend creator check
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/job-new.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on jobs POST.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|optional|optional|artifacts/yieldloop/src/lib/i18n.tsx:100|
|cancel|Cancel|artifacts/yieldloop/src/lib/i18n.tsx:103|
|creating|Creating|artifacts/yieldloop/src/lib/i18n.tsx:105|
|newJobTitle|New production job|artifacts/yieldloop/src/lib/i18n.tsx:187|
|newJobDesc|Jobs are created as drafts. Supervisors and operators will not act on it until it is opened.|artifacts/yieldloop/src/lib/i18n.tsx:188|
|jobTitleLabel|Title|artifacts/yieldloop/src/lib/i18n.tsx:189|
|jobNotesLabel|Notes|artifacts/yieldloop/src/lib/i18n.tsx:190|
|jobTitleHint|Short and specific, as it should read on the floor.|artifacts/yieldloop/src/lib/i18n.tsx:191|
|createJob|Create draft|artifacts/yieldloop/src/lib/i18n.tsx:192|
|jobCreated|Draft {num} created.|artifacts/yieldloop/src/lib/i18n.tsx:193|
|backToJobs|All jobs|artifacts/yieldloop/src/lib/i18n.tsx:194|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|optional|اختياري|artifacts/yieldloop/src/lib/i18n.tsx:509|
|cancel|إلغاء|artifacts/yieldloop/src/lib/i18n.tsx:512|
|creating|جارٍ الإنشاء|artifacts/yieldloop/src/lib/i18n.tsx:514|
|newJobTitle|أمر إنتاج جديد|artifacts/yieldloop/src/lib/i18n.tsx:596|
|newJobDesc|تُنشأ الأوامر كمسودات. لن يعمل عليها المشرفون والمشغّلون حتى تُفتح.|artifacts/yieldloop/src/lib/i18n.tsx:597|
|jobTitleLabel|العنوان|artifacts/yieldloop/src/lib/i18n.tsx:598|
|jobNotesLabel|ملاحظات|artifacts/yieldloop/src/lib/i18n.tsx:599|
|jobTitleHint|قصير ومحدد كما يجب أن يُقرأ في أرض المصنع.|artifacts/yieldloop/src/lib/i18n.tsx:600|
|createJob|إنشاء مسودة|artifacts/yieldloop/src/lib/i18n.tsx:601|
|jobCreated|تم إنشاء المسودة {num}.|artifacts/yieldloop/src/lib/i18n.tsx:602|
|backToJobs|كل الأوامر|artifacts/yieldloop/src/lib/i18n.tsx:603|

### Layout and elements
Single primary form, inline field errors; back/cancel navigation. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Submit validated title/reference/machine/notes. Creates persisted job and audit/history; duplicate/stale/domain failures are not successful saves. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useState, useMutation, useQueryClient, useLocation, useToast, useI18n, navigate, onSubmit, onChange, onClick.

### Data and calculations
jobs POST. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Retained layout and long dynamic labels require representative record-based visual review; no new page-specific visual defect is claimed without observation.

### Original requirement mapping
Digital job creation, machine selection. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Dynamic job reference/title

- Route: /jobs/:id
- Purpose: Core job card, recording, reconciliation, traceability.
- Actors allowed: O Open; S,M all visible statuses
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/job-detail.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on jobs/:id GET/PATCH; jobs/:id/materials GET; entries POST; entries/:entry_id/void POST.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|unsaved|Unsaved changes|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:31|
|saving|Saving|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:33|
|staleTitle|Plan changed by someone else|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:41|
|staleDesc|Your inputs are kept. Reloading replaces your unsaved edits with the latest revision.|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:42|
|reference|External reference|artifacts/yieldloop/src/lib/core.ts:30|
|referenceHint|Optional. Shown instead of the internal number.|artifacts/yieldloop/src/lib/core.ts:31|
|machine|Cutting machine|artifacts/yieldloop/src/lib/core.ts:31|
|machineHint|Choose a saved machine or type a new name.|artifacts/yieldloop/src/lib/core.ts:32|
|machineUnset|Not set|artifacts/yieldloop/src/lib/core.ts:32|
|internalNo|Internal no.|artifacts/yieldloop/src/lib/core.ts:32|
|demo|Demo data|artifacts/yieldloop/src/lib/core.ts:33|
|demoTitle|Seeded demonstration record|artifacts/yieldloop/src/lib/core.ts:33|
|closeTitle|Close as balanced|artifacts/yieldloop/src/lib/core.ts:35|
|closeDesc|Closing locks the job card and all material records. The server checks machine, issue, good output and exact zero variance.|artifacts/yieldloop/src/lib/core.ts:36|
|closeBtn|Close job|artifacts/yieldloop/src/lib/core.ts:36|
|closeConfirm|Close {num} as balanced?|artifacts/yieldloop/src/lib/core.ts:37|
|closeConfirmDesc|After closing, the job is completed and read-only for everyone.|artifacts/yieldloop/src/lib/core.ts:37|
|closeReady|Ready to close: all checks pass.|artifacts/yieldloop/src/lib/core.ts:37|
|closeBlocked|Cannot close yet|artifacts/yieldloop/src/lib/core.ts:38|
|closeDirty|Save your edits before closing.|artifacts/yieldloop/src/lib/core.ts:38|
|closed|{num} closed as balanced.|artifacts/yieldloop/src/lib/core.ts:38|
|completedLocked|This job is completed. Records are read-only.|artifacts/yieldloop/src/lib/core.ts:39|
|openJob|Open job card|artifacts/yieldloop/src/lib/core.ts:53|
|asOpenAssistant|Ask assistant|artifacts/yieldloop/src/lib/feature-i18n.ts:48|
|retry|Retry|artifacts/yieldloop/src/lib/i18n.tsx:14|
|cancel|Cancel|artifacts/yieldloop/src/lib/i18n.tsx:103|
|saving|Saving|artifacts/yieldloop/src/lib/i18n.tsx:134|
|colCreatedBy|Created by|artifacts/yieldloop/src/lib/i18n.tsx:174|
|jobTitleLabel|Title|artifacts/yieldloop/src/lib/i18n.tsx:189|
|jobNotesLabel|Notes|artifacts/yieldloop/src/lib/i18n.tsx:190|
|backToJobs|All jobs|artifacts/yieldloop/src/lib/i18n.tsx:194|
|jobLoadError|Could not load this job.|artifacts/yieldloop/src/lib/i18n.tsx:195|
|jobDetails|Details|artifacts/yieldloop/src/lib/i18n.tsx:196|
|revisionLabel|Revision|artifacts/yieldloop/src/lib/i18n.tsx:197|
|createdLabel|Created|artifacts/yieldloop/src/lib/i18n.tsx:198|
|updatedLabel|Last updated|artifacts/yieldloop/src/lib/i18n.tsx:199|
|saveChanges|Save changes|artifacts/yieldloop/src/lib/i18n.tsx:200|
|discardChanges|Discard|artifacts/yieldloop/src/lib/i18n.tsx:201|
|unsaved|Unsaved changes|artifacts/yieldloop/src/lib/i18n.tsx:202|
|jobSaved|Changes saved.|artifacts/yieldloop/src/lib/i18n.tsx:203|
|readOnlyJob|You can view this job but not change it.|artifacts/yieldloop/src/lib/i18n.tsx:204|
|cancelledLocked|Cancelled jobs are permanent and can no longer be changed.|artifacts/yieldloop/src/lib/i18n.tsx:205|
|notesOnlyOpen|Notes can be edited while the job is open.|artifacts/yieldloop/src/lib/i18n.tsx:206|
|noNotes|No notes.|artifacts/yieldloop/src/lib/i18n.tsx:207|
|openJob|Open job|artifacts/yieldloop/src/lib/i18n.tsx:209|
|cancelJob|Cancel job|artifacts/yieldloop/src/lib/i18n.tsx:210|
|openJobDesc|The job becomes visible to operators on the floor.|artifacts/yieldloop/src/lib/i18n.tsx:212|
|cancelJobDesc|Cancelling is permanent. The job can never be reopened or edited again.|artifacts/yieldloop/src/lib/i18n.tsx:214|
|keepJob|Keep job|artifacts/yieldloop/src/lib/i18n.tsx:215|
|saveBeforeTransition|Save or discard your edits before changing status.|artifacts/yieldloop/src/lib/i18n.tsx:217|
|staleTitle|This job changed while you were editing|artifacts/yieldloop/src/lib/i18n.tsx:219|
|staleDesc|Someone saved a newer version. Your edits are kept below. Load the latest version to review it; this replaces your unsaved edits.|artifacts/yieldloop/src/lib/i18n.tsx:220|
|loadLatest|Load latest version|artifacts/yieldloop/src/lib/i18n.tsx:221|
|noTransitions|No status changes available to you.|artifacts/yieldloop/src/lib/i18n.tsx:222|
|err_not_found|This job does not exist or is not visible to you.|artifacts/yieldloop/src/lib/i18n.tsx:226|
|jobNotFoundTitle|Job not available|artifacts/yieldloop/src/lib/i18n.tsx:227|
|matTitle|Materials & reconciliation|artifacts/yieldloop/src/lib/i18n.tsx:243|
|pageCutting|Cutting Studio|artifacts/yieldloop/src/lib/ui-i18n.ts:14|
|openJob|Open job|artifacts/yieldloop/src/pages/reports.tsx:60|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|unsaved|تغييرات غير محفوظة|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:249|
|saving|جارٍ الحفظ|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:251|
|staleTitle|غيّر شخص آخر هذه الخطة|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:259|
|staleDesc|مدخلاتك محفوظة. إعادة التحميل تستبدل تعديلاتك غير المحفوظة بأحدث مراجعة.|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:260|
|reference|المرجع الخارجي|artifacts/yieldloop/src/lib/core.ts:59|
|referenceHint|اختياري. يظهر بدلاً من الرقم الداخلي.|artifacts/yieldloop/src/lib/core.ts:60|
|machine|آلة القص|artifacts/yieldloop/src/lib/core.ts:60|
|machineHint|اختر آلة محفوظة أو اكتب اسماً جديداً.|artifacts/yieldloop/src/lib/core.ts:61|
|machineUnset|غير محددة|artifacts/yieldloop/src/lib/core.ts:61|
|internalNo|الرقم الداخلي|artifacts/yieldloop/src/lib/core.ts:61|
|demo|بيانات تجريبية|artifacts/yieldloop/src/lib/core.ts:62|
|demoTitle|سجل عرض تجريبي|artifacts/yieldloop/src/lib/core.ts:62|
|closeTitle|إغلاق كمتوازن|artifacts/yieldloop/src/lib/core.ts:64|
|closeDesc|يقفل الإغلاق بطاقة الأمر وجميع سجلات المواد. يتحقق الخادم من الآلة والصرف والإنتاج الجيد وأن الفرق صفر تماماً.|artifacts/yieldloop/src/lib/core.ts:65|
|closeBtn|إغلاق الأمر|artifacts/yieldloop/src/lib/core.ts:65|
|closeConfirm|إغلاق {num} كمتوازن؟|artifacts/yieldloop/src/lib/core.ts:66|
|closeConfirmDesc|بعد الإغلاق يصبح الأمر مكتملاً وللعرض فقط للجميع.|artifacts/yieldloop/src/lib/core.ts:66|
|closeReady|جاهز للإغلاق: جميع الفحوص ناجحة.|artifacts/yieldloop/src/lib/core.ts:66|
|closeBlocked|لا يمكن الإغلاق بعد|artifacts/yieldloop/src/lib/core.ts:67|
|closeDirty|احفظ تعديلاتك قبل الإغلاق.|artifacts/yieldloop/src/lib/core.ts:67|
|closed|تم إغلاق {num} كمتوازن.|artifacts/yieldloop/src/lib/core.ts:67|
|completedLocked|هذا الأمر مكتمل. السجلات للعرض فقط.|artifacts/yieldloop/src/lib/core.ts:68|
|openJob|فتح بطاقة الأمر|artifacts/yieldloop/src/lib/core.ts:82|
|asOpenAssistant|اسأل المساعد|artifacts/yieldloop/src/lib/feature-i18n.ts:140|
|retry|إعادة المحاولة|artifacts/yieldloop/src/lib/i18n.tsx:423|
|cancel|إلغاء|artifacts/yieldloop/src/lib/i18n.tsx:512|
|saving|جارٍ الحفظ|artifacts/yieldloop/src/lib/i18n.tsx:543|
|colCreatedBy|أنشأه|artifacts/yieldloop/src/lib/i18n.tsx:583|
|jobTitleLabel|العنوان|artifacts/yieldloop/src/lib/i18n.tsx:598|
|jobNotesLabel|ملاحظات|artifacts/yieldloop/src/lib/i18n.tsx:599|
|backToJobs|كل الأوامر|artifacts/yieldloop/src/lib/i18n.tsx:603|
|jobLoadError|تعذّر تحميل هذا الأمر.|artifacts/yieldloop/src/lib/i18n.tsx:604|
|jobDetails|التفاصيل|artifacts/yieldloop/src/lib/i18n.tsx:605|
|revisionLabel|المراجعة|artifacts/yieldloop/src/lib/i18n.tsx:606|
|createdLabel|تاريخ الإنشاء|artifacts/yieldloop/src/lib/i18n.tsx:607|
|updatedLabel|آخر تحديث|artifacts/yieldloop/src/lib/i18n.tsx:608|
|saveChanges|حفظ التغييرات|artifacts/yieldloop/src/lib/i18n.tsx:609|
|discardChanges|تجاهل|artifacts/yieldloop/src/lib/i18n.tsx:610|
|unsaved|تغييرات غير محفوظة|artifacts/yieldloop/src/lib/i18n.tsx:611|
|jobSaved|تم حفظ التغييرات.|artifacts/yieldloop/src/lib/i18n.tsx:612|
|readOnlyJob|يمكنك عرض هذا الأمر دون تعديله.|artifacts/yieldloop/src/lib/i18n.tsx:613|
|cancelledLocked|الأوامر الملغاة نهائية ولا يمكن تعديلها.|artifacts/yieldloop/src/lib/i18n.tsx:614|
|notesOnlyOpen|يمكن تعديل الملاحظات عندما يكون الأمر مفتوحًا.|artifacts/yieldloop/src/lib/i18n.tsx:615|
|noNotes|لا توجد ملاحظات.|artifacts/yieldloop/src/lib/i18n.tsx:616|
|openJob|فتح الأمر|artifacts/yieldloop/src/lib/i18n.tsx:618|
|cancelJob|إلغاء الأمر|artifacts/yieldloop/src/lib/i18n.tsx:619|
|openJobDesc|سيصبح الأمر مرئيًا للمشغّلين في أرض المصنع.|artifacts/yieldloop/src/lib/i18n.tsx:621|
|cancelJobDesc|الإلغاء نهائي. لا يمكن إعادة فتح الأمر أو تعديله مرة أخرى.|artifacts/yieldloop/src/lib/i18n.tsx:623|
|keepJob|الإبقاء على الأمر|artifacts/yieldloop/src/lib/i18n.tsx:624|
|saveBeforeTransition|احفظ تعديلاتك أو تجاهلها قبل تغيير الحالة.|artifacts/yieldloop/src/lib/i18n.tsx:626|
|staleTitle|تغيّر هذا الأمر أثناء تعديلك|artifacts/yieldloop/src/lib/i18n.tsx:628|
|staleDesc|حفظ شخص آخر نسخة أحدث. تعديلاتك محفوظة أدناه. حمّل أحدث نسخة لمراجعتها؛ سيؤدي ذلك إلى استبدال تعديلاتك غير المحفوظة.|artifacts/yieldloop/src/lib/i18n.tsx:629|
|loadLatest|تحميل أحدث نسخة|artifacts/yieldloop/src/lib/i18n.tsx:630|
|noTransitions|لا توجد تغييرات حالة متاحة لك.|artifacts/yieldloop/src/lib/i18n.tsx:631|
|err_not_found|هذا الأمر غير موجود أو غير مرئي لك.|artifacts/yieldloop/src/lib/i18n.tsx:635|
|jobNotFoundTitle|الأمر غير متاح|artifacts/yieldloop/src/lib/i18n.tsx:636|
|matTitle|المواد والمطابقة|artifacts/yieldloop/src/lib/i18n.tsx:652|
|pageCutting|استوديو القص|artifacts/yieldloop/src/lib/ui-i18n.ts:89|
|openJob|فتح الأمر|artifacts/yieldloop/src/pages/reports.tsx:98|

### Layout and elements
Section navigation; balance summary, entry forms/table, close action, cutting link and job history. Long records require scrolling. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Capabilities govern edits/transitions. Open page places material recording first, then Close/Cutting/Details. Issue/good/scrap/offcut entries create reconciliations. Void requires reason; replacement is a new entry. Closure requires machine, positive issue/good and zero variance. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useEffect, useRef, useState, useMutation, useQueryClient, useLocation, useFormatDate, useToast, useJob, useI18n, useKt, useMachines, useJobMaterials, useCt, useUt, useFt, onClick, onSubmit, onChange.

### Data and calculations
jobs/:id GET/PATCH; jobs/:id/materials GET; entries POST; entries/:entry_id/void POST. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Retained layout and long dynamic labels require representative record-based visual review; no new page-specific visual defect is claimed without observation.

### Original requirement mapping
Core job card, recording, reconciliation, traceability. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Offcut inventory

- Route: /inventory
- Purpose: Offcut foundation, not consumption.
- Actors allowed: O scoped Open-job lots; S,M broader
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/inventory.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on inventory GET/POST.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|retry|Retry|artifacts/yieldloop/src/lib/i18n.tsx:14|
|checking|Checking|artifacts/yieldloop/src/lib/i18n.tsx:19|
|invTitle|Offcut inventory|artifacts/yieldloop/src/lib/i18n.tsx:347|
|invSubtitle|Traceable kg offcut lots registered from recorded job output. A lot records that material exists; it says nothing about whether it fits another job.|artifacts/yieldloop/src/lib/i18n.tsx:348|
|invSearch|Search job number, material or specification|artifacts/yieldloop/src/lib/i18n.tsx:350|
|invAllStates|All|artifacts/yieldloop/src/lib/i18n.tsx:351|
|invEmpty|No lots registered yet|artifacts/yieldloop/src/lib/i18n.tsx:355|
|invEmptyDesc|Lots appear here after a supervisor or manager registers an offcut entry from an Open job.|artifacts/yieldloop/src/lib/i18n.tsx:356|
|invNoMatch|No lots match these filters|artifacts/yieldloop/src/lib/i18n.tsx:357|
|invClear|Clear filters|artifacts/yieldloop/src/lib/i18n.tsx:358|
|invLoadError|Inventory could not be loaded.|artifacts/yieldloop/src/lib/i18n.tsx:359|
|invFilteredJob|Showing lots from job #{id}|artifacts/yieldloop/src/lib/i18n.tsx:360|
|invCount|{n} lots|artifacts/yieldloop/src/lib/i18n.tsx:361|
|invState|State|artifacts/yieldloop/src/lib/i18n.tsx:365|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|retry|إعادة المحاولة|artifacts/yieldloop/src/lib/i18n.tsx:423|
|checking|جارٍ الفحص|artifacts/yieldloop/src/lib/i18n.tsx:428|
|invTitle|مخزون البواقي|artifacts/yieldloop/src/lib/i18n.tsx:756|
|invSubtitle|دفعات بواقي قابلة للتتبع بالكيلوغرام، مسجّلة من مخرجات الأوامر. الدفعة تثبت وجود المادة فقط ولا تعني ملاءمتها لأمر آخر.|artifacts/yieldloop/src/lib/i18n.tsx:757|
|invSearch|ابحث برقم الأمر أو المادة أو المواصفة|artifacts/yieldloop/src/lib/i18n.tsx:759|
|invAllStates|الكل|artifacts/yieldloop/src/lib/i18n.tsx:760|
|invEmpty|لا توجد دفعات مسجّلة بعد|artifacts/yieldloop/src/lib/i18n.tsx:764|
|invEmptyDesc|تظهر الدفعات هنا بعد أن يسجّل مشرف أو مدير قيد بواقٍ من أمر مفتوح.|artifacts/yieldloop/src/lib/i18n.tsx:765|
|invNoMatch|لا توجد دفعات تطابق هذه المرشحات|artifacts/yieldloop/src/lib/i18n.tsx:766|
|invClear|مسح المرشحات|artifacts/yieldloop/src/lib/i18n.tsx:767|
|invLoadError|تعذّر تحميل المخزون.|artifacts/yieldloop/src/lib/i18n.tsx:768|
|invFilteredJob|عرض دفعات الأمر رقم {id}|artifacts/yieldloop/src/lib/i18n.tsx:769|
|invCount|{n} دفعة|artifacts/yieldloop/src/lib/i18n.tsx:770|
|invState|الحالة|artifacts/yieldloop/src/lib/i18n.tsx:774|

### Layout and elements
Filter toolbar, lot table/cards, collapsible registered-versus-confirmed warning, compact pager. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Search/filter/page; open source/detail; registration only authorized S/M from a valid source offcut. No operational reuse controls. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useEffect, useRef, useState, useSearch, useFormatDate, useInventory, useI18n, onChange, onClick.

### Data and calculations
inventory GET/POST. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Retained layout and long dynamic labels require representative record-based visual review; no new page-specific visual defect is claimed without observation.

### Original requirement mapping
Offcut foundation, not consumption. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Dynamic offcut lot

- Route: /inventory/:id
- Purpose: Provenance and corrections.
- Actors allowed: Scoped as inventory; backend object visibility
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/inventory-detail.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on inventory/:id GET; inventory/:id/void POST.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|retry|Retry|artifacts/yieldloop/src/lib/i18n.tsx:14|
|checking|Checking|artifacts/yieldloop/src/lib/i18n.tsx:19|
|cancel|Cancel|artifacts/yieldloop/src/lib/i18n.tsx:103|
|loadLatest|Load latest version|artifacts/yieldloop/src/lib/i18n.tsx:221|
|noteTooLong|Note is too long.|artifacts/yieldloop/src/lib/i18n.tsx:294|
|invLot|Lot|artifacts/yieldloop/src/lib/i18n.tsx:362|
|invRemaining|Remaining|artifacts/yieldloop/src/lib/i18n.tsx:363|
|invOriginal|Original quantity|artifacts/yieldloop/src/lib/i18n.tsx:364|
|invSourceJob|Source job|artifacts/yieldloop/src/lib/i18n.tsx:366|
|invSourceEntry|Source entry|artifacts/yieldloop/src/lib/i18n.tsx:367|
|invReconciliation|Reconciliation|artifacts/yieldloop/src/lib/i18n.tsx:368|
|invSourceStatus|Source job status|artifacts/yieldloop/src/lib/i18n.tsx:369|
|invSourceVoided|Source entry voided|artifacts/yieldloop/src/lib/i18n.tsx:370|
|invSourceVoidedYes|Yes, the source entry was voided|artifacts/yieldloop/src/lib/i18n.tsx:371|
|invSourceVoidedNo|No|artifacts/yieldloop/src/lib/i18n.tsx:372|
|invCreated|Registered|artifacts/yieldloop/src/lib/i18n.tsx:373|
|invMaterial|Material|artifacts/yieldloop/src/lib/i18n.tsx:374|
|invCompat|Compatibility: unverified|artifacts/yieldloop/src/lib/i18n.tsx:375|
|invPolicy|Reuse policy: not defined|artifacts/yieldloop/src/lib/i18n.tsx:376|
|invBlocked|Reserve, release and consume are blocked until a reuse policy exists.|artifacts/yieldloop/src/lib/i18n.tsx:377|
|invHistory|History|artifacts/yieldloop/src/lib/i18n.tsx:378|
|invNoHistory|No history events.|artifacts/yieldloop/src/lib/i18n.tsx:379|
|invBack|All inventory|artifacts/yieldloop/src/lib/i18n.tsx:382|
|invDetailError|This lot could not be loaded.|artifacts/yieldloop/src/lib/i18n.tsx:383|
|invVoid|Void lot|artifacts/yieldloop/src/lib/i18n.tsx:384|
|invVoidTitle|Void this lot?|artifacts/yieldloop/src/lib/i18n.tsx:385|
|invVoidDesc|Voiding is final. The lot stays in history and cannot be edited or restored.|artifacts/yieldloop/src/lib/i18n.tsx:386|
|invVoidConfirm|I understand voiding is permanent.|artifacts/yieldloop/src/lib/i18n.tsx:387|
|invVoiding|Voiding|artifacts/yieldloop/src/lib/i18n.tsx:388|
|invVoidDone|Lot voided|artifacts/yieldloop/src/lib/i18n.tsx:389|
|invVoidStale|This lot changed since you opened the dialog. Your reason is kept. Load the latest version and review before confirming.|artifacts/yieldloop/src/lib/i18n.tsx:390|
|invTerminal|This lot is voided. Voided is a final state.|artifacts/yieldloop/src/lib/i18n.tsx:391|
|invReadOnly|You can view this lot but not void it.|artifacts/yieldloop/src/lib/i18n.tsx:392|
|invReason|Reason|artifacts/yieldloop/src/lib/i18n.tsx:400|
|invReasonRequired|A reason is required.|artifacts/yieldloop/src/lib/i18n.tsx:401|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|retry|إعادة المحاولة|artifacts/yieldloop/src/lib/i18n.tsx:423|
|checking|جارٍ الفحص|artifacts/yieldloop/src/lib/i18n.tsx:428|
|cancel|إلغاء|artifacts/yieldloop/src/lib/i18n.tsx:512|
|loadLatest|تحميل أحدث نسخة|artifacts/yieldloop/src/lib/i18n.tsx:630|
|noteTooLong|الملاحظة طويلة جدًا.|artifacts/yieldloop/src/lib/i18n.tsx:703|
|invLot|دفعة|artifacts/yieldloop/src/lib/i18n.tsx:771|
|invRemaining|المتبقي|artifacts/yieldloop/src/lib/i18n.tsx:772|
|invOriginal|الكمية الأصلية|artifacts/yieldloop/src/lib/i18n.tsx:773|
|invSourceJob|الأمر المصدر|artifacts/yieldloop/src/lib/i18n.tsx:775|
|invSourceEntry|القيد المصدر|artifacts/yieldloop/src/lib/i18n.tsx:776|
|invReconciliation|المطابقة|artifacts/yieldloop/src/lib/i18n.tsx:777|
|invSourceStatus|حالة الأمر المصدر|artifacts/yieldloop/src/lib/i18n.tsx:778|
|invSourceVoided|القيد المصدر مُبطل|artifacts/yieldloop/src/lib/i18n.tsx:779|
|invSourceVoidedYes|نعم، القيد المصدر مُبطل|artifacts/yieldloop/src/lib/i18n.tsx:780|
|invSourceVoidedNo|لا|artifacts/yieldloop/src/lib/i18n.tsx:781|
|invCreated|تاريخ التسجيل|artifacts/yieldloop/src/lib/i18n.tsx:782|
|invMaterial|المادة|artifacts/yieldloop/src/lib/i18n.tsx:783|
|invCompat|التوافق: غير متحقق منه|artifacts/yieldloop/src/lib/i18n.tsx:784|
|invPolicy|سياسة إعادة الاستخدام: غير محددة|artifacts/yieldloop/src/lib/i18n.tsx:785|
|invBlocked|الحجز والإفراج والاستهلاك محظورة حتى توجد سياسة لإعادة الاستخدام.|artifacts/yieldloop/src/lib/i18n.tsx:786|
|invHistory|السجل|artifacts/yieldloop/src/lib/i18n.tsx:787|
|invNoHistory|لا توجد أحداث.|artifacts/yieldloop/src/lib/i18n.tsx:788|
|invBack|كل المخزون|artifacts/yieldloop/src/lib/i18n.tsx:791|
|invDetailError|تعذّر تحميل هذه الدفعة.|artifacts/yieldloop/src/lib/i18n.tsx:792|
|invVoid|إبطال الدفعة|artifacts/yieldloop/src/lib/i18n.tsx:793|
|invVoidTitle|إبطال هذه الدفعة؟|artifacts/yieldloop/src/lib/i18n.tsx:794|
|invVoidDesc|الإبطال نهائي. تبقى الدفعة في السجل ولا يمكن تعديلها أو استعادتها.|artifacts/yieldloop/src/lib/i18n.tsx:795|
|invVoidConfirm|أفهم أن الإبطال دائم.|artifacts/yieldloop/src/lib/i18n.tsx:796|
|invVoiding|جارٍ الإبطال|artifacts/yieldloop/src/lib/i18n.tsx:797|
|invVoidDone|تم إبطال الدفعة|artifacts/yieldloop/src/lib/i18n.tsx:798|
|invVoidStale|تغيّرت هذه الدفعة منذ فتح النافذة. تم الاحتفاظ بالسبب. حمّل أحدث نسخة وراجعها قبل التأكيد.|artifacts/yieldloop/src/lib/i18n.tsx:799|
|invTerminal|هذه الدفعة مُبطلة. الإبطال حالة نهائية.|artifacts/yieldloop/src/lib/i18n.tsx:800|
|invReadOnly|يمكنك عرض هذه الدفعة دون إبطالها.|artifacts/yieldloop/src/lib/i18n.tsx:801|
|invReason|السبب|artifacts/yieldloop/src/lib/i18n.tsx:809|
|invReasonRequired|السبب مطلوب.|artifacts/yieldloop/src/lib/i18n.tsx:810|

### Layout and elements
Identity/state, quantities/material/source, history, permitted action. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Follow source record; inspect original/remaining/history; eligible S/M may void with confirmation/reason. Source job must be Open and entry active. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useRef, useState, useMutation, useQueryClient, useFormatDate, useToast, useInventoryLot, useI18n, onClick, onChange.

### Data and calculations
inventory/:id GET; inventory/:id/void POST. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Retained layout and long dynamic labels require representative record-based visual review; no new page-specific visual defect is claimed without observation.

### Original requirement mapping
Provenance and corrections. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Job & inventory report

- Route: /reports
- Purpose: Current reconciled reporting, not historical as-of.
- Actors allowed: UI S,M; API also O with Open scope
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/reports.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on reports/overview GET.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|compare|Compare|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:68|
|material|Material|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:74|
|reset|Remove all|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:142|
|apply|Apply|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:152|
|demo|Demo data|artifacts/yieldloop/src/lib/core.ts:33|
|compare|Compare same-machine jobs|artifacts/yieldloop/src/lib/core.ts:43|
|loadError|Could not load the comparison.|artifacts/yieldloop/src/lib/core.ts:54|
|material|Material|artifacts/yieldloop/src/lib/core.ts:54|
|retry|Retry|artifacts/yieldloop/src/lib/i18n.tsx:14|
|welcome|Signed in as {name}|artifacts/yieldloop/src/lib/i18n.tsx:62|
|loadError|Could not load employees.|artifacts/yieldloop/src/lib/i18n.tsx:95|
|clearFilters|Clear filters|artifacts/yieldloop/src/lib/i18n.tsx:182|
|invAvailableHint|Available means registered only. It does not mean suitable or approved for reuse.|artifacts/yieldloop/src/lib/i18n.tsx:354|
|welcome|Welcome, {name}|artifacts/yieldloop/src/lib/ui-i18n.ts:50|
|mOpen|Open jobs|artifacts/yieldloop/src/lib/ui-i18n.ts:54|
|mOpenSub|{d} draft · {c} completed|artifacts/yieldloop/src/lib/ui-i18n.ts:55|
|mIssued|Material issued|artifacts/yieldloop/src/lib/ui-i18n.ts:55|
|mGood|Good output|artifacts/yieldloop/src/lib/ui-i18n.ts:55|
|mScrap|Total scrap|artifacts/yieldloop/src/lib/ui-i18n.ts:55|
|mOffcut|Reusable offcuts|artifacts/yieldloop/src/lib/ui-i18n.ts:55|
|mYield|Good yield|artifacts/yieldloop/src/lib/ui-i18n.ts:56|
|mLots|Available offcut lots|artifacts/yieldloop/src/lib/ui-i18n.ts:56|
|mReconciled|Reconciled jobs|artifacts/yieldloop/src/lib/ui-i18n.ts:56|
|mReconciledSub|{n} awaiting reconciliation|artifacts/yieldloop/src/lib/ui-i18n.ts:56|
|mNeedMaterial|Choose one material to see kg totals|artifacts/yieldloop/src/lib/ui-i18n.ts:56|
|mNeedMaterialSub|Totals across different materials would mix unrelated kg.|artifacts/yieldloop/src/lib/ui-i18n.ts:57|
|mChoose|Choose material|artifacts/yieldloop/src/lib/ui-i18n.ts:57|
|hIssued|Material issued to jobs in this view, for the selected material.|artifacts/yieldloop/src/lib/ui-i18n.ts:57|
|hGood|Recorded good output for the selected material.|artifacts/yieldloop/src/lib/ui-i18n.ts:58|
|hScrap|Recorded scrap for the selected material. Unaccounted variance is not scrap.|artifacts/yieldloop/src/lib/ui-i18n.ts:59|
|hOffcut|Offcuts recorded as reusable. Registered only, not approved for reuse.|artifacts/yieldloop/src/lib/ui-i18n.ts:60|
|hYield|Good output divided by material issued.|artifacts/yieldloop/src/lib/ui-i18n.ts:61|
|hLots|Offcut lots currently available in inventory for jobs in this view.|artifacts/yieldloop/src/lib/ui-i18n.ts:62|
|chStatus|Job status|artifacts/yieldloop/src/lib/ui-i18n.ts:63|
|chStatusEmpty|No jobs in this view.|artifacts/yieldloop/src/lib/ui-i18n.ts:64|
|chStatusSummary|{total} jobs. {parts}|artifacts/yieldloop/src/lib/ui-i18n.ts:64|
|chOutput|Where the material went|artifacts/yieldloop/src/lib/ui-i18n.ts:64|
|chOutputEmpty|No issued material recorded for this material yet.|artifacts/yieldloop/src/lib/ui-i18n.ts:65|
|chOutputNeed|Choose one material to compare good output, scrap and offcuts.|artifacts/yieldloop/src/lib/ui-i18n.ts:65|
|chOutputSummary|Good {g} kg, scrap {s} kg, offcuts {o} kg, unaccounted {v} kg.|artifacts/yieldloop/src/lib/ui-i18n.ts:66|
|unaccounted|Unaccounted|artifacts/yieldloop/src/lib/ui-i18n.ts:67|
|tblRecent|Recent jobs|artifacts/yieldloop/src/lib/ui-i18n.ts:67|
|tblOpen|Production jobs · open first|artifacts/yieldloop/src/lib/ui-i18n.ts:68|
|tblJob|Job|artifacts/yieldloop/src/lib/ui-i18n.ts:68|
|tblMachine|Machine|artifacts/yieldloop/src/lib/ui-i18n.ts:68|
|tblStatus|Status|artifacts/yieldloop/src/lib/ui-i18n.ts:68|
|tblYield|Yield|artifacts/yieldloop/src/lib/ui-i18n.ts:68|
|tblCreated|Created|artifacts/yieldloop/src/lib/ui-i18n.ts:68|
|viewAllJobs|All jobs|artifacts/yieldloop/src/lib/ui-i18n.ts:68|
|quickCompare|Compare jobs|artifacts/yieldloop/src/lib/ui-i18n.ts:69|
|quickEmployees|Employees|artifacts/yieldloop/src/lib/ui-i18n.ts:69|
|quickReports|Reports|artifacts/yieldloop/src/lib/ui-i18n.ts:69|
|filterLabel|Filters|artifacts/yieldloop/src/lib/ui-i18n.ts:69|
|dashTitle|Material dashboard|artifacts/yieldloop/src/pages/reports.tsx:26|
|dashSub|Current material balances for a cohort of production jobs. Values are recorded figures, never inferred.|artifacts/yieldloop/src/pages/reports.tsx:27|
|repTitle|Job & inventory report|artifacts/yieldloop/src/pages/reports.tsx:27|
|repSub|Every job and inventory lot in the selected cohort, with its latest reconciliation.|artifacts/yieldloop/src/pages/reports.tsx:28|
|filters|Filters|artifacts/yieldloop/src/pages/reports.tsx:28|
|startDate|Created from|artifacts/yieldloop/src/pages/reports.tsx:29|
|endDate|Created to|artifacts/yieldloop/src/pages/reports.tsx:29|
|timezone|Date timezone|artifacts/yieldloop/src/pages/reports.tsx:29|
|status|Job status|artifacts/yieldloop/src/pages/reports.tsx:29|
|anyStatus|Any status|artifacts/yieldloop/src/pages/reports.tsx:29|
|material|Material|artifacts/yieldloop/src/pages/reports.tsx:29|
|allMaterials|All materials (quantities hidden)|artifacts/yieldloop/src/pages/reports.tsx:30|
|chooseMaterial|Choose material|artifacts/yieldloop/src/pages/reports.tsx:30|
|hidePicker|Hide list|artifacts/yieldloop/src/pages/reports.tsx:30|
|clearMaterial|Clear material|artifacts/yieldloop/src/pages/reports.tsx:30|
|apply|Apply|artifacts/yieldloop/src/pages/reports.tsx:30|
|reset|Reset|artifacts/yieldloop/src/pages/reports.tsx:31|
|dateFormat|Use the format YYYY-MM-DD.|artifacts/yieldloop/src/pages/reports.tsx:31|
|dateOrder|The start date must be on or before the end date.|artifacts/yieldloop/src/pages/reports.tsx:32|
|invalidChoice|Choose one of the listed options.|artifacts/yieldloop/src/pages/reports.tsx:32|
|invalidFilter|Enter a valid value or clear this filter.|artifacts/yieldloop/src/pages/reports.tsx:33|
|jobs|Jobs in cohort|artifacts/yieldloop/src/pages/reports.tsx:35|
|measured|Measured|artifacts/yieldloop/src/pages/reports.tsx:36|
|unmeasured|Unmeasured|artifacts/yieldloop/src/pages/reports.tsx:36|
|production|Production balance|artifacts/yieldloop/src/pages/reports.tsx:36|
|inventory|Offcut inventory|artifacts/yieldloop/src/pages/reports.tsx:37|
|lots|{n} lots|artifacts/yieldloop/src/pages/reports.tsx:37|
|original|Original|artifacts/yieldloop/src/pages/reports.tsx:38|
|remaining|Remaining|artifacts/yieldloop/src/pages/reports.tsx:38|
|selectMaterial|Select one material to see kg totals, rates and inventory weights. Totals across different materials would mix unrelated kg.|artifacts/yieldloop/src/pages/reports.tsx:38|
|unavailable|Unavailable|artifacts/yieldloop/src/pages/reports.tsx:39|
|noData|No reconciliation recorded|artifacts/yieldloop/src/pages/reports.tsx:40|
|openReport|Open detailed report|artifacts/yieldloop/src/pages/reports.tsx:40|
|openDashboard|Back to dashboard|artifacts/yieldloop/src/pages/reports.tsx:41|
|jobsTable|Jobs|artifacts/yieldloop/src/pages/reports.tsx:41|
|lotsTable|Inventory lots|artifacts/yieldloop/src/pages/reports.tsx:42|
|snapshot|Reconciliation #{id} · revision {rev} · {time}|artifacts/yieldloop/src/pages/reports.tsx:43|
|emptyTitle|No jobs in this cohort|artifacts/yieldloop/src/pages/reports.tsx:44|
|emptyDesc|No production jobs visible to you were created in this range. Widen the dates or clear filters.|artifacts/yieldloop/src/pages/reports.tsx:45|
|emptyLots|No inventory lots come from jobs in this cohort.|artifacts/yieldloop/src/pages/reports.tsx:45|
|loadError|The report could not be loaded.|artifacts/yieldloop/src/pages/reports.tsx:46|
|notFound|The selected material or page does not exist or is not visible to you.|artifacts/yieldloop/src/pages/reports.tsx:47|
|validation|The server rejected some filters. Your inputs are kept below.|artifacts/yieldloop/src/pages/reports.tsx:47|
|clearFilters|Clear filters|artifacts/yieldloop/src/pages/reports.tsx:48|
|activeFilters|{n} active|artifacts/yieldloop/src/pages/reports.tsx:53|
|kVariance|Net variance|artifacts/yieldloop/src/pages/reports.tsx:55|
|attention|Needs attention|artifacts/yieldloop/src/pages/reports.tsx:56|
|attentionScope|Checked across the first {n} jobs of this cohort. Open Reports for the rest.|artifacts/yieldloop/src/pages/reports.tsx:57|
|attVariance|Unaccounted material {v} kg|artifacts/yieldloop/src/pages/reports.tsx:57|
|attNegVariance|Accounted exceeds issued by {v} kg|artifacts/yieldloop/src/pages/reports.tsx:58|
|attUnmeasured|No reconciliation yet|artifacts/yieldloop/src/pages/reports.tsx:58|
|allClear|Nothing flagged in these jobs.|artifacts/yieldloop/src/pages/reports.tsx:58|
|allClearSub|Every listed job is reconciled with zero variance.|artifacts/yieldloop/src/pages/reports.tsx:59|
|openCutting|Cutting Studio|artifacts/yieldloop/src/pages/reports.tsx:60|
|unitsNote|All quantities in kg. Variance is unaccounted material, never scrap. Rates show Unavailable when nothing was issued.|artifacts/yieldloop/src/pages/reports.tsx:61|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|compare|مقارنة|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:286|
|material|المادة|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:292|
|reset|إزالة الكل|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:360|
|apply|تطبيق|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:370|
|demo|بيانات تجريبية|artifacts/yieldloop/src/lib/core.ts:62|
|compare|مقارنة أوامر على نفس الآلة|artifacts/yieldloop/src/lib/core.ts:72|
|loadError|تعذر تحميل المقارنة.|artifacts/yieldloop/src/lib/core.ts:83|
|material|المادة|artifacts/yieldloop/src/lib/core.ts:83|
|retry|إعادة المحاولة|artifacts/yieldloop/src/lib/i18n.tsx:423|
|welcome|مسجّل الدخول باسم {name}|artifacts/yieldloop/src/lib/i18n.tsx:471|
|loadError|تعذّر تحميل الموظفين.|artifacts/yieldloop/src/lib/i18n.tsx:504|
|clearFilters|مسح المرشحات|artifacts/yieldloop/src/lib/i18n.tsx:591|
|invAvailableHint|متاحة تعني مسجّلة فقط، ولا تعني صالحة أو معتمدة لإعادة الاستخدام.|artifacts/yieldloop/src/lib/i18n.tsx:763|
|welcome|أهلًا، {name}|artifacts/yieldloop/src/lib/ui-i18n.ts:125|
|mOpen|الأوامر المفتوحة|artifacts/yieldloop/src/lib/ui-i18n.ts:129|
|mOpenSub|{d} مسودة · {c} مكتملة|artifacts/yieldloop/src/lib/ui-i18n.ts:130|
|mIssued|المواد المصروفة|artifacts/yieldloop/src/lib/ui-i18n.ts:130|
|mGood|الإنتاج الجيد|artifacts/yieldloop/src/lib/ui-i18n.ts:130|
|mScrap|إجمالي الهدر|artifacts/yieldloop/src/lib/ui-i18n.ts:130|
|mOffcut|قصاصات قابلة لإعادة الاستخدام|artifacts/yieldloop/src/lib/ui-i18n.ts:130|
|mYield|المردود الجيد|artifacts/yieldloop/src/lib/ui-i18n.ts:131|
|mLots|دفعات قصاصات متاحة|artifacts/yieldloop/src/lib/ui-i18n.ts:131|
|mReconciled|أوامر مُسوّاة|artifacts/yieldloop/src/lib/ui-i18n.ts:131|
|mReconciledSub|{n} بانتظار التسوية|artifacts/yieldloop/src/lib/ui-i18n.ts:131|
|mNeedMaterial|اختر مادة واحدة لعرض إجماليات الكيلوغرام|artifacts/yieldloop/src/lib/ui-i18n.ts:131|
|mNeedMaterialSub|جمع مواد مختلفة يخلط كيلوغرامات غير مرتبطة.|artifacts/yieldloop/src/lib/ui-i18n.ts:132|
|mChoose|اختر مادة|artifacts/yieldloop/src/lib/ui-i18n.ts:132|
|hIssued|المواد المصروفة للأوامر في هذا العرض، للمادة المحددة.|artifacts/yieldloop/src/lib/ui-i18n.ts:132|
|hGood|الإنتاج الجيد المسجّل للمادة المحددة.|artifacts/yieldloop/src/lib/ui-i18n.ts:133|
|hScrap|الهدر المسجّل للمادة المحددة. الفرق غير المحتسب ليس هدرًا.|artifacts/yieldloop/src/lib/ui-i18n.ts:134|
|hOffcut|قصاصات مسجّلة كقابلة لإعادة الاستخدام. مسجّلة فقط وغير معتمدة لإعادة الاستخدام.|artifacts/yieldloop/src/lib/ui-i18n.ts:135|
|hYield|الإنتاج الجيد مقسومًا على المواد المصروفة.|artifacts/yieldloop/src/lib/ui-i18n.ts:136|
|hLots|دفعات القصاصات المتاحة حاليًا في المخزون لأوامر هذا العرض.|artifacts/yieldloop/src/lib/ui-i18n.ts:137|
|chStatus|حالة الأوامر|artifacts/yieldloop/src/lib/ui-i18n.ts:138|
|chStatusEmpty|لا توجد أوامر في هذا العرض.|artifacts/yieldloop/src/lib/ui-i18n.ts:139|
|chStatusSummary|{total} أمر. {parts}|artifacts/yieldloop/src/lib/ui-i18n.ts:139|
|chOutput|أين ذهبت المواد|artifacts/yieldloop/src/lib/ui-i18n.ts:139|
|chOutputEmpty|لا توجد مواد مصروفة مسجّلة لهذه المادة بعد.|artifacts/yieldloop/src/lib/ui-i18n.ts:140|
|chOutputNeed|اختر مادة واحدة لمقارنة الإنتاج الجيد والهدر والقصاصات.|artifacts/yieldloop/src/lib/ui-i18n.ts:140|
|chOutputSummary|جيد {g} كغ، هدر {s} كغ، قصاصات {o} كغ، غير محتسب {v} كغ.|artifacts/yieldloop/src/lib/ui-i18n.ts:141|
|unaccounted|غير محتسب|artifacts/yieldloop/src/lib/ui-i18n.ts:142|
|tblRecent|أحدث الأوامر|artifacts/yieldloop/src/lib/ui-i18n.ts:142|
|tblOpen|أوامر الإنتاج · المفتوحة أولاً|artifacts/yieldloop/src/lib/ui-i18n.ts:143|
|tblJob|الأمر|artifacts/yieldloop/src/lib/ui-i18n.ts:143|
|tblMachine|الماكينة|artifacts/yieldloop/src/lib/ui-i18n.ts:143|
|tblStatus|الحالة|artifacts/yieldloop/src/lib/ui-i18n.ts:143|
|tblYield|المردود|artifacts/yieldloop/src/lib/ui-i18n.ts:143|
|tblCreated|الإنشاء|artifacts/yieldloop/src/lib/ui-i18n.ts:143|
|viewAllJobs|كل الأوامر|artifacts/yieldloop/src/lib/ui-i18n.ts:143|
|quickCompare|مقارنة الأوامر|artifacts/yieldloop/src/lib/ui-i18n.ts:144|
|quickEmployees|الموظفون|artifacts/yieldloop/src/lib/ui-i18n.ts:144|
|quickReports|التقارير|artifacts/yieldloop/src/lib/ui-i18n.ts:144|
|filterLabel|عوامل التصفية|artifacts/yieldloop/src/lib/ui-i18n.ts:144|
|dashTitle|لوحة المواد|artifacts/yieldloop/src/pages/reports.tsx:64|
|dashSub|أرصدة المواد الحالية لمجموعة من أوامر الإنتاج. القيم مسجّلة فعليًا وليست مستنتجة.|artifacts/yieldloop/src/pages/reports.tsx:65|
|repTitle|تقرير الأوامر والمخزون|artifacts/yieldloop/src/pages/reports.tsx:65|
|repSub|كل أمر وكل دفعة مخزون في المجموعة المحددة مع آخر تسوية لها.|artifacts/yieldloop/src/pages/reports.tsx:66|
|filters|عوامل التصفية|artifacts/yieldloop/src/pages/reports.tsx:66|
|startDate|تاريخ الإنشاء من|artifacts/yieldloop/src/pages/reports.tsx:67|
|endDate|تاريخ الإنشاء إلى|artifacts/yieldloop/src/pages/reports.tsx:67|
|timezone|المنطقة الزمنية للتاريخ|artifacts/yieldloop/src/pages/reports.tsx:67|
|status|حالة الأمر|artifacts/yieldloop/src/pages/reports.tsx:67|
|anyStatus|أي حالة|artifacts/yieldloop/src/pages/reports.tsx:67|
|material|المادة|artifacts/yieldloop/src/pages/reports.tsx:67|
|allMaterials|كل المواد (الكميات مخفية)|artifacts/yieldloop/src/pages/reports.tsx:68|
|chooseMaterial|اختر مادة|artifacts/yieldloop/src/pages/reports.tsx:68|
|hidePicker|إخفاء القائمة|artifacts/yieldloop/src/pages/reports.tsx:68|
|clearMaterial|إزالة المادة|artifacts/yieldloop/src/pages/reports.tsx:68|
|apply|تطبيق|artifacts/yieldloop/src/pages/reports.tsx:68|
|reset|إعادة الضبط|artifacts/yieldloop/src/pages/reports.tsx:69|
|dateFormat|استخدم الصيغة YYYY-MM-DD.|artifacts/yieldloop/src/pages/reports.tsx:69|
|dateOrder|يجب أن يكون تاريخ البداية في تاريخ النهاية أو قبله.|artifacts/yieldloop/src/pages/reports.tsx:70|
|invalidChoice|اختر أحد الخيارات المدرجة.|artifacts/yieldloop/src/pages/reports.tsx:70|
|invalidFilter|أدخل قيمة صالحة أو امسح عامل التصفية هذا.|artifacts/yieldloop/src/pages/reports.tsx:71|
|jobs|الأوامر في المجموعة|artifacts/yieldloop/src/pages/reports.tsx:73|
|measured|مقيسة|artifacts/yieldloop/src/pages/reports.tsx:74|
|unmeasured|غير مقيسة|artifacts/yieldloop/src/pages/reports.tsx:74|
|production|رصيد الإنتاج|artifacts/yieldloop/src/pages/reports.tsx:74|
|inventory|مخزون القصاصات|artifacts/yieldloop/src/pages/reports.tsx:75|
|lots|{n} دفعات|artifacts/yieldloop/src/pages/reports.tsx:75|
|original|الأصلية|artifacts/yieldloop/src/pages/reports.tsx:76|
|remaining|المتبقية|artifacts/yieldloop/src/pages/reports.tsx:76|
|selectMaterial|اختر مادة واحدة لعرض إجماليات الكيلوغرام والنسب وأوزان المخزون. جمع مواد مختلفة يخلط كيلوغرامات غير مرتبطة.|artifacts/yieldloop/src/pages/reports.tsx:76|
|unavailable|غير متاح|artifacts/yieldloop/src/pages/reports.tsx:77|
|noData|لا توجد تسوية مسجّلة|artifacts/yieldloop/src/pages/reports.tsx:78|
|openReport|فتح التقرير المفصل|artifacts/yieldloop/src/pages/reports.tsx:78|
|openDashboard|العودة إلى اللوحة|artifacts/yieldloop/src/pages/reports.tsx:79|
|jobsTable|الأوامر|artifacts/yieldloop/src/pages/reports.tsx:79|
|lotsTable|دفعات المخزون|artifacts/yieldloop/src/pages/reports.tsx:80|
|snapshot|التسوية #{id} · المراجعة {rev} · {time}|artifacts/yieldloop/src/pages/reports.tsx:81|
|emptyTitle|لا توجد أوامر في هذه المجموعة|artifacts/yieldloop/src/pages/reports.tsx:82|
|emptyDesc|لم يُنشأ في هذا النطاق أي أمر إنتاج مرئي لك. وسّع التواريخ أو امسح عوامل التصفية.|artifacts/yieldloop/src/pages/reports.tsx:83|
|emptyLots|لا توجد دفعات مخزون من أوامر هذه المجموعة.|artifacts/yieldloop/src/pages/reports.tsx:83|
|loadError|تعذّر تحميل التقرير.|artifacts/yieldloop/src/pages/reports.tsx:84|
|notFound|المادة أو الصفحة المحددة غير موجودة أو غير مرئية لك.|artifacts/yieldloop/src/pages/reports.tsx:85|
|validation|رفض الخادم بعض عوامل التصفية. مدخلاتك محفوظة أدناه.|artifacts/yieldloop/src/pages/reports.tsx:85|
|clearFilters|مسح عوامل التصفية|artifacts/yieldloop/src/pages/reports.tsx:86|
|activeFilters|{n} نشطة|artifacts/yieldloop/src/pages/reports.tsx:91|
|kVariance|صافي الفرق|artifacts/yieldloop/src/pages/reports.tsx:93|
|attention|يحتاج انتباهًا|artifacts/yieldloop/src/pages/reports.tsx:94|
|attentionScope|فُحص أول {n} أمر في هذه المجموعة. افتح التقارير للبقية.|artifacts/yieldloop/src/pages/reports.tsx:95|
|attVariance|مادة غير محتسبة {v} كغ|artifacts/yieldloop/src/pages/reports.tsx:95|
|attNegVariance|المحتسب يزيد على المصروف بمقدار {v} كغ|artifacts/yieldloop/src/pages/reports.tsx:96|
|attUnmeasured|لا توجد تسوية بعد|artifacts/yieldloop/src/pages/reports.tsx:96|
|allClear|لا شيء مُعلَّم في هذه الأوامر.|artifacts/yieldloop/src/pages/reports.tsx:96|
|allClearSub|كل أمر مدرج مُسوّى بفرق صفري.|artifacts/yieldloop/src/pages/reports.tsx:97|
|openCutting|استوديو القص|artifacts/yieldloop/src/pages/reports.tsx:98|
|unitsNote|كل الكميات بالكيلوغرام. الفرق مادة غير محتسبة وليس هالكًا. تظهر النسب غير متاحة عند عدم صرف أي مادة.|artifacts/yieldloop/src/pages/reports.tsx:99|

### Layout and elements
Filters then current balance/count summaries, job and lot tables; shared help tooltips. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Apply/reset creation-date/status/material/timezone filters; independent job/lot pages; source links. No ordinary refresh/freshness/expanded definitions block. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useEffect, useMemo, useState, useLocation, useSearch, useFormatDate, useI18n, useReportOverview, useKt, useUt, useReportState, navigate, onSubmit, onChange, onClick.

### Data and calculations
reports/overview GET. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Dashboard and Reports repeat balance summaries; Reports must remain the detailed filtered/source view. Creation-date cohort semantics can be misunderstood as historical production.

### Original requirement mapping
Current reconciled reporting, not historical as-of. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Compare jobs

- Route: /comparison?left=:id&right=:id
- Purpose: Same-machine comparison and investigation.
- Actors allowed: UI S,M; API existing job visibility also O
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/comparison.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on jobs/machines GET; jobs GET; reports/comparison GET.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|material|Material|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:74|
|left|Left|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:88|
|right|Right|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:89|
|machine|Cutting machine|artifacts/yieldloop/src/lib/core.ts:31|
|machineUnset|Not set|artifacts/yieldloop/src/lib/core.ts:32|
|demo|Demo data|artifacts/yieldloop/src/lib/core.ts:33|
|cmpTitle|Same-machine comparison|artifacts/yieldloop/src/lib/core.ts:44|
|cmpSub|Two jobs on one machine, side by side. All values are exact server figures.|artifacts/yieldloop/src/lib/core.ts:44|
|left|Job A|artifacts/yieldloop/src/lib/core.ts:44|
|right|Job B|artifacts/yieldloop/src/lib/core.ts:45|
|pick|Search by reference or title|artifacts/yieldloop/src/lib/core.ts:45|
|pickPrompt|Select two different jobs to compare.|artifacts/yieldloop/src/lib/core.ts:45|
|sameJob|Choose two different jobs.|artifacts/yieldloop/src/lib/core.ts:45|
|diff|A − B|artifacts/yieldloop/src/lib/core.ts:51|
|kg|kg|artifacts/yieldloop/src/lib/core.ts:52|
|pp|pp|artifacts/yieldloop/src/lib/core.ts:52|
|ppNote|Rate differences are percentage points (pp), not percentage changes.|artifacts/yieldloop/src/lib/core.ts:52|
|scrapByReason|Scrap by reason|artifacts/yieldloop/src/lib/core.ts:52|
|noScrap|No scrap recorded.|artifacts/yieldloop/src/lib/core.ts:53|
|records|Source records|artifacts/yieldloop/src/lib/core.ts:53|
|openJob|Open job card|artifacts/yieldloop/src/lib/core.ts:53|
|entries|{n} entries|artifacts/yieldloop/src/lib/core.ts:53|
|noSummary|No material summary.|artifacts/yieldloop/src/lib/core.ts:53|
|loadError|Could not load the comparison.|artifacts/yieldloop/src/lib/core.ts:54|
|noJobs|No matching jobs.|artifacts/yieldloop/src/lib/core.ts:54|
|material|Material|artifacts/yieldloop/src/lib/core.ts:54|
|defs|Issued = all material issued. Good = acceptable product. Total scrap = sum of scrap categories. Offcuts = retained for reuse, not scrap. Variance = issued − (good + scrap + offcuts), must be exactly 0 to close. Good yield = good ÷ issued × 100. Scrap rate = total scrap ÷ issued × 100 (not 100 − yield). Rework is not recorded in this scope.|artifacts/yieldloop/src/lib/core.ts:54|
|navReports|Reports|artifacts/yieldloop/src/lib/i18n.tsx:8|
|retry|Retry|artifacts/yieldloop/src/lib/i18n.tsx:14|
|loadError|Could not load employees.|artifacts/yieldloop/src/lib/i18n.tsx:95|
|openJob|Open job|artifacts/yieldloop/src/lib/i18n.tsx:209|
|navReports|Reports|artifacts/yieldloop/src/lib/ui-i18n.ts:22|
|material|Material|artifacts/yieldloop/src/pages/reports.tsx:29|
|loadError|The report could not be loaded.|artifacts/yieldloop/src/pages/reports.tsx:46|
|defs|Definitions|artifacts/yieldloop/src/pages/reports.tsx:49|
|openJob|Open job|artifacts/yieldloop/src/pages/reports.tsx:60|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|material|المادة|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:292|
|left|يسار|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:306|
|right|يمين|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:307|
|machine|آلة القص|artifacts/yieldloop/src/lib/core.ts:60|
|machineUnset|غير محددة|artifacts/yieldloop/src/lib/core.ts:61|
|demo|بيانات تجريبية|artifacts/yieldloop/src/lib/core.ts:62|
|unspecified|غير محدد (لم يُذكر)|artifacts/yieldloop/src/lib/core.ts:63|
|cmpTitle|مقارنة على نفس الآلة|artifacts/yieldloop/src/lib/core.ts:73|
|cmpSub|أمران على آلة واحدة جنباً إلى جنب. جميع القيم أرقام دقيقة من الخادم.|artifacts/yieldloop/src/lib/core.ts:73|
|left|الأمر أ|artifacts/yieldloop/src/lib/core.ts:73|
|right|الأمر ب|artifacts/yieldloop/src/lib/core.ts:74|
|pick|ابحث بالمرجع أو العنوان|artifacts/yieldloop/src/lib/core.ts:74|
|pickPrompt|اختر أمرين مختلفين للمقارنة.|artifacts/yieldloop/src/lib/core.ts:74|
|sameJob|اختر أمرين مختلفين.|artifacts/yieldloop/src/lib/core.ts:74|
|diff|أ − ب|artifacts/yieldloop/src/lib/core.ts:80|
|kg|كغ|artifacts/yieldloop/src/lib/core.ts:81|
|pp|نقطة|artifacts/yieldloop/src/lib/core.ts:81|
|ppNote|فروق النسب بالنقاط المئوية وليست تغيراً نسبياً.|artifacts/yieldloop/src/lib/core.ts:81|
|scrapByReason|الهالك حسب السبب|artifacts/yieldloop/src/lib/core.ts:81|
|noScrap|لا يوجد هالك مسجل.|artifacts/yieldloop/src/lib/core.ts:82|
|records|السجلات المصدرية|artifacts/yieldloop/src/lib/core.ts:82|
|openJob|فتح بطاقة الأمر|artifacts/yieldloop/src/lib/core.ts:82|
|entries|{n} سجلات|artifacts/yieldloop/src/lib/core.ts:82|
|noSummary|لا يوجد ملخص مواد.|artifacts/yieldloop/src/lib/core.ts:82|
|loadError|تعذر تحميل المقارنة.|artifacts/yieldloop/src/lib/core.ts:83|
|noJobs|لا توجد أوامر مطابقة.|artifacts/yieldloop/src/lib/core.ts:83|
|material|المادة|artifacts/yieldloop/src/lib/core.ts:83|
|defs|المصروف = كل المادة المصروفة. الجيد = المنتج المقبول. إجمالي الهالك = مجموع فئات الهالك. البواقي = محفوظة لإعادة الاستخدام وليست هالكاً. الفرق = المصروف − (الجيد + الهالك + البواقي) ويجب أن يكون 0 تماماً للإغلاق. نسبة الإنتاج الجيد = الجيد ÷ المصروف × 100. نسبة الهالك = إجمالي الهالك ÷ المصروف × 100 (وليست 100 − المردود). إعادة التشغيل غير مسجلة في هذا النطاق.|artifacts/yieldloop/src/lib/core.ts:83|
|navReports|التقارير|artifacts/yieldloop/src/lib/i18n.tsx:417|
|retry|إعادة المحاولة|artifacts/yieldloop/src/lib/i18n.tsx:423|
|loadError|تعذّر تحميل الموظفين.|artifacts/yieldloop/src/lib/i18n.tsx:504|
|openJob|فتح الأمر|artifacts/yieldloop/src/lib/i18n.tsx:618|
|navReports|التقارير|artifacts/yieldloop/src/lib/ui-i18n.ts:97|
|material|المادة|artifacts/yieldloop/src/pages/reports.tsx:67|
|loadError|تعذّر تحميل التقرير.|artifacts/yieldloop/src/pages/reports.tsx:84|
|defs|التعريفات|artifacts/yieldloop/src/pages/reports.tsx:87|
|openJob|فتح الأمر|artifacts/yieldloop/src/pages/reports.tsx:98|

### Layout and elements
Two selectors then side-by-side measures/differences and supporting facts. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Choose jobs on same machine; inspect rates, category breakdown, differences, source/evidence links. Incompatible or missing measurements must not imply meaningful weight comparison. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useEffect, useState, useLocation, useSearch, useJobs, useComparison, useKt, useI18n, onChange, onClick.

### Data and calculations
jobs/machines GET; jobs GET; reports/comparison GET. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Retained layout and long dynamic labels require representative record-based visual review; no new page-specific visual defect is claimed without observation.

### Original requirement mapping
Same-machine comparison and investigation. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Cutting Studio

- Route: /cutting
- Purpose: Optional geometry entry.
- Actors allowed: O,S,M view accessible jobs
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/cutting-entry.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on jobs GET.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|retry|Retry|artifacts/yieldloop/src/lib/i18n.tsx:14|
|noJobMatches|No jobs match these filters.|artifacts/yieldloop/src/lib/i18n.tsx:181|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|retry|إعادة المحاولة|artifacts/yieldloop/src/lib/i18n.tsx:423|
|noJobMatches|لا توجد أوامر تطابق هذه المرشحات.|artifacts/yieldloop/src/lib/i18n.tsx:590|

### Layout and elements
Compact job picker/list and proposal-only guidance. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Search/page accessible jobs then open job cutting workspace; not a standalone material consumption operation. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useEffect, useRef, useState, useJobs, useI18n, useCt, onChange, onClick.

### Data and calculations
jobs GET. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Retained layout and long dynamic labels require representative record-based visual review; no new page-specific visual defect is claimed without observation.

### Original requirement mapping
Optional geometry entry. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Cutting Studio

- Route: /jobs/:id/cutting
- Purpose: Optional nesting; never kg accounting or inventory transfer.
- Actors allowed: O view only Open; M edit Draft/Open; S edit Open
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/cutting-studio.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on jobs/:id/cutting GET/POST; cutting/evaluate POST; cutting/:plan PUT/GET; history GET.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|retry|Retry|artifacts/yieldloop/src/lib/i18n.tsx:14|
|jobLoadError|Could not load this job.|artifacts/yieldloop/src/lib/i18n.tsx:195|
|err_not_found|This job does not exist or is not visible to you.|artifacts/yieldloop/src/lib/i18n.tsx:226|
|jobNotFoundTitle|Job not available|artifacts/yieldloop/src/lib/i18n.tsx:227|
|showPlans|Show plans|artifacts/yieldloop/src/lib/ui-i18n.ts:43|
|hidePlans|Hide plans|artifacts/yieldloop/src/lib/ui-i18n.ts:44|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|retry|إعادة المحاولة|artifacts/yieldloop/src/lib/i18n.tsx:423|
|jobLoadError|تعذّر تحميل هذا الأمر.|artifacts/yieldloop/src/lib/i18n.tsx:604|
|err_not_found|هذا الأمر غير موجود أو غير مرئي لك.|artifacts/yieldloop/src/lib/i18n.tsx:635|
|jobNotFoundTitle|الأمر غير متاح|artifacts/yieldloop/src/lib/i18n.tsx:636|
|showPlans|عرض الخطط|artifacts/yieldloop/src/lib/ui-i18n.ts:118|
|hidePlans|إخفاء الخطط|artifacts/yieldloop/src/lib/ui-i18n.ts:119|

### Layout and elements
Desktop setup/layout/results columns; mobile Setup/Layout/Results tabs keep hidden panels mounted; numeric placement controls; scrollable plan/history lists. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Board/part numeric inputs, copies/rotation; evaluate baseline; manual mouse/keyboard/touch handlers; live boundary/margin/overlap/kerf validation; scenario selection/duplication/comparison; save/revise with reason/revision; reopen/history. Editing inputs warns that placements/results clear. Disabled/read-only for unsupported roles/states. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useRef, useState, useLocation, useJob, useI18n, useCt, useUt, onClick, navigate.

### Data and calculations
jobs/:id/cutting GET/POST; cutting/evaluate POST; cutting/:plan PUT/GET; history GET. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Setup, scenarios, history and geometry create a dense specialist workspace. Touch execution and physical-device ergonomics remain unverified in this audit.

### Original requirement mapping
Optional nesting; never kg accounting or inventory transfer. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Production assistant / evidence

- Route: /assistant?job_id=:id
- Purpose: Optional advisory; not causal proof.
- Actors allowed: O,S,M authorized job scope; no primary sidebar link
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/assistant.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on jobs GET; jobs/:id/assistance/evidence GET; assistance/status GET; jobs/:id/assistance POST only available provider.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|defs|Issued = all material issued. Good = acceptable product. Total scrap = sum of scrap categories. Offcuts = retained for reuse, not scrap. Variance = issued − (good + scrap + offcuts), must be exactly 0 to close. Good yield = good ÷ issued × 100. Scrap rate = total scrap ÷ issued × 100 (not 100 − yield). Rework is not recorded in this scope.|artifacts/yieldloop/src/lib/core.ts:54|
|largestScrap|Largest scrap category|artifacts/yieldloop/src/lib/core.ts:55|
|largestScrapNote|Calculated from all active scrap records. Not AI — available even when the assistant provider is offline.|artifacts/yieldloop/src/lib/core.ts:56|
|noLargestScrap|No active scrap recorded.|artifacts/yieldloop/src/lib/core.ts:56|
|asTitle|Production assistant|artifacts/yieldloop/src/lib/feature-i18n.ts:4|
|asLead|Read the recorded evidence for one job, then optionally ask an advisory question. Facts and kg calculations come from YieldLoop records, never from the model.|artifacts/yieldloop/src/lib/feature-i18n.ts:5|
|asPickJob|Job|artifacts/yieldloop/src/lib/feature-i18n.ts:6|
|asSearchJobs|Search job number or title|artifacts/yieldloop/src/lib/feature-i18n.ts:7|
|asNoJobs|No jobs match.|artifacts/yieldloop/src/lib/feature-i18n.ts:8|
|asJobUnavailable|This job was not found or is not available to your account. Choose another job.|artifacts/yieldloop/src/lib/feature-i18n.ts:9|
|asChooseJob|Choose a job to load its evidence.|artifacts/yieldloop/src/lib/feature-i18n.ts:10|
|asEvidence|Recorded evidence|artifacts/yieldloop/src/lib/feature-i18n.ts:11|
|asEvidenceBadge|From YieldLoop records — not AI-generated|artifacts/yieldloop/src/lib/feature-i18n.ts:12|
|asGenerated|Snapshot taken|artifacts/yieldloop/src/lib/feature-i18n.ts:13|
|asRevision|Job revision {r} · material revision {m}|artifacts/yieldloop/src/lib/feature-i18n.ts:14|
|asFacts|Recorded facts|artifacts/yieldloop/src/lib/feature-i18n.ts:15|
|asNoFacts|No recorded quantities for this job yet.|artifacts/yieldloop/src/lib/feature-i18n.ts:16|
|asVoided|Voided|artifacts/yieldloop/src/lib/feature-i18n.ts:17|
|asFindings|Calculated kg findings|artifacts/yieldloop/src/lib/feature-i18n.ts:18|
|asFindingsNote|Computed by the server from the authoritative kg snapshot.|artifacts/yieldloop/src/lib/feature-i18n.ts:19|
|asNoFindings|No kg summary is available yet — record issued, good, scrap and offcut first.|artifacts/yieldloop/src/lib/feature-i18n.ts:20|
|asCutting|Cutting plans (geometry, not kg)|artifacts/yieldloop/src/lib/feature-i18n.ts:21|
|asCuttingNote|Geometric plan metrics. These are not measured material and are never added to kg accounting.|artifacts/yieldloop/src/lib/feature-i18n.ts:22|
|asNoCutting|No cutting plans saved for this job.|artifacts/yieldloop/src/lib/feature-i18n.ts:23|
|asScenario|Scenario {n}|artifacts/yieldloop/src/lib/feature-i18n.ts:24|
|asNoMetrics|No interpretable metrics in this scenario.|artifacts/yieldloop/src/lib/feature-i18n.ts:25|
|asLimitations|Limitations|artifacts/yieldloop/src/lib/feature-i18n.ts:26|
|f_created_at|Summary recorded|artifacts/yieldloop/src/lib/feature-i18n.ts:79|
|retry|Retry|artifacts/yieldloop/src/lib/i18n.tsx:14|
|asstAskThis|Ask the assistant|artifacts/yieldloop/src/lib/ui-i18n.ts:74|
|defs|Definitions|artifacts/yieldloop/src/pages/reports.tsx:49|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|unspecified|غير محدد (لم يُذكر)|artifacts/yieldloop/src/lib/core.ts:63|
|defs|المصروف = كل المادة المصروفة. الجيد = المنتج المقبول. إجمالي الهالك = مجموع فئات الهالك. البواقي = محفوظة لإعادة الاستخدام وليست هالكاً. الفرق = المصروف − (الجيد + الهالك + البواقي) ويجب أن يكون 0 تماماً للإغلاق. نسبة الإنتاج الجيد = الجيد ÷ المصروف × 100. نسبة الهالك = إجمالي الهالك ÷ المصروف × 100 (وليست 100 − المردود). إعادة التشغيل غير مسجلة في هذا النطاق.|artifacts/yieldloop/src/lib/core.ts:83|
|largestScrap|أكبر فئة هالك|artifacts/yieldloop/src/lib/core.ts:84|
|largestScrapNote|محسوبة من جميع سجلات الهالك النشطة. ليست ذكاءً اصطناعياً — متاحة حتى عند تعطل مزود المساعد.|artifacts/yieldloop/src/lib/core.ts:85|
|noLargestScrap|لا يوجد هالك نشط مسجل.|artifacts/yieldloop/src/lib/core.ts:85|
|asJobUnavailable|لم يُعثر على هذا الأمر أو أنه غير متاح لحسابك. اختر أمرًا آخر.|artifacts/yieldloop/src/lib/feature-i18n.ts:121|
|asTitle|مساعد الإنتاج|artifacts/yieldloop/src/lib/feature-i18n.ts:122|
|asLead|اقرأ الأدلة المسجّلة لأمر عمل واحد، ثم اطرح سؤالًا استشاريًا إن شئت. الحقائق وحسابات الكيلوغرام تأتي من سجلات YieldLoop وليس من النموذج.|artifacts/yieldloop/src/lib/feature-i18n.ts:123|
|asPickJob|أمر العمل|artifacts/yieldloop/src/lib/feature-i18n.ts:124|
|asSearchJobs|ابحث برقم الأمر أو العنوان|artifacts/yieldloop/src/lib/feature-i18n.ts:125|
|asNoJobs|لا توجد أوامر مطابقة.|artifacts/yieldloop/src/lib/feature-i18n.ts:125|
|asChooseJob|اختر أمر عمل لتحميل أدلته.|artifacts/yieldloop/src/lib/feature-i18n.ts:125|
|asEvidence|الأدلة المسجّلة|artifacts/yieldloop/src/lib/feature-i18n.ts:126|
|asEvidenceBadge|من سجلات YieldLoop — ليست من إنتاج الذكاء الاصطناعي|artifacts/yieldloop/src/lib/feature-i18n.ts:126|
|asGenerated|وقت اللقطة|artifacts/yieldloop/src/lib/feature-i18n.ts:126|
|asRevision|مراجعة الأمر {r} · مراجعة المواد {m}|artifacts/yieldloop/src/lib/feature-i18n.ts:127|
|asFacts|الحقائق المسجّلة|artifacts/yieldloop/src/lib/feature-i18n.ts:127|
|asNoFacts|لا توجد كميات مسجّلة لهذا الأمر بعد.|artifacts/yieldloop/src/lib/feature-i18n.ts:127|
|asVoided|ملغاة|artifacts/yieldloop/src/lib/feature-i18n.ts:128|
|asFindings|نتائج الكيلوغرام المحسوبة|artifacts/yieldloop/src/lib/feature-i18n.ts:128|
|asFindingsNote|يحسبها الخادم من لقطة الكيلوغرام المعتمدة.|artifacts/yieldloop/src/lib/feature-i18n.ts:128|
|asNoFindings|لا يتوفر ملخص بالكيلوغرام بعد — سجّل المصروف والجيد والهالك والفضلات أولًا.|artifacts/yieldloop/src/lib/feature-i18n.ts:129|
|asCutting|خطط القص (هندسية وليست كيلوغرام)|artifacts/yieldloop/src/lib/feature-i18n.ts:129|
|asCuttingNote|مقاييس هندسية للخطة. ليست مادة مقيسة ولا تُضاف إلى حساب الكيلوغرام.|artifacts/yieldloop/src/lib/feature-i18n.ts:130|
|asNoCutting|لا توجد خطط قص محفوظة لهذا الأمر.|artifacts/yieldloop/src/lib/feature-i18n.ts:130|
|asScenario|السيناريو {n}|artifacts/yieldloop/src/lib/feature-i18n.ts:131|
|asNoMetrics|لا توجد مقاييس قابلة للعرض في هذا السيناريو.|artifacts/yieldloop/src/lib/feature-i18n.ts:131|
|asLimitations|القيود|artifacts/yieldloop/src/lib/feature-i18n.ts:131|
|f_created_at|وقت تسجيل الملخص|artifacts/yieldloop/src/lib/feature-i18n.ts:162|
|retry|إعادة المحاولة|artifacts/yieldloop/src/lib/i18n.tsx:423|
|asstAskThis|اسأل المساعد|artifacts/yieldloop/src/lib/ui-i18n.ts:149|
|defs|التعريفات|artifacts/yieldloop/src/pages/reports.tsx:87|

### Layout and elements
Job selector plus evidence sections; configured floating panel logical end (right EN/left AR). No unavailable-provider banner or dead input. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Select accessible job; read recorded facts, calculated findings, largest scrap category, geometry and limitations. Floating panel only server available: question, consent, optional notes, submit, close; evidence revisions invalidate stale answers. Comparison suggestions hidden for Operator. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useState, useLocation, useSearch, useFormatDate, useEvidence, useAssistantPanel, useUt, useFt, useI18n, useJobs, useKt, navigate, onChange, onClick.

### Data and calculations
jobs GET; jobs/:id/assistance/evidence GET; assistance/status GET; jobs/:id/assistance POST only available provider. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Useful evidence is difficult to discover without a sidebar item; a long factual evidence page remains despite compact AI interaction.

### Original requirement mapping
Optional advisory; not causal proof. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Employees

- Route: /employees
- Purpose: Additional account administration.
- Actors allowed: M only frontend and backend
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/employees.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on employees GET/POST; employees/:id PATCH; employees/:id/password POST.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|resetTitle|Remove all placements?|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:140|
|resetDesc|Every placed part in this scenario is removed. Inputs are kept.|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:141|
|loadError|Could not load the comparison.|artifacts/yieldloop/src/lib/core.ts:54|
|retry|Retry|artifacts/yieldloop/src/lib/i18n.tsx:14|
|username|Username|artifacts/yieldloop/src/lib/i18n.tsx:47|
|roleLabel|Role|artifacts/yieldloop/src/lib/i18n.tsx:61|
|active|Active|artifacts/yieldloop/src/lib/i18n.tsx:68|
|inactive|Inactive|artifacts/yieldloop/src/lib/i18n.tsx:69|
|empTitle|Employees|artifacts/yieldloop/src/lib/i18n.tsx:76|
|empSubtitle|Create accounts, assign roles, control access and issue temporary passwords. Temporary passwords are never shown again after you submit them.|artifacts/yieldloop/src/lib/i18n.tsx:77|
|addEmployee|Add employee|artifacts/yieldloop/src/lib/i18n.tsx:78|
|searchEmployees|Search by name or username|artifacts/yieldloop/src/lib/i18n.tsx:79|
|colEmployee|Employee|artifacts/yieldloop/src/lib/i18n.tsx:80|
|colRole|Role|artifacts/yieldloop/src/lib/i18n.tsx:81|
|colStatus|Status|artifacts/yieldloop/src/lib/i18n.tsx:82|
|colPassword|Password|artifacts/yieldloop/src/lib/i18n.tsx:83|
|colActions|Actions|artifacts/yieldloop/src/lib/i18n.tsx:84|
|you|You|artifacts/yieldloop/src/lib/i18n.tsx:85|
|pwdTemporary|Temporary, must change|artifacts/yieldloop/src/lib/i18n.tsx:86|
|pwdExpired|Temporary, expired|artifacts/yieldloop/src/lib/i18n.tsx:87|
|pwdSet|Set by employee|artifacts/yieldloop/src/lib/i18n.tsx:88|
|resetPassword|Reset password|artifacts/yieldloop/src/lib/i18n.tsx:89|
|deactivate|Deactivate|artifacts/yieldloop/src/lib/i18n.tsx:90|
|activate|Activate|artifacts/yieldloop/src/lib/i18n.tsx:91|
|emptyEmployees|No employees yet|artifacts/yieldloop/src/lib/i18n.tsx:92|
|emptyEmployeesDesc|Add the first account to give someone access.|artifacts/yieldloop/src/lib/i18n.tsx:93|
|noMatches|No employees match "{q}".|artifacts/yieldloop/src/lib/i18n.tsx:94|
|loadError|Could not load employees.|artifacts/yieldloop/src/lib/i18n.tsx:95|
|createTitle|New employee account|artifacts/yieldloop/src/lib/i18n.tsx:96|
|createDesc|Share the temporary password with the employee privately. They must replace it at first sign-in.|artifacts/yieldloop/src/lib/i18n.tsx:97|
|firstName|First name|artifacts/yieldloop/src/lib/i18n.tsx:98|
|lastName|Last name|artifacts/yieldloop/src/lib/i18n.tsx:99|
|optional|optional|artifacts/yieldloop/src/lib/i18n.tsx:100|
|temporaryPassword|Temporary password|artifacts/yieldloop/src/lib/i18n.tsx:101|
|tempHint|Not stored in this browser and never shown again.|artifacts/yieldloop/src/lib/i18n.tsx:102|
|cancel|Cancel|artifacts/yieldloop/src/lib/i18n.tsx:103|
|create|Create account|artifacts/yieldloop/src/lib/i18n.tsx:104|
|creating|Creating|artifacts/yieldloop/src/lib/i18n.tsx:105|
|created|Account created for {name}.|artifacts/yieldloop/src/lib/i18n.tsx:106|
|resetTitle|Reset password for {name}|artifacts/yieldloop/src/lib/i18n.tsx:107|
|resetDesc|The employee will be signed out and must set a new password with this temporary one.|artifacts/yieldloop/src/lib/i18n.tsx:108|
|resetSubmit|Set temporary password|artifacts/yieldloop/src/lib/i18n.tsx:109|
|resetting|Saving|artifacts/yieldloop/src/lib/i18n.tsx:110|
|resetDone|Temporary password set for {name}.|artifacts/yieldloop/src/lib/i18n.tsx:111|
|roleUpdated|{name} is now {role}.|artifacts/yieldloop/src/lib/i18n.tsx:112|
|deactivateTitle|Deactivate {name}?|artifacts/yieldloop/src/lib/i18n.tsx:113|
|deactivateDesc|They will be signed out and unable to sign in until reactivated.|artifacts/yieldloop/src/lib/i18n.tsx:114|
|activated|{name} can sign in again.|artifacts/yieldloop/src/lib/i18n.tsx:115|
|deactivated|{name} has been deactivated.|artifacts/yieldloop/src/lib/i18n.tsx:116|
|allRoles|All roles|artifacts/yieldloop/src/lib/ui-i18n.ts:24|
|colStatus|Status|artifacts/yieldloop/src/pages/reports.tsx:42|
|loadError|The report could not be loaded.|artifacts/yieldloop/src/pages/reports.tsx:46|
|colActions||artifacts/yieldloop/src/pages/reports.tsx:61|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|resetTitle|إزالة جميع المواضع؟|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:358|
|resetDesc|تُزال كل القطع الموضوعة في هذا السيناريو. تبقى المدخلات.|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:359|
|loadError|تعذر تحميل المقارنة.|artifacts/yieldloop/src/lib/core.ts:83|
|retry|إعادة المحاولة|artifacts/yieldloop/src/lib/i18n.tsx:423|
|username|اسم المستخدم|artifacts/yieldloop/src/lib/i18n.tsx:456|
|roleLabel|الدور|artifacts/yieldloop/src/lib/i18n.tsx:470|
|active|نشط|artifacts/yieldloop/src/lib/i18n.tsx:477|
|inactive|غير نشط|artifacts/yieldloop/src/lib/i18n.tsx:478|
|empTitle|الموظفون|artifacts/yieldloop/src/lib/i18n.tsx:485|
|empSubtitle|أنشئ الحسابات وعيّن الأدوار وتحكّم في الوصول وأصدر كلمات مرور مؤقتة. لا تُعرض كلمات المرور المؤقتة مرة أخرى بعد إرسالها.|artifacts/yieldloop/src/lib/i18n.tsx:486|
|addEmployee|إضافة موظف|artifacts/yieldloop/src/lib/i18n.tsx:487|
|searchEmployees|ابحث بالاسم أو اسم المستخدم|artifacts/yieldloop/src/lib/i18n.tsx:488|
|colEmployee|الموظف|artifacts/yieldloop/src/lib/i18n.tsx:489|
|colRole|الدور|artifacts/yieldloop/src/lib/i18n.tsx:490|
|colStatus|الحالة|artifacts/yieldloop/src/lib/i18n.tsx:491|
|colPassword|كلمة المرور|artifacts/yieldloop/src/lib/i18n.tsx:492|
|colActions|الإجراءات|artifacts/yieldloop/src/lib/i18n.tsx:493|
|you|أنت|artifacts/yieldloop/src/lib/i18n.tsx:494|
|pwdTemporary|مؤقتة، يجب تغييرها|artifacts/yieldloop/src/lib/i18n.tsx:495|
|pwdExpired|مؤقتة، منتهية الصلاحية|artifacts/yieldloop/src/lib/i18n.tsx:496|
|pwdSet|عيّنها الموظف|artifacts/yieldloop/src/lib/i18n.tsx:497|
|resetPassword|إعادة تعيين كلمة المرور|artifacts/yieldloop/src/lib/i18n.tsx:498|
|deactivate|إلغاء التفعيل|artifacts/yieldloop/src/lib/i18n.tsx:499|
|activate|تفعيل|artifacts/yieldloop/src/lib/i18n.tsx:500|
|emptyEmployees|لا يوجد موظفون بعد|artifacts/yieldloop/src/lib/i18n.tsx:501|
|emptyEmployeesDesc|أضف الحساب الأول لمنح أحدهم إمكانية الوصول.|artifacts/yieldloop/src/lib/i18n.tsx:502|
|noMatches|لا يوجد موظفون يطابقون "{q}".|artifacts/yieldloop/src/lib/i18n.tsx:503|
|loadError|تعذّر تحميل الموظفين.|artifacts/yieldloop/src/lib/i18n.tsx:504|
|createTitle|حساب موظف جديد|artifacts/yieldloop/src/lib/i18n.tsx:505|
|createDesc|شارك كلمة المرور المؤقتة مع الموظف بشكل خاص. يجب عليه استبدالها عند أول تسجيل دخول.|artifacts/yieldloop/src/lib/i18n.tsx:506|
|firstName|الاسم الأول|artifacts/yieldloop/src/lib/i18n.tsx:507|
|lastName|اسم العائلة|artifacts/yieldloop/src/lib/i18n.tsx:508|
|optional|اختياري|artifacts/yieldloop/src/lib/i18n.tsx:509|
|temporaryPassword|كلمة المرور المؤقتة|artifacts/yieldloop/src/lib/i18n.tsx:510|
|tempHint|لا تُحفظ في هذا المتصفح ولن تُعرض مرة أخرى.|artifacts/yieldloop/src/lib/i18n.tsx:511|
|cancel|إلغاء|artifacts/yieldloop/src/lib/i18n.tsx:512|
|create|إنشاء الحساب|artifacts/yieldloop/src/lib/i18n.tsx:513|
|creating|جارٍ الإنشاء|artifacts/yieldloop/src/lib/i18n.tsx:514|
|created|تم إنشاء حساب {name}.|artifacts/yieldloop/src/lib/i18n.tsx:515|
|resetTitle|إعادة تعيين كلمة مرور {name}|artifacts/yieldloop/src/lib/i18n.tsx:516|
|resetDesc|سيُسجَّل خروج الموظف ويجب عليه تعيين كلمة مرور جديدة باستخدام هذه الكلمة المؤقتة.|artifacts/yieldloop/src/lib/i18n.tsx:517|
|resetSubmit|تعيين كلمة مرور مؤقتة|artifacts/yieldloop/src/lib/i18n.tsx:518|
|resetting|جارٍ الحفظ|artifacts/yieldloop/src/lib/i18n.tsx:519|
|resetDone|تم تعيين كلمة مرور مؤقتة لـ {name}.|artifacts/yieldloop/src/lib/i18n.tsx:520|
|roleUpdated|أصبح {name} بدور {role}.|artifacts/yieldloop/src/lib/i18n.tsx:521|
|deactivateTitle|إلغاء تفعيل {name}؟|artifacts/yieldloop/src/lib/i18n.tsx:522|
|deactivateDesc|سيُسجَّل خروجه ولن يتمكن من تسجيل الدخول حتى يُعاد تفعيله.|artifacts/yieldloop/src/lib/i18n.tsx:523|
|activated|يمكن لـ {name} تسجيل الدخول مجددًا.|artifacts/yieldloop/src/lib/i18n.tsx:524|
|deactivated|تم إلغاء تفعيل {name}.|artifacts/yieldloop/src/lib/i18n.tsx:525|
|allRoles|كل الأدوار|artifacts/yieldloop/src/lib/ui-i18n.ts:99|
|colStatus|الحالة|artifacts/yieldloop/src/pages/reports.tsx:80|
|loadError|تعذّر تحميل التقرير.|artifacts/yieldloop/src/pages/reports.tsx:84|
|colActions||artifacts/yieldloop/src/pages/reports.tsx:99|

### Layout and elements
Employee list, roles/activation, action dialogs and validation. Passwords are never included in this inventory. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Search/filter; local 15-row paging; create temporary-password account; role/active changes; reset password; confirm consequential actions. Self-demotion/last-active-manager protections on server. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useMemo, useState, useUt, useMutation, useQueryClient, useToast, useEmployees, useI18n, onSubmit, onChange, onClick.

### Data and calculations
employees GET/POST; employees/:id PATCH; employees/:id/password POST. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Paging hides server-list growth: API still returns all employees; frontend paging is not server scalability.

### Original requirement mapping
Additional account administration. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Change password

- Route: /password
- Purpose: Account safety, not factory accounting.
- Actors allowed: All authenticated; forced-change gate supersedes other routes
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/password.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on auth/password POST; auth/logout POST.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|saving|Saving|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:33|
|pwdTitle|Change password|artifacts/yieldloop/src/lib/i18n.tsx:120|
|pwdSubtitle|After a successful change you will be signed out and asked to sign in again.|artifacts/yieldloop/src/lib/i18n.tsx:121|
|pwdRequiredTitle|Set your own password|artifacts/yieldloop/src/lib/i18n.tsx:122|
|pwdRequiredDesc|You signed in with a temporary password. Replace it before using YieldLoop.|artifacts/yieldloop/src/lib/i18n.tsx:123|
|pwdExpiredTitle|Temporary password expired|artifacts/yieldloop/src/lib/i18n.tsx:124|
|pwdExpiredDesc|Your temporary password is no longer valid and cannot be changed. Ask a Manager to reset it, then sign in with the new temporary password.|artifacts/yieldloop/src/lib/i18n.tsx:125|
|currentPassword|Current password|artifacts/yieldloop/src/lib/i18n.tsx:126|
|currentTempPassword|Temporary password|artifacts/yieldloop/src/lib/i18n.tsx:127|
|newPassword|New password|artifacts/yieldloop/src/lib/i18n.tsx:128|
|confirmPassword|Confirm new password|artifacts/yieldloop/src/lib/i18n.tsx:129|
|mismatch|The new passwords do not match.|artifacts/yieldloop/src/lib/i18n.tsx:130|
|sameAsCurrent|Choose a password different from the current one.|artifacts/yieldloop/src/lib/i18n.tsx:131|
|required|This field is required.|artifacts/yieldloop/src/lib/i18n.tsx:132|
|savePassword|Change password|artifacts/yieldloop/src/lib/i18n.tsx:133|
|saving|Saving|artifacts/yieldloop/src/lib/i18n.tsx:134|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|saving|جارٍ الحفظ|artifacts/yieldloop/src/components/cutting/cutting-i18n.ts:251|
|pwdTitle|تغيير كلمة المرور|artifacts/yieldloop/src/lib/i18n.tsx:529|
|pwdSubtitle|بعد التغيير بنجاح سيتم تسجيل خروجك وستُطالب بتسجيل الدخول مجددًا.|artifacts/yieldloop/src/lib/i18n.tsx:530|
|pwdRequiredTitle|عيّن كلمة مرورك الخاصة|artifacts/yieldloop/src/lib/i18n.tsx:531|
|pwdRequiredDesc|سجّلت الدخول بكلمة مرور مؤقتة. استبدلها قبل استخدام YieldLoop.|artifacts/yieldloop/src/lib/i18n.tsx:532|
|pwdExpiredTitle|انتهت صلاحية كلمة المرور المؤقتة|artifacts/yieldloop/src/lib/i18n.tsx:533|
|pwdExpiredDesc|لم تعد كلمة المرور المؤقتة صالحة ولا يمكن تغييرها. اطلب من المدير إعادة تعيينها، ثم سجّل الدخول بكلمة المرور المؤقتة الجديدة.|artifacts/yieldloop/src/lib/i18n.tsx:534|
|currentPassword|كلمة المرور الحالية|artifacts/yieldloop/src/lib/i18n.tsx:535|
|currentTempPassword|كلمة المرور المؤقتة|artifacts/yieldloop/src/lib/i18n.tsx:536|
|newPassword|كلمة المرور الجديدة|artifacts/yieldloop/src/lib/i18n.tsx:537|
|confirmPassword|تأكيد كلمة المرور الجديدة|artifacts/yieldloop/src/lib/i18n.tsx:538|
|mismatch|كلمتا المرور الجديدتان غير متطابقتين.|artifacts/yieldloop/src/lib/i18n.tsx:539|
|sameAsCurrent|اختر كلمة مرور مختلفة عن الحالية.|artifacts/yieldloop/src/lib/i18n.tsx:540|
|required|هذا الحقل مطلوب.|artifacts/yieldloop/src/lib/i18n.tsx:541|
|savePassword|تغيير كلمة المرور|artifacts/yieldloop/src/lib/i18n.tsx:542|
|saving|جارٍ الحفظ|artifacts/yieldloop/src/lib/i18n.tsx:543|

### Layout and elements
Focused form; minimal shell when forced; account language menu. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Current/new/confirmation validation; successful change clears frontend session and returns login notice; expired temporary password shows recovery guidance/sign out. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useState, useMutation, useQueryClient, useLocation, useI18n, navigate, onSubmit, onChange.

### Data and calculations
auth/password POST; auth/logout POST. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Retained layout and long dynamic labels require representative record-based visual review; no new page-specific visual defect is claimed without observation.

### Original requirement mapping
Account safety, not factory accounting. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Packaging concepts

- Route: /packaging
- Purpose: Beyond original core; conceptual only.
- Actors allowed: All authenticated direct; only S,M sidebar; no production entity
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/packaging.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on packaging/templates GET; packaging/validate POST; propose POST only available provider.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|asUnavailable|AI provider not configured|artifacts/yieldloop/src/lib/feature-i18n.ts:37|
|pkTitle|3D packaging concept|artifacts/yieldloop/src/lib/feature-i18n.ts:54|
|pkLead|Model a tray, sleeve or lid box from internal dimensions in mm. Every panel has its real thickness. Server-validated geometry only.|artifacts/yieldloop/src/lib/feature-i18n.ts:55|
|pkConceptBadge|Concept — not manufacturable|artifacts/yieldloop/src/lib/feature-i18n.ts:56|
|pkConceptNote|This is a geometric concept, not a production-validated design, dieline or cutting plan. It is not saved to YieldLoop.|artifacts/yieldloop/src/lib/feature-i18n.ts:57|
|pkTemplate|Template|artifacts/yieldloop/src/lib/feature-i18n.ts:58|
|pkName|Concept name|artifacts/yieldloop/src/lib/feature-i18n.ts:59|
|pkState|View|artifacts/yieldloop/src/lib/feature-i18n.ts:60|
|pkOpenTray|Open shows separated panels (exploded), not an unfolded dieline.|artifacts/yieldloop/src/lib/feature-i18n.ts:62|
|pkOpenLid|Open shows the lid lifted straight up. No hinge is modelled.|artifacts/yieldloop/src/lib/feature-i18n.ts:63|
|pkSleeveNoOpen|Sleeves have no open view.|artifacts/yieldloop/src/lib/feature-i18n.ts:64|
|pkDims|Internal dimensions (mm)|artifacts/yieldloop/src/lib/feature-i18n.ts:65|
|pkValidate|Validate & render|artifacts/yieldloop/src/lib/feature-i18n.ts:66|
|pkValidating|Validating…|artifacts/yieldloop/src/lib/feature-i18n.ts:67|
|pkStale|Stale preview: it still shows the last validated concept ({state}). Your name, dimension or view changes are pending — press Validate changes to update it.|artifacts/yieldloop/src/lib/feature-i18n.ts:68|
|pkStaleTag|Stale|artifacts/yieldloop/src/lib/feature-i18n.ts:69|
|pkUpdate|Validate changes|artifacts/yieldloop/src/lib/feature-i18n.ts:70|
|e_required_max_160|Name is required (max 160 characters)|artifacts/yieldloop/src/lib/feature-i18n.ts:74|
|e_invalid_fields|Some fields are invalid. Check the highlighted values.|artifacts/yieldloop/src/lib/feature-i18n.ts:74|
|pkEmptyView|Enter all dimensions and validate to render the concept.|artifacts/yieldloop/src/lib/feature-i18n.ts:80|
|pkSummary|Dimension summary|artifacts/yieldloop/src/lib/feature-i18n.ts:81|
|pkInternal|Internal L × W × H|artifacts/yieldloop/src/lib/feature-i18n.ts:82|
|pkExternal|External envelope (assembled)|artifacts/yieldloop/src/lib/feature-i18n.ts:83|
|pkPanels|{n} panels, {t} mm thick|artifacts/yieldloop/src/lib/feature-i18n.ts:84|
|pkExport|Export JSON|artifacts/yieldloop/src/lib/feature-i18n.ts:85|
|pkImport|Import JSON|artifacts/yieldloop/src/lib/feature-i18n.ts:86|
|pkImported|Concept imported and validated by the server.|artifacts/yieldloop/src/lib/feature-i18n.ts:87|
|pkPropose|Describe a package|artifacts/yieldloop/src/lib/feature-i18n.ts:92|
|pkProposeHint|The AI suggests a template and dimensions. You review and apply them; nothing renders until the server validates.|artifacts/yieldloop/src/lib/feature-i18n.ts:93|
|pkDescription|Description|artifacts/yieldloop/src/lib/feature-i18n.ts:94|
|pkDescriptionPh|e.g. A shallow tray for six 80 mm jars, 3 mm board|artifacts/yieldloop/src/lib/feature-i18n.ts:95|
|pkSuggest|Suggest|artifacts/yieldloop/src/lib/feature-i18n.ts:96|
|pkSuggesting|Suggesting…|artifacts/yieldloop/src/lib/feature-i18n.ts:97|
|pkReview|Review suggestion|artifacts/yieldloop/src/lib/feature-i18n.ts:98|
|pkMissing|Missing|artifacts/yieldloop/src/lib/feature-i18n.ts:99|
|pkAssumptions|Assumptions|artifacts/yieldloop/src/lib/feature-i18n.ts:100|
|pkNoTemplate|No supported template fits this description.|artifacts/yieldloop/src/lib/feature-i18n.ts:101|
|pkApply|Apply to form|artifacts/yieldloop/src/lib/feature-i18n.ts:102|
|pkDiscard|Discard|artifacts/yieldloop/src/lib/feature-i18n.ts:103|
|pkApplied|Suggestion applied. Validate to render.|artifacts/yieldloop/src/lib/feature-i18n.ts:104|
|pkRetry|Retry|artifacts/yieldloop/src/lib/feature-i18n.ts:106|
|pkTemplatesError|Could not load packaging templates.|artifacts/yieldloop/src/lib/feature-i18n.ts:107|
|v_title|3D concept view|artifacts/yieldloop/src/lib/feature-i18n.ts:111|
|p_lid_height|Lid height|artifacts/yieldloop/src/lib/feature-i18n.ts:118|
|p_clearance|Lid clearance|artifacts/yieldloop/src/lib/feature-i18n.ts:118|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|asUnavailable|مزوّد الذكاء الاصطناعي غير مهيّأ|artifacts/yieldloop/src/lib/feature-i18n.ts:136|
|pkTitle|تصوّر تغليف ثلاثي الأبعاد|artifacts/yieldloop/src/lib/feature-i18n.ts:144|
|pkLead|صمّم صينية أو غلافًا أو علبة بغطاء من الأبعاد الداخلية بالمليمتر. لكل لوح سماكته الحقيقية. هندسة يتحقق منها الخادم فقط.|artifacts/yieldloop/src/lib/feature-i18n.ts:145|
|pkConceptBadge|تصوّر — غير قابل للتصنيع|artifacts/yieldloop/src/lib/feature-i18n.ts:146|
|pkConceptNote|هذا تصوّر هندسي وليس تصميمًا معتمدًا للإنتاج أو قالب قص أو خطة قص. لا يُحفظ في YieldLoop.|artifacts/yieldloop/src/lib/feature-i18n.ts:147|
|pkTemplate|القالب|artifacts/yieldloop/src/lib/feature-i18n.ts:148|
|pkName|اسم التصوّر|artifacts/yieldloop/src/lib/feature-i18n.ts:149|
|pkState|العرض|artifacts/yieldloop/src/lib/feature-i18n.ts:149|
|pkOpenTray|الفتح يعرض الألواح منفصلة (مفكّكة)، وليس قالبًا مفرودًا.|artifacts/yieldloop/src/lib/feature-i18n.ts:149|
|pkOpenLid|الفتح يعرض الغطاء مرفوعًا للأعلى. لا توجد مفصلة.|artifacts/yieldloop/src/lib/feature-i18n.ts:150|
|pkSleeveNoOpen|الأغلفة ليس لها عرض مفتوح.|artifacts/yieldloop/src/lib/feature-i18n.ts:150|
|pkDims|الأبعاد الداخلية (مم)|artifacts/yieldloop/src/lib/feature-i18n.ts:151|
|pkValidate|تحقّق واعرض|artifacts/yieldloop/src/lib/feature-i18n.ts:151|
|pkValidating|جارٍ التحقق…|artifacts/yieldloop/src/lib/feature-i18n.ts:151|
|pkStale|معاينة قديمة: ما زالت تعرض آخر تصوّر تم التحقق منه ({state}). تغييرات الاسم أو الأبعاد أو العرض معلّقة — اضغط «تحقّق من التغييرات» للتحديث.|artifacts/yieldloop/src/lib/feature-i18n.ts:151|
|pkStaleTag|قديمة|artifacts/yieldloop/src/lib/feature-i18n.ts:152|
|pkUpdate|تحقّق من التغييرات|artifacts/yieldloop/src/lib/feature-i18n.ts:153|
|e_required_max_160|الاسم مطلوب (160 حرفًا كحد أقصى)|artifacts/yieldloop/src/lib/feature-i18n.ts:157|
|e_invalid_fields|بعض الحقول غير صالحة. راجع القيم المحددة.|artifacts/yieldloop/src/lib/feature-i18n.ts:157|
|pkEmptyView|أدخل جميع الأبعاد وتحقّق لعرض التصوّر.|artifacts/yieldloop/src/lib/feature-i18n.ts:163|
|pkSummary|ملخص الأبعاد|artifacts/yieldloop/src/lib/feature-i18n.ts:163|
|pkInternal|الداخلي ط × ع × ا|artifacts/yieldloop/src/lib/feature-i18n.ts:164|
|pkExternal|الغلاف الخارجي (مجمّع)|artifacts/yieldloop/src/lib/feature-i18n.ts:164|
|pkPanels|{n} ألواح بسماكة {t} مم|artifacts/yieldloop/src/lib/feature-i18n.ts:164|
|pkExport|تصدير JSON|artifacts/yieldloop/src/lib/feature-i18n.ts:164|
|pkImport|استيراد JSON|artifacts/yieldloop/src/lib/feature-i18n.ts:165|
|pkImported|تم استيراد التصوّر وتحقق منه الخادم.|artifacts/yieldloop/src/lib/feature-i18n.ts:165|
|pkPropose|صف عبوة|artifacts/yieldloop/src/lib/feature-i18n.ts:166|
|pkProposeHint|يقترح الذكاء الاصطناعي قالبًا وأبعادًا. تراجعها وتطبّقها؛ لا يُعرض شيء قبل تحقق الخادم.|artifacts/yieldloop/src/lib/feature-i18n.ts:167|
|pkDescription|الوصف|artifacts/yieldloop/src/lib/feature-i18n.ts:167|
|pkDescriptionPh|مثال: صينية ضحلة لستة برطمانات 80 مم، كرتون 3 مم|artifacts/yieldloop/src/lib/feature-i18n.ts:168|
|pkSuggest|اقترح|artifacts/yieldloop/src/lib/feature-i18n.ts:168|
|pkSuggesting|جارٍ الاقتراح…|artifacts/yieldloop/src/lib/feature-i18n.ts:168|
|pkReview|مراجعة الاقتراح|artifacts/yieldloop/src/lib/feature-i18n.ts:168|
|pkMissing|ناقص|artifacts/yieldloop/src/lib/feature-i18n.ts:169|
|pkAssumptions|الافتراضات|artifacts/yieldloop/src/lib/feature-i18n.ts:169|
|pkNoTemplate|لا يوجد قالب مدعوم يناسب هذا الوصف.|artifacts/yieldloop/src/lib/feature-i18n.ts:169|
|pkApply|طبّق على النموذج|artifacts/yieldloop/src/lib/feature-i18n.ts:169|
|pkDiscard|تجاهل|artifacts/yieldloop/src/lib/feature-i18n.ts:170|
|pkApplied|تم تطبيق الاقتراح. تحقّق للعرض.|artifacts/yieldloop/src/lib/feature-i18n.ts:170|
|pkRetry|إعادة المحاولة|artifacts/yieldloop/src/lib/feature-i18n.ts:170|
|pkTemplatesError|تعذّر تحميل قوالب التغليف.|artifacts/yieldloop/src/lib/feature-i18n.ts:170|
|v_title|عرض التصوّر ثلاثي الأبعاد|artifacts/yieldloop/src/lib/feature-i18n.ts:174|
|p_lid_height|ارتفاع الغطاء|artifacts/yieldloop/src/lib/feature-i18n.ts:180|
|p_clearance|خلوص الغطاء|artifacts/yieldloop/src/lib/feature-i18n.ts:180|

### Layout and elements
Concept controls and 3D preview; persistent non-manufacturing disclaimer. AI proposal panel absent if unavailable. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Select concept and explicit dimensions; interactive 3D camera controls; validation/optional AI proposal. No verified dieline, saved production plan or automatic cutting transfer. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useMemo, useRef, useState, useMutation, useToast, useAssistanceStatus, usePackagingTemplates, useFt, useI18n, onChange, onClick, onSubmit.

### Data and calculations
packaging/templates GET; packaging/validate POST; propose POST only available provider. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Conceptual geometry is prominent despite being optional and not a production dieline or saved manufacturing workflow.

### Original requirement mapping
Beyond original core; conceptual only. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: System connectivity

- Route: /health
- Purpose: Operational diagnostics outside original brief.
- Actors allowed: Public route bypasses Protected despite role-access health entry
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/connectivity.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on health endpoints from config/urls.py.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|brand|YieldLoop|artifacts/yieldloop/src/lib/i18n.tsx:5|
|title|System connectivity|artifacts/yieldloop/src/lib/i18n.tsx:9|
|subtitle|Live checks against the YieldLoop server and its PostgreSQL database. Results are shown exactly as the server reports them.|artifacts/yieldloop/src/lib/i18n.tsx:10|
|switchLang|العربية|artifacts/yieldloop/src/lib/i18n.tsx:11|
|switchLangLabel|Switch language to Arabic|artifacts/yieldloop/src/lib/i18n.tsx:12|
|retryAll|Check again|artifacts/yieldloop/src/lib/i18n.tsx:13|
|retry|Retry|artifacts/yieldloop/src/lib/i18n.tsx:14|
|apiTitle|API service|artifacts/yieldloop/src/lib/i18n.tsx:15|
|apiDesc|Confirms the application server is running and responding.|artifacts/yieldloop/src/lib/i18n.tsx:16|
|dbTitle|PostgreSQL database|artifacts/yieldloop/src/lib/i18n.tsx:17|
|dbDesc|Confirms the server can reach and query the database.|artifacts/yieldloop/src/lib/i18n.tsx:18|
|checking|Checking|artifacts/yieldloop/src/lib/i18n.tsx:19|
|checkingDetail|Waiting for a response from the server.|artifacts/yieldloop/src/lib/i18n.tsx:20|
|ok|Operational|artifacts/yieldloop/src/lib/i18n.tsx:21|
|okApi|The API server responded and reports healthy.|artifacts/yieldloop/src/lib/i18n.tsx:22|
|okDb|The database is connected and accepting queries.|artifacts/yieldloop/src/lib/i18n.tsx:23|
|failed|Unavailable|artifacts/yieldloop/src/lib/i18n.tsx:24|
|dbUnavailable|The server is running but cannot reach the database.|artifacts/yieldloop/src/lib/i18n.tsx:25|
|timeout|No response within {s} seconds.|artifacts/yieldloop/src/lib/i18n.tsx:26|
|network|The server could not be reached. Check the network or that the API service is running.|artifacts/yieldloop/src/lib/i18n.tsx:27|
|httpError|The server returned an error (HTTP {code}).|artifacts/yieldloop/src/lib/i18n.tsx:28|
|unexpected|The server responded with an unexpected result.|artifacts/yieldloop/src/lib/i18n.tsx:29|
|endpoint|Endpoint|artifacts/yieldloop/src/lib/i18n.tsx:30|
|httpStatus|HTTP|artifacts/yieldloop/src/lib/i18n.tsx:31|
|checkedAt|Checked at|artifacts/yieldloop/src/lib/i18n.tsx:32|
|summaryChecking|Running checks|artifacts/yieldloop/src/lib/i18n.tsx:33|
|summaryOk|All systems connected|artifacts/yieldloop/src/lib/i18n.tsx:34|
|summaryPartial|Attention needed|artifacts/yieldloop/src/lib/i18n.tsx:35|
|summaryDown|Services unavailable|artifacts/yieldloop/src/lib/i18n.tsx:36|
|footer|Status is never cached as healthy. Each check makes a new request with a {s}-second timeout.|artifacts/yieldloop/src/lib/i18n.tsx:37|
|systemStatus|System status|artifacts/yieldloop/src/lib/ui-i18n.ts:8|
|pageDashboard|Dashboard|artifacts/yieldloop/src/lib/ui-i18n.ts:9|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|brand|YieldLoop|artifacts/yieldloop/src/lib/i18n.tsx:414|
|title|اتصال النظام|artifacts/yieldloop/src/lib/i18n.tsx:418|
|subtitle|فحوصات مباشرة لخادم YieldLoop وقاعدة بيانات PostgreSQL. تُعرض النتائج كما يُبلغ عنها الخادم تمامًا.|artifacts/yieldloop/src/lib/i18n.tsx:419|
|switchLang|English|artifacts/yieldloop/src/lib/i18n.tsx:420|
|switchLangLabel|تغيير اللغة إلى الإنجليزية|artifacts/yieldloop/src/lib/i18n.tsx:421|
|retryAll|إعادة الفحص|artifacts/yieldloop/src/lib/i18n.tsx:422|
|retry|إعادة المحاولة|artifacts/yieldloop/src/lib/i18n.tsx:423|
|apiTitle|خدمة الواجهة البرمجية|artifacts/yieldloop/src/lib/i18n.tsx:424|
|apiDesc|يتحقق من أن خادم التطبيق يعمل ويستجيب.|artifacts/yieldloop/src/lib/i18n.tsx:425|
|dbTitle|قاعدة بيانات PostgreSQL|artifacts/yieldloop/src/lib/i18n.tsx:426|
|dbDesc|يتحقق من قدرة الخادم على الوصول إلى قاعدة البيانات والاستعلام منها.|artifacts/yieldloop/src/lib/i18n.tsx:427|
|checking|جارٍ الفحص|artifacts/yieldloop/src/lib/i18n.tsx:428|
|checkingDetail|بانتظار استجابة من الخادم.|artifacts/yieldloop/src/lib/i18n.tsx:429|
|ok|يعمل|artifacts/yieldloop/src/lib/i18n.tsx:430|
|okApi|استجاب خادم الواجهة البرمجية وأفاد بأنه سليم.|artifacts/yieldloop/src/lib/i18n.tsx:431|
|okDb|قاعدة البيانات متصلة وتقبل الاستعلامات.|artifacts/yieldloop/src/lib/i18n.tsx:432|
|failed|غير متاح|artifacts/yieldloop/src/lib/i18n.tsx:433|
|dbUnavailable|الخادم يعمل لكنه لا يستطيع الوصول إلى قاعدة البيانات.|artifacts/yieldloop/src/lib/i18n.tsx:434|
|timeout|لم تصل استجابة خلال {s} ثوانٍ.|artifacts/yieldloop/src/lib/i18n.tsx:435|
|network|تعذّر الوصول إلى الخادم. تحقّق من الشبكة أو من تشغيل خدمة الواجهة البرمجية.|artifacts/yieldloop/src/lib/i18n.tsx:436|
|httpError|أعاد الخادم خطأ (HTTP {code}).|artifacts/yieldloop/src/lib/i18n.tsx:437|
|unexpected|استجاب الخادم بنتيجة غير متوقعة.|artifacts/yieldloop/src/lib/i18n.tsx:438|
|endpoint|نقطة الوصول|artifacts/yieldloop/src/lib/i18n.tsx:439|
|httpStatus|HTTP|artifacts/yieldloop/src/lib/i18n.tsx:440|
|checkedAt|وقت الفحص|artifacts/yieldloop/src/lib/i18n.tsx:441|
|summaryChecking|جارٍ تنفيذ الفحوصات|artifacts/yieldloop/src/lib/i18n.tsx:442|
|summaryOk|جميع الأنظمة متصلة|artifacts/yieldloop/src/lib/i18n.tsx:443|
|summaryPartial|يتطلب الانتباه|artifacts/yieldloop/src/lib/i18n.tsx:444|
|summaryDown|الخدمات غير متاحة|artifacts/yieldloop/src/lib/i18n.tsx:445|
|footer|لا تُخزَّن الحالة السليمة مؤقتًا أبدًا. كل فحص يرسل طلبًا جديدًا بمهلة {s} ثوانٍ.|artifacts/yieldloop/src/lib/i18n.tsx:446|
|systemStatus|حالة النظام|artifacts/yieldloop/src/lib/ui-i18n.ts:83|
|pageDashboard|لوحة المتابعة|artifacts/yieldloop/src/lib/ui-i18n.ts:84|

### Layout and elements
Technical readiness panels, status/time/error information; not linked in employee navigation. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Read API/database readiness; retry health checks; return home. No manufacturing writes. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useUt, useDatabaseReadiness, useHealthCheck, useI18n, useApiCheck, useDbCheck, onClick.

### Data and calculations
health endpoints from config/urls.py. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Actual public route contradicts the Manager-only presentation-policy entry; hiding links is not route authorization.

### Original requirement mapping
Operational diagnostics outside original brief. Refer to section 11 for status rather than treating a mounted component as a PASS.

## Page: Not found

- Route: * (authenticated fallback)
- Purpose: Navigation recovery.
- Actors allowed: Unknown authenticated paths; anonymous redirects login
- Implementation status: implemented path (C); selected prior flows T-prior, not a fresh authenticated browser verification.
- Source files: artifacts/yieldloop/src/pages/not-found.tsx; shared components and localization catalogue in Appendix A.
- Backend endpoints/data sources: /api/v1/ prefix on None.

### Visible English text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|backHome|Back to overview|artifacts/yieldloop/src/lib/i18n.tsx:119|
|notFoundTitle|Page not found|artifacts/yieldloop/src/lib/i18n.tsx:241|
|notFoundDesc|This address does not exist in YieldLoop.|artifacts/yieldloop/src/lib/i18n.tsx:242|

### Visible Arabic text
Direct static references (conditional strings may not render together):

|Key|Exact copy|Source line|
|---|---|---|
|backHome|العودة إلى النظرة العامة|artifacts/yieldloop/src/lib/i18n.tsx:528|
|notFoundTitle|الصفحة غير موجودة|artifacts/yieldloop/src/lib/i18n.tsx:650|
|notFoundDesc|هذا العنوان غير موجود في YieldLoop.|artifacts/yieldloop/src/lib/i18n.tsx:651|

### Layout and elements
Compact error state. Shared shell applies except public login/health and standalone error composition. Above-the-fold content depends on viewport and record length; no universal fold claim is made from source alone.

### Interactions
Back navigation/home; route-level forbidden is a different inline component, not this page. Network mutations require server success before success UI. Query loading/error does not prove empty data. Implementation hooks observed: useI18n.

### Data and calculations
None. Manufacturing records are PostgreSQL-backed; filters, draft form state, panel selection and 3D previews are frontend state unless explicitly saved. Formula and revision rules are in section 8.

### Current UX issues
Retained layout and long dynamic labels require representative record-based visual review; no new page-specific visual defect is claimed without observation.

### Original requirement mapping
Navigation recovery. Refer to section 11 for status rather than treating a mounted component as a PASS.

### Dashboard / Production Overview (additional page in reports.tsx)
Route /dashboard; S,M; O redirects. Header welcomes current display name, expandable Filters, Reports/Compare shortcuts, Employees only M. Supervisor leads with first-page exceptions; Manager displays KPIs, job-status donut and selected-material output bars. Open/draft/completed/cancelled counts come from reports/overview; good/scrap/offcut and positive variance form the output bars, kg x-axis and category y-axis, mirrored in RTL. Signed net variance remains a separate warning. With no material selected, weight totals are withheld and material selection prompted. Jobs/attention preview only ten returned records—not the whole factory exception population. Welcome, cards, tooltips, chart labels and role-specific leads are exact in ui-i18n and reports catalogue below. No fabricated percentage change or historical timeseries.

## 8. Backend sources, calculations and persistence

Source roots: artifacts/api-server/backend/{jobs,materials,inventory,reports,cutting,accounts,assistance}; URL registration config/auth_urls.py; generated contracts lib/api-spec/openapi.yaml and lib/api-client-react/src/generated/. Current policy/service code takes priority over old prose.

- Accounted = good + scrap + offcut. Variance = issued − accounted, signed; never automatically classified as scrap. Yield = good / issued ×100; scrap rate = scrap / issued ×100. Zero issue gives unavailable rates, not zero performance. Backend Decimal values preserved; material API formats three decimals.
- Entries immutable with reasoned void records and replacement entries; reconciliations versioned; reports use latest reconciliation. Do not sum superseded snapshots.
- Creation-date/timezone/status filters select jobs and display their current balance, not historical as-of flow. Mixed-material aggregate weights are withheld. Comparison requires same machine; identical machine alone does not establish material compatibility.
- Inventory available = registered active lot, not physically qualified reusable stock. Voided lot remaining =0; active remaining equals original because consumption is not enabled. Source links and at most initial/void foundation events retain provenance.
- Cutting: explicit mm geometry; area mm²; utilization is placed rectangle area / (single board area × number of used boards) ×100, not all offered boards and not weight yield. Zero used boards gives null utilization. Offered area separately includes all offered boards. Kerf is spacing, margin a boundary exclusion. Deterministic rectangular heuristic is not proven global optimum. Server validates geometry and revisions. Saved plan revisions persist; unsaved movement is local until successful save.
- Job lifecycle/record changes create events/audits. Employee role/activation/password actions audited. AI is advisory and cannot silently update manufacturing records. Packaging conceptual state is not a verified/saved production dieline.

## 9. Role/navigation matrix

|Area|O|S|M|Backend distinction|
|---|---|---|---|---|
|Home|Jobs|Production Overview|Dashboard|Dashboard uses report API|
|Jobs/details/materials|Open|Visible all statuses|Visible all statuses|jobs.policy.visible_jobs|
|New job|No|No|Yes|require_creator|
|Inventory/details|Open-job source scope|Yes|Yes|inventory.services.lots|
|Cutting|Read only Open|Edit Open|Edit Draft/Open|cutting.views.can_edit|
|Reports/comparison|UI denied|Yes|Yes|O API still allowed within job scope|
|Employees|No|No|Yes|ManagerOnly server check|
|Evidence|Contextual|Contextual|Contextual|visible job check|
|Packaging|Direct only|Menu|Menu|No role-specific production authority|
|Password/account|Yes|Yes|Yes|Own authenticated account|
|Health|Public|Public|Public|Router bypasses auth gate|

## 10. Action-permission matrix

|Operation|O|S|M|Implementation, persistence and limits|
|---|---|---|---|---|
|Create job|No|No|Yes|POST jobs; persisted/audited|
|Edit reference/title|No|No|Draft/Open|Capabilities; PATCH revision|
|Edit notes|No|Open|Draft/Open|Capabilities|
|Select machine|Open existing choice|Open|Draft/Open|No Operator catalogue creation|
|Open Draft|No|Yes|Yes|Lifecycle validation|
|Cancel|No|No|Draft/Open|State transition audit|
|Close balanced Open|Yes|Yes|Yes|Machine, positive issued/good, zero variance|
|Select material/record issue/good/scrap/offcut|Open|Open|Open|Server recorder check; no inferred scrap|
|Create material definition|No|No|Yes|Manager creator policy|
|Void/correct entries|Open|Open|Open|Reason, revision, derived balance, inventory safeguards|
|Register/void eligible lot|No|Yes|Yes|Open active source, foundation audit|
|Reserve/release/consume|No|Blocked|Blocked|reuse_policy_required; not usable workflow|
|Evaluate/save/revise cutting|No|Open|Draft/Open|Server role/state/revision validation|
|Read saved plans|Open|Visible jobs|Visible jobs|No O mutation permission|
|Create/edit/reset employees|No|No|Yes|Self/last-Manager constraints|
|AI questions|Conditional|Conditional|Conditional|Requires available provider and authorized job; not currently verified live|
|Password/logout|Own|Own|Own|Session/CSRF, server action|

## 11. Original challenge compliance

PASS requires persisted evidence or named prior executed tests, not mere code presence. T-prior evidence is explicitly historical from this conversation's completed verification, not rerun here.

|Requirement|Exactly one status|Evidence / qualification|
|---|---|---|
|Digital job card|PASS — Verified|jobs model/API; prior actual create/open/detail workflow|
|Material/machine selection|PASS — Verified|prior real isolated selection/create workflow; persisted CT-2 demo|
|Issued board weight|PASS — Verified|D latest reconciliations 1200/1000|
|Good output|PASS — Verified|D 900/820|
|Scrap by reason|PASS — Verified|D IK-202 180 Setup/layout +60 Damaged material|
|Offcuts separate from scrap|PASS — Verified|D 60/80 separate from 240/100 scrap|
|Separate rework|MISSING|No working rework entry kind or workflow found|
|Automatic balance validation|PASS — Verified|D zero balances; prior void/replacement/closure browser and materials tests|
|Yield/scrap definitions|PASS — Verified|accounting.py, persisted 75/82 and20/10, prior backend checks|
|Same-machine comparison|PASS — Verified|Both CT-2; comparison backend tests previously passed; no new populated browser comparison this audit|
|Supporting source records|PASS — Verified|entry rows and source links; prior job correction/history workflow|
|Demo records IK-202/203|PASS — Verified|D IDs60/61 currently Open|
|Correct IK-202 breakdown|PASS — Verified|D exact category rows|
|Unspecified IK-203 reasons|PASS — Verified|D reason blank; core helper displays Unspecified rather than invented breakdown|
|Optional evidence-based live AI|PARTIAL|Evidence pipeline exists; live provider unavailable/unverified, no causal proof|
|Factory demonstration reproduces calculations|PARTIAL|D and prior automated evidence reproduce figures; no witnessed factory presentation/real operators in audit|

Current read-only values (not seeded or corrected):

|Field|IK-202 (60)|IK-203 (61)|
|---|---:|---:|
|Machine/status|CT-2 / Open|CT-2 / Open|
|Issued kg|1200.000|1000.000|
|Good kg|900.000|820.000|
|Scrap kg|240.000|100.000|
|Offcut kg|60.000|80.000|
|Variance kg|0.000|0.000|
|Scrap rate|20.000%|10.000%|
|Good yield|75.000%|82.000%|

Scrap-rate difference IK-202 minus IK-203 = +10 percentage points; good-yield difference IK-203 minus IK-202 = +7 points. Largest recorded IK-202 category is 180 kg Setup/layout—not established cause.

## 12. Beyond the original challenge

Authentication/accounts and lifecycle safeguards: implemented with prior executed tests; useful operational foundation. Inventory provenance: implemented foundation, usable consumption missing. Cutting plans/revisions/manual placement/scenarios: implemented, selected keyboard/mouse/save paths previously browser verified; optional optimization extra. Role dashboards/reports: implemented, useful monitoring with scoped preview limitations. AI: evidence working, live model unavailable. 3D: partially implemented conceptual visualization, not manufacturing validation or production persistence. Recovery/production readiness: documented blocked items, not solved by UI work.

## 13. Prioritized UX issues and recommendations

|Priority/type|Page/element|Impact|Recommendation and workflow risk|
|---|---|---|---|
|P1 functional policy clarity|Operator reports/compare UI denial but APIs accessible within Open scope|Hidden controls can be mistaken for backend prohibition|Owner decide desired policy; do not silently remove lawful operational access|
|P1 data interpretation|Inventory Available/remaining|Can imply qualified consumable stock|Keep concise registered/unverified restriction beside quantities; never add fake consume action|
|P1 coverage|Cutting touch and populated comparison/inventory detail|Handler existence is not current device evidence|Read-only visual assessment plus separately approved isolated interaction verification; no algorithm rewrite|
|P2 information hierarchy|Dashboard exceptions first ten|Can be mistaken for complete factory exception count|Explicit preview scope and route to full filtered records; preserve actual counts|
|P2 scalability|Employees local paging over full response|Small visible page does not reduce transfer|Future server pagination if volume warrants; preserve search/role filters|
|P2 discoverability|Evidence contextual only|Users may miss useful non-AI investigation|Contextual labelled source/investigation links; do not revive unavailable chatbot|
|P2 semantic clarity|Reports creation-date filters/current balances|Not historical production/as-of totals|Short inline definition/tooltip rather than large repeated panel|
|P2 optional complexity|Packaging sidebar|Competes with original factory work|Consider optional grouping; preserve existing accessible prototype|
|P2 authorization consistency|Public /health vs Manager-only map|Conflicting maintenance assumptions|Document intentional public health or approve route policy change; preserve readiness endpoints|
|P3 visual/readability|Long welcome username and dense detail pages|Wrapping increases scroll; shared theme alone does not simplify hierarchy|Use short display name where present, retain complete identity in menu; page-specific visual review|

These are recommendations, not implemented changes. Existing generated timestamps in evidence can be traceability, unlike removed redundant report freshness summaries. Do not delete source IDs, units, revision warnings or imbalance notices for cosmetic reasons.

## 14. Actor-specific usage instructions

**Operator:** 1 Sign in; satisfy password-change gate. 2 My Work shows Open jobs only. 3 Open a job or Record. 4 Select existing machine/material and record measured issue/output/scrap reason/offcut. 5 Inspect signed variance; correct by supported reasoned void plus replacement, not invented scrap. 6 Close only when server permits. 7 Cutting is read-only: inspect saved layout; ask Supervisor/Manager to edit. 8 Inventory is scoped visibility, not permission to register/consume.

**Supervisor:** 1 Sign in to Production Overview. 2 Inspect first-page exceptions and open relevant job. 3 Record/reconcile Open work or open a Draft where allowed. 4 Review/register eligible offcuts and provenance; do not consume. 5 Reports selects creation cohort/material; Comparison selects same-machine jobs. 6 Edit/save Open-job cutting proposals without changing weight records.

**Manager:** 1 Sign in to Dashboard. 2 Select one material before interpreting kg aggregate metrics. 3 Employees creates managed accounts and roles; obey self/last-manager safeguards. 4 Create job, select machine, define/select material; open it for recording. 5 Reports/comparison drill into source entries, not only net totals. 6 Review revisions/history before consequential changes.

## 15. Non-destructive factory demonstration

1 Sign in using an existing authorized account; do not create accounts or reset passwords for this script.
2 Open IK-202 (/jobs/60). Confirm CT-2 and board context; read issue1200, good900, scrap240 and offcut60 kg.
3 Inspect scrap rows: Setup/layout180, Damaged material60. Sum accounted900+240+60=1200; variance0, scrap20%, good yield75%.
4 Open IK-203 (/jobs/61): issue1000, good820, scrap100, offcut80. Leave missing reason Unspecified. Accounted1000; variance0, scrap10%, yield82%.
5 As S/M open /comparison?left=60&right=61. Both CT-2; read ten-point scrap difference and seven-point yield improvement for IK-203. Respect material compatibility messages.
6 Follow source/evidence links to the category rows. Explain largest recorded category is a lead requiring operator evidence, not proof of root cause.
7 Optional: view existing cutting geometry, clearly separating mm² utilization from kg yield. No new measurements or plans inferred from weights.
8 Do not edit, void, close, register, consume, seed or save anything during demonstration.

## 16. Unverified behavior, evidence limits and questions

No full tests or authenticated browser interactions were run in this audit. Prior evidence: docs/complete-ui-redesign.md records38 frontend tests,114 database-backed and33 offline checks, plus real isolated login/recording/employee/keyboard/mouse/save checks. Prior profile-selection failures and later correct offline pass are preserved there. Touch gestures, physical devices, all-page viewport matrix, populated inventory-history/comparison browser flows and live AI remain unverified here. Provider availability was not newly queried; previous unavailable status is historical evidence. No credential values inspected. Exact catalogue extraction includes dormant strings; runtime conditional visibility must not be inferred merely from their presence. Dynamic text/private employee content deliberately omitted. No dead primary persistence control was independently established; blocked reuse/optional AI are explicit limitations, not fake success.

## 17. Recommended order for a later page-by-page design review

1 Agree role/API visibility and core-versus-optional scope. 2 Observe Operator job/material/closure path. 3 Inventory qualification/provenance. 4 Supervisor exceptions and reporting semantics. 5 Manager comparison/source drilldowns. 6 Cutting tablet/touch and history. 7 Employee scale/account safety. 8 Evidence discovery and optional packaging. 9 Finish bilingual/accessibility/error-state matrix. No redesign begun in this audit.

# Appendix A — exact bilingual source-copy catalogue

### Current read-only observation and query evidence

The anonymous mobile login was observed at 390×844 during this audit: logo/globe,
“Production & Material Yield”, “Sign in”, “Track material, understand scrap, and
identify reusable offcuts.”, Username, Password, password reveal, disabled empty-form
Sign in, “No account? Ask a Manager at your site to create one.”, and the
“Ibn Khaldoun Printing and Publishing” footer. No login was submitted.
The anonymous auth/me 401 is expected, not evidence of failed credentials.
Authenticated screenshots and interaction results referenced elsewhere are prior
evidence, not fresh observations.

Current case verification used Django ORM SELECTs inside `transaction.atomic()`
after `SET TRANSACTION READ ONLY`: ProductionJob filtered to references IK-202
and IK-203, materials.services.latest(job), and MaterialEntry scrap rows selecting
only quantity/scrap_reason. No SQL writes, migrations, seed commands or test
execution occurred. Exact figures are in section 11.

Comparison API differences are always **left minus right**, including rates:
left IK-202 / right IK-203 therefore returns scrap-rate +10 and yield-rate −7
percentage points. The prose “IK-203 improves yield by 7 points” reverses the
comparison perspective intentionally. Differences require the same material ID
as well as a case-insensitive equal nonblank machine; otherwise differences are null.
The machines endpoint returns shared distinct nonempty machine names from all
jobs, not only the Operator-visible queryset, while omitting job identifiers.

This is a complete extraction of English/Arabic string-valued object entries from current localization modules and page-local dictionaries. Source lines make dormant keys auditable. It is NOT a claim that every entry appears simultaneously or is still mounted. Page sections list direct static references; delegated component and dynamically constructed keys are covered here.

## artifacts/yieldloop/src/components/cutting/cutting-i18n.ts

### English

|Key|Exact wording/template|Line|
|---|---|---|
|scenarioNameRequired|Scenario name is required.|4|
|layoutSource|Layout source|5|
|navCutting|Cutting Studio|6|
|studioTitle|Cutting Studio|7|
|studioScope|Rectangular layout planning in millimetres. A plan is a proposal only: it does not record material use, change kg reconciliation or touch inventory.|8|
|entrySubtitle|Choose a production job to open its cutting plans.|9|
|entrySearch|Search by job number or title|10|
|entryEmpty|No jobs found|11|
|entryEmptyDesc|Cutting plans are attached to production jobs. Jobs visible to you appear here.|12|
|entryLoadError|Could not load jobs.|13|
|openStudio|Open Cutting Studio|14|
|openStudioDesc|Plan rectangular boards and parts for this job.|15|
|backToJob|Back to job|16|
|plans|Plans|17|
|newPlan|New plan|18|
|noPlans|No plans yet|19|
|noPlansWriter|Start a plan to lay out boards and parts for this job.|20|
|noPlansReader|No cutting plans have been saved for this job.|21|
|plansLoadError|Could not load plans.|22|
|planLoadError|Could not load this plan.|23|
|revShort|rev {n}|24|
|selectPlan|Select a plan from the list, or start a new one.|25|
|readOnlyOperator|You can view cutting plans but not change them.|26|
|readOnlyCancelled|This job is cancelled. Plans are preserved read-only.|27|
|readOnlyDraftSup|Plans can be edited by supervisors once the job is open.|28|
|readOnlyPlan|This plan is read-only for you.|29|
|planName|Plan name|30|
|unsaved|Unsaved changes|31|
|save|Save plan|32|
|saving|Saving|33|
|saveTitle|Save cutting plan|34|
|saveDesc|Every save creates a new revision in the audit history.|35|
|reason|Reason for this revision|36|
|reasonRequired|A reason is required.|37|
|nameRequired|Plan name is required.|38|
|saveBlocked|Fix the inputs of every scenario before saving.|39|
|saved|Plan saved as revision {n}.|40|
|staleTitle|Plan changed by someone else|41|
|staleDesc|Your inputs are kept. Reloading replaces your unsaved edits with the latest revision.|42|
|reloadLatest|Reload latest|43|
|reloadConfirmTitle|Discard your edits?|44|
|reloadConfirmDesc|Your unsaved changes will be replaced by the latest saved revision.|45|
|discard|Discard edits|46|
|duplicateTitle|Request already processed|47|
|compareScroll|Scroll to see every scenario.|48|
|scrollLeft|Scroll left|49|
|scrollRight|Scroll right|50|
|duplicateDesc|The server already handled this save request. It was not saved twice. Reload the plan to see the stored revision.|51|
|uncertainTitle|Save result unknown|52|
|uncertainDesc|The connection dropped before the server replied. Retrying is safe: the same request ID is reused and will not create a duplicate.|53|
|retrySave|Retry save|54|
|leaveConfirmTitle|Leave without saving?|55|
|leaveConfirmDesc|Unsaved plan changes will be lost.|56|
|leave|Leave|57|
|stay|Stay|58|
|scenarios|Scenarios|59|
|scenario|Scenario|60|
|scenarioName|Scenario name|61|
|addScenario|New scenario|62|
|duplicateScenario|Duplicate|63|
|removeScenario|Remove scenario|64|
|removeScenarioTitle|Remove this scenario?|65|
|removeScenarioDesc|Its inputs and placements will be removed from this draft.|66|
|maxScenarios|Up to 4 scenarios per plan.|67|
|compare|Compare|68|
|compareTitle|Side-by-side comparison|69|
|compareNeedTwo|Configure at least two scenarios to compare them.|70|
|editor|Editor|71|
|stock|Stock board|72|
|stockLabel|Stock label|73|
|material|Material|74|
|materialRequired|Choose a material.|75|
|materialSelected|Material #{id}|76|
|materialHint|Identifies the planned material only. Compatibility with any stock or offcut is unverified.|77|
|unit|Unit|78|
|unitChoose|Choose unit|79|
|unitMm|Millimetres (mm)|80|
|unitRequired|Choose the unit.|81|
|width|Width|82|
|height|Height|83|
|boardQty|Boards supplied|84|
|boardQtyHint|Whole number from 1 to 10.|85|
|margins|Edge margins|86|
|marginsHint|Edge clearance per side. Kerf is not added at edges. Zero is allowed.|87|
|left|Left|88|
|right|Right|89|
|top|Top|90|
|bottom|Bottom|91|
|kerf|Kerf|92|
|kerfHint|Minimum gap between neighbouring parts on at least one axis. Zero is allowed.|93|
|mode|Cutting mode|94|
|modeChoose|Choose mode|95|
|modeRect|Rectangular spacing only|96|
|modeRequired|Choose the cutting mode.|97|
|modeNotice|Only rectangle spacing is checked. Grain direction, defects, machine limits and guillotine-cut constraints are not supported and are not verified.|98|
|pieces|Parts|99|
|addPiece|Add part|100|
|removePiece|Remove part|101|
|pieceLabel|Label|102|
|quantity|Quantity|103|
|rotation|Rotation|104|
|rotationChoose|Choose|105|
|rotationYes|Allowed|106|
|rotationNo|Not allowed|107|
|rotationRequired|Choose whether rotation is allowed.|108|
|noPieces|Add at least one part.|109|
|piecesLimit|Up to 20 part types and 100 copies in total.|110|
|copiesTotal|{n} of 100 copies|111|
|fieldRequired|Required.|112|
|fieldFormat|Use digits, up to 6 before and 3 after the decimal point, max 100000.|113|
|fieldPositive|Must be greater than zero.|114|
|fieldInt|Whole number from {min} to {max}.|115|
|labelTooLong|Too long.|116|
|tooManyCopies|Total copies exceed 100.|117|
|tooManyPieces|Up to 20 part types.|118|
|unusableBoard|Margins leave no usable area.|119|
|inputsLocked|Inputs are locked while parts are placed, so placements never silently become invalid.|120|
|editInputs|Edit inputs|121|
|editInputsTitle|Edit inputs and clear placements?|122|
|editInputsDesc|Changing inputs removes all placements and the result for this scenario. You can generate or place parts again afterwards.|123|
|clearAndEdit|Clear placements and edit|124|
|completeInputs|Complete all inputs to start placing parts.|125|
|canvas|Board layout|126|
|boardN|Board {n}|127|
|zoomIn|Zoom in|128|
|zoomOut|Zoom out|129|
|zoomReset|Fit board|130|
|canvasHelp|Drag a part with mouse or touch. Tab selects; arrows move 1 mm (Shift 10 mm), R rotates, Delete removes, Escape cancels a drag. Reset placements is available above. Invalid moves keep the previous position.|131|
|canvasEmpty|No parts on this board.|132|
|usableArea|usable area|133|
|generate|Generate baseline|134|
|generating|Generating|135|
|generateTitle|Replace placements with a generated baseline?|136|
|generateDesc|All current placements in this scenario are replaced by the deterministic shelf layout.|137|
|replace|Replace|138|
|resetPlacements|Reset placements|139|
|resetTitle|Remove all placements?|140|
|resetDesc|Every placed part in this scenario is removed. Inputs are kept.|141|
|reset|Remove all|142|
|algoNote|Baseline: shelf v1, first-fit decreasing by area. Deterministic and heuristic, not optimal; it may leave parts unplaced that a different layout could fit.|143|
|origin_manual|Manual layout|144|
|origin_shelf_v1|Shelf v1 baseline|145|
|selected|Selected part|146|
|noSelection|Select a part on the board or from the list to edit its position.|147|
|board|Board|148|
|rotated|Rotated|149|
|rotate|Rotate|150|
|rotationLocked|Rotation not allowed for this part.|151|
|apply|Apply|152|
|removePlacement|Remove from board|153|
|addUnplaced|Place a copy|154|
|copy|Copy|155|
|chooseCopy|Choose copy|156|
|allPlaced|Every copy is placed.|157|
|place|Place|158|
|placedList|Placed parts|159|
|rejected|Not applied: {msg} Previous position kept.|160|
|pe_dimension_format|a value has an invalid format.|161|
|pe_dimension_range|dimensions must be greater than zero.|162|
|pe_unusable_board|margins leave no usable area.|163|
|pe_unknown_piece|unknown part copy.|164|
|pe_duplicate_placement|this copy is already placed.|165|
|pe_unknown_board|board number is outside the supplied boards.|166|
|pe_rotation_forbidden|rotation is not allowed for this part.|167|
|pe_out_of_bounds|the part would leave the usable area inside the margins.|168|
|pe_overlap_or_kerf|the part would overlap another or come closer than the kerf.|169|
|results|Result|170|
|validating|Validating with server|171|
|stale|Not validated for current input|172|
|staleHint|Metrics will appear once the server validates this exact input and layout.|173|
|evalError|Server validation failed.|174|
|retryEval|Validate again|175|
|serverInvalid|The server marked this layout invalid.|176|
|savedResult|Saved result|177|
|noResult|No saved result for this scenario.|178|
|m_boards_used|Boards used|179|
|m_boards_supplied|Boards supplied|180|
|m_placed|Placed copies|181|
|m_unplaced|Unplaced copies|182|
|m_utilization|Utilization|183|
|m_required_area|Required area|184|
|m_placed_area|Placed area|185|
|m_board_area|Board area (one board)|186|
|m_used_board_area|Used board area|187|
|m_unused_area|Unused area|188|
|m_available_area|Supplied area|189|
|na|Not available|190|
|unplacedTypes|Unplaced parts|191|
|reason_not_placed|Not placed (may be a heuristic limit)|192|
|reason_cannot_fit|Cannot fit on the usable board area|193|
|definitions|Metric definitions|194|
|d1|Board area = width × height of one full board, in mm².|195|
|d2|Used board area = board area × boards used.|196|
|d3|Utilization = placed area ÷ used board area × 100. Not available when nothing is placed.|197|
|d4|Unused area = used board area − placed area. It includes margins and kerf and is not a usable offcut.|198|
|d5|Required area = sum of all part areas × quantities.|199|
|compatNote|Material compatibility unverified. No kg transfer and no inventory selection.|200|
|history|Revision history|201|
|historyEmpty|No history yet.|202|
|historyError|Could not load history.|203|
|historyBy|{actor} · {time}|204|
|show|Show inputs and results|205|
|hide|Hide|206|
|inputs|Inputs|207|
|partsN|{n} parts|208|
|validLayout|Valid layout|209|
|invalidLayout|Invalid layout|210|
|margins4|L {l} · R {r} · T {t} · B {b}|211|
|ce_stale_revision|The plan changed since you loaded it.|212|
|ce_duplicate_request|This request was already processed.|213|
|ce_job_closed|The job is cancelled and plans can no longer change.|214|
|ce_validation_error|The server rejected some values.|215|
|ce_invalid_placement|The server rejected a placement.|216|

### Arabic

|Key|Exact wording/template|Line|
|---|---|---|
|scenarioNameRequired|اسم السيناريو مطلوب.|222|
|layoutSource|مصدر التخطيط|223|
|navCutting|استوديو القص|224|
|studioTitle|استوديو القص|225|
|studioScope|تخطيط تقطيع مستطيلات بالمليمتر. الخطة اقتراح فقط: لا تسجّل استهلاك مواد ولا تغيّر تسوية الكيلوغرامات ولا تمسّ المخزون.|226|
|entrySubtitle|اختر أمر إنتاج لفتح خطط القص الخاصة به.|227|
|entrySearch|ابحث برقم الأمر أو العنوان|228|
|entryEmpty|لا توجد أوامر|229|
|entryEmptyDesc|ترتبط خطط القص بأوامر الإنتاج. تظهر هنا الأوامر المتاحة لك.|230|
|entryLoadError|تعذّر تحميل الأوامر.|231|
|openStudio|فتح استوديو القص|232|
|openStudioDesc|خطّط الألواح والقطع المستطيلة لهذا الأمر.|233|
|backToJob|العودة إلى الأمر|234|
|plans|الخطط|235|
|newPlan|خطة جديدة|236|
|noPlans|لا توجد خطط بعد|237|
|noPlansWriter|ابدأ خطة لتوزيع الألواح والقطع لهذا الأمر.|238|
|noPlansReader|لم تُحفظ أي خطط قص لهذا الأمر.|239|
|plansLoadError|تعذّر تحميل الخطط.|240|
|planLoadError|تعذّر تحميل هذه الخطة.|241|
|revShort|مراجعة {n}|242|
|selectPlan|اختر خطة من القائمة أو ابدأ خطة جديدة.|243|
|readOnlyOperator|يمكنك عرض خطط القص دون تعديلها.|244|
|readOnlyCancelled|هذا الأمر ملغى. تُحفظ الخطط للقراءة فقط.|245|
|readOnlyDraftSup|يمكن للمشرفين تعديل الخطط بعد فتح الأمر.|246|
|readOnlyPlan|هذه الخطة للقراءة فقط بالنسبة لك.|247|
|planName|اسم الخطة|248|
|unsaved|تغييرات غير محفوظة|249|
|save|حفظ الخطة|250|
|saving|جارٍ الحفظ|251|
|saveTitle|حفظ خطة القص|252|
|saveDesc|كل حفظ ينشئ مراجعة جديدة في سجل التدقيق.|253|
|reason|سبب هذه المراجعة|254|
|reasonRequired|السبب مطلوب.|255|
|nameRequired|اسم الخطة مطلوب.|256|
|saveBlocked|أصلح مدخلات كل سيناريو قبل الحفظ.|257|
|saved|حُفظت الخطة كمراجعة {n}.|258|
|staleTitle|غيّر شخص آخر هذه الخطة|259|
|staleDesc|مدخلاتك محفوظة. إعادة التحميل تستبدل تعديلاتك غير المحفوظة بأحدث مراجعة.|260|
|reloadLatest|تحميل الأحدث|261|
|reloadConfirmTitle|تجاهل تعديلاتك؟|262|
|reloadConfirmDesc|ستُستبدل تغييراتك غير المحفوظة بأحدث مراجعة محفوظة.|263|
|discard|تجاهل التعديلات|264|
|duplicateTitle|تمت معالجة الطلب مسبقًا|265|
|compareScroll|مرّر لعرض جميع السيناريوهات.|266|
|scrollLeft|تمرير لليسار|267|
|scrollRight|تمرير لليمين|268|
|duplicateDesc|عالج الخادم طلب الحفظ هذا من قبل ولم يُحفظ مرتين. أعد تحميل الخطة لرؤية المراجعة المخزنة.|269|
|uncertainTitle|نتيجة الحفظ غير معروفة|270|
|uncertainDesc|انقطع الاتصال قبل رد الخادم. إعادة المحاولة آمنة: يُعاد استخدام معرّف الطلب نفسه ولن يُنشأ تكرار.|271|
|retrySave|إعادة الحفظ|272|
|leaveConfirmTitle|المغادرة دون حفظ؟|273|
|leaveConfirmDesc|ستفقد تغييرات الخطة غير المحفوظة.|274|
|leave|مغادرة|275|
|stay|البقاء|276|
|scenarios|السيناريوهات|277|
|scenario|سيناريو|278|
|scenarioName|اسم السيناريو|279|
|addScenario|سيناريو جديد|280|
|duplicateScenario|نسخ|281|
|removeScenario|حذف السيناريو|282|
|removeScenarioTitle|حذف هذا السيناريو؟|283|
|removeScenarioDesc|ستُزال مدخلاته ومواضع قطعه من هذه المسودة.|284|
|maxScenarios|حتى 4 سيناريوهات لكل خطة.|285|
|compare|مقارنة|286|
|compareTitle|مقارنة جنبًا إلى جنب|287|
|compareNeedTwo|اضبط سيناريوهين على الأقل لمقارنتهما.|288|
|editor|المحرر|289|
|stock|لوح المخزون|290|
|stockLabel|تسمية اللوح|291|
|material|المادة|292|
|materialRequired|اختر مادة.|293|
|materialSelected|المادة #{id}|294|
|materialHint|تحدد المادة المخططة فقط. التوافق مع أي مخزون أو بواقٍ غير متحقق منه.|295|
|unit|الوحدة|296|
|unitChoose|اختر الوحدة|297|
|unitMm|مليمتر (mm)|298|
|unitRequired|اختر الوحدة.|299|
|width|العرض|300|
|height|الارتفاع|301|
|boardQty|الألواح المتاحة|302|
|boardQtyHint|عدد صحيح من 1 إلى 10.|303|
|margins|هوامش الحواف|304|
|marginsHint|خلوص الحافة لكل جانب. لا يُضاف عرض القطع عند الحواف. الصفر مسموح.|305|
|left|يسار|306|
|right|يمين|307|
|top|أعلى|308|
|bottom|أسفل|309|
|kerf|عرض القطع|310|
|kerfHint|أدنى فجوة بين القطع المتجاورة على محور واحد على الأقل. الصفر مسموح.|311|
|mode|نمط القص|312|
|modeChoose|اختر النمط|313|
|modeRect|تباعد مستطيلات فقط|314|
|modeRequired|اختر نمط القص.|315|
|modeNotice|يُتحقق من تباعد المستطيلات فقط. اتجاه الألياف والعيوب وحدود الآلة وقيود القص المقصلي غير مدعومة ولا يُتحقق منها.|316|
|pieces|القطع|317|
|addPiece|إضافة قطعة|318|
|removePiece|حذف القطعة|319|
|pieceLabel|التسمية|320|
|quantity|الكمية|321|
|rotation|التدوير|322|
|rotationChoose|اختر|323|
|rotationYes|مسموح|324|
|rotationNo|غير مسموح|325|
|rotationRequired|حدد ما إذا كان التدوير مسموحًا.|326|
|noPieces|أضف قطعة واحدة على الأقل.|327|
|piecesLimit|حتى 20 نوع قطعة و100 نسخة إجمالًا.|328|
|copiesTotal|{n} من 100 نسخة|329|
|fieldRequired|مطلوب.|330|
|fieldFormat|استخدم أرقامًا، حتى 6 قبل الفاصلة و3 بعدها، بحد أقصى 100000.|331|
|fieldPositive|يجب أن يكون أكبر من صفر.|332|
|fieldInt|عدد صحيح من {min} إلى {max}.|333|
|labelTooLong|طويل جدًا.|334|
|tooManyCopies|إجمالي النسخ يتجاوز 100.|335|
|tooManyPieces|حتى 20 نوع قطعة.|336|
|unusableBoard|الهوامش لا تترك مساحة صالحة.|337|
|inputsLocked|المدخلات مقفلة أثناء وجود قطع موضوعة، حتى لا تصبح المواضع غير صالحة دون علمك.|338|
|editInputs|تعديل المدخلات|339|
|editInputsTitle|تعديل المدخلات ومسح المواضع؟|340|
|editInputsDesc|تغيير المدخلات يزيل جميع المواضع والنتيجة لهذا السيناريو. يمكنك التوليد أو وضع القطع مجددًا بعد ذلك.|341|
|clearAndEdit|مسح المواضع والتعديل|342|
|completeInputs|أكمل جميع المدخلات لبدء وضع القطع.|343|
|canvas|مخطط اللوح|344|
|boardN|لوح {n}|345|
|zoomIn|تكبير|346|
|zoomOut|تصغير|347|
|zoomReset|ملاءمة اللوح|348|
|canvasHelp|اسحب القطعة بالفأرة أو اللمس. Tab للتحديد؛ الأسهم تحرك 1 مم (Shift 10 مم)، R للتدوير، Delete للإزالة، Escape لإلغاء السحب. زر إعادة تعيين المواضع متاح بالأعلى. الحركة غير الصالحة تُبقي الموضع السابق.|349|
|canvasEmpty|لا توجد قطع على هذا اللوح.|350|
|usableArea|المساحة الصالحة|351|
|generate|توليد تخطيط أساسي|352|
|generating|جارٍ التوليد|353|
|generateTitle|استبدال المواضع بتخطيط مولَّد؟|354|
|generateDesc|تُستبدل جميع المواضع الحالية في هذا السيناريو بتخطيط الرفوف الحتمي.|355|
|replace|استبدال|356|
|resetPlacements|إعادة ضبط المواضع|357|
|resetTitle|إزالة جميع المواضع؟|358|
|resetDesc|تُزال كل القطع الموضوعة في هذا السيناريو. تبقى المدخلات.|359|
|reset|إزالة الكل|360|
|algoNote|الأساس: رفوف v1، الملاءمة الأولى بترتيب تنازلي للمساحة. حتمي وتقريبي وليس أمثل؛ قد يترك قطعًا كان تخطيط آخر سيستوعبها.|361|
|origin_manual|تخطيط يدوي|362|
|origin_shelf_v1|أساس رفوف v1|363|
|selected|القطعة المحددة|364|
|noSelection|حدد قطعة على اللوح أو من القائمة لتعديل موضعها.|365|
|board|اللوح|366|
|rotated|مُدوَّرة|367|
|rotate|تدوير|368|
|rotationLocked|التدوير غير مسموح لهذه القطعة.|369|
|apply|تطبيق|370|
|removePlacement|إزالة من اللوح|371|
|addUnplaced|وضع نسخة|372|
|copy|النسخة|373|
|chooseCopy|اختر نسخة|374|
|allPlaced|تم وضع كل النسخ.|375|
|place|وضع|376|
|placedList|القطع الموضوعة|377|
|rejected|لم يُطبَّق: {msg} بقي الموضع السابق.|378|
|pe_dimension_format|قيمة بتنسيق غير صالح.|379|
|pe_dimension_range|يجب أن تكون الأبعاد أكبر من صفر.|380|
|pe_unusable_board|الهوامش لا تترك مساحة صالحة.|381|
|pe_unknown_piece|نسخة قطعة غير معروفة.|382|
|pe_duplicate_placement|هذه النسخة موضوعة مسبقًا.|383|
|pe_unknown_board|رقم اللوح خارج الألواح المتاحة.|384|
|pe_rotation_forbidden|التدوير غير مسموح لهذه القطعة.|385|
|pe_out_of_bounds|ستخرج القطعة من المساحة الصالحة داخل الهوامش.|386|
|pe_overlap_or_kerf|ستتداخل القطعة مع أخرى أو تقترب أكثر من عرض القطع.|387|
|results|النتيجة|388|
|validating|جارٍ التحقق مع الخادم|389|
|stale|لم يُتحقق منها للمدخلات الحالية|390|
|staleHint|تظهر المقاييس بعد أن يتحقق الخادم من هذه المدخلات والتخطيط تحديدًا.|391|
|evalError|فشل التحقق على الخادم.|392|
|retryEval|تحقق مجددًا|393|
|serverInvalid|اعتبر الخادم هذا التخطيط غير صالح.|394|
|savedResult|النتيجة المحفوظة|395|
|noResult|لا توجد نتيجة محفوظة لهذا السيناريو.|396|
|m_boards_used|الألواح المستخدمة|397|
|m_boards_supplied|الألواح المتاحة|398|
|m_placed|النسخ الموضوعة|399|
|m_unplaced|النسخ غير الموضوعة|400|
|m_utilization|نسبة الاستغلال|401|
|m_required_area|المساحة المطلوبة|402|
|m_placed_area|المساحة الموضوعة|403|
|m_board_area|مساحة اللوح (لوح واحد)|404|
|m_used_board_area|مساحة الألواح المستخدمة|405|
|m_unused_area|المساحة غير المستغلة|406|
|m_available_area|المساحة المتاحة|407|
|na|غير متاح|408|
|unplacedTypes|القطع غير الموضوعة|409|
|reason_not_placed|لم توضع (قد يكون حدًا للخوارزمية التقريبية)|410|
|reason_cannot_fit|لا تتسع في المساحة الصالحة للوح|411|
|definitions|تعريفات المقاييس|412|
|d1|مساحة اللوح = العرض × الارتفاع للوح كامل واحد، بالمم².|413|
|d2|مساحة الألواح المستخدمة = مساحة اللوح × الألواح المستخدمة.|414|
|d3|الاستغلال = المساحة الموضوعة ÷ مساحة الألواح المستخدمة × 100. غير متاح عند عدم وضع أي قطعة.|415|
|d4|المساحة غير المستغلة = مساحة الألواح المستخدمة − المساحة الموضوعة. تشمل الهوامش وعرض القطع وليست بواقي صالحة.|416|
|d5|المساحة المطلوبة = مجموع مساحات القطع × كمياتها.|417|
|compatNote|توافق المادة غير متحقق منه. لا نقل للكيلوغرامات ولا اختيار من المخزون.|418|
|history|سجل المراجعات|419|
|historyEmpty|لا يوجد سجل بعد.|420|
|historyError|تعذّر تحميل السجل.|421|
|historyBy|{actor} · {time}|422|
|show|عرض المدخلات والنتائج|423|
|hide|إخفاء|424|
|inputs|المدخلات|425|
|partsN|{n} قطع|426|
|validLayout|تخطيط صالح|427|
|invalidLayout|تخطيط غير صالح|428|
|margins4|ي {l} · ي {r} · أ {t} · س {b}|429|
|ce_stale_revision|تغيّرت الخطة منذ تحميلها.|430|
|ce_duplicate_request|تمت معالجة هذا الطلب مسبقًا.|431|
|ce_job_closed|الأمر ملغى ولا يمكن تغيير الخطط.|432|
|ce_validation_error|رفض الخادم بعض القيم.|433|
|ce_invalid_placement|رفض الخادم أحد المواضع.|434|

## artifacts/yieldloop/src/lib/core.ts

### English

|Key|Exact wording/template|Line|
|---|---|---|
|reference|External reference|30|
|referenceHint|Optional. Shown instead of the internal number.|31|
|machine|Cutting machine|31|
|machineHint|Choose a saved machine or type a new name.|32|
|machineUnset|Not set|32|
|internalNo|Internal no.|32|
|demo|Demo data|33|
|demoTitle|Seeded demonstration record|33|
|scrapReason|Scrap reason|33|
|scrapReasonHint|Leave blank if the source does not supply a reason.|34|
|scrapReasonTooLong|Scrap reason must be 160 characters or fewer.|34|
|closeTitle|Close as balanced|35|
|closeDesc|Closing locks the job card and all material records. The server checks machine, issue, good output and exact zero variance.|36|
|closeBtn|Close job|36|
|closeConfirm|Close {num} as balanced?|37|
|closeConfirmDesc|After closing, the job is completed and read-only for everyone.|37|
|closeReady|Ready to close: all checks pass.|37|
|closeBlocked|Cannot close yet|38|
|closeDirty|Save your edits before closing.|38|
|closed|{num} closed as balanced.|38|
|completedLocked|This job is completed. Records are read-only.|39|
|matReadOnlyCompleted|This job is completed. Material records are read-only.|39|
|err_machine_required|Set a cutting machine before closing.|40|
|err_material_incomplete|Record issued material and good output before closing.|41|
|err_material_unbalanced|Issued material does not equal good + scrap + offcuts. Variance must be exactly zero.|41|
|err_job_closed|This job is already closed or cancelled.|42|
|err_stale_revision|The job changed since you loaded it. Reload and try again.|43|
|compare|Compare same-machine jobs|43|
|cmpTitle|Same-machine comparison|44|
|cmpSub|Two jobs on one machine, side by side. All values are exact server figures.|44|
|left|Job A|44|
|right|Job B|45|
|pick|Search by reference or title|45|
|pickPrompt|Select two different jobs to compare.|45|
|sameJob|Choose two different jobs.|45|
|vSame|Same machine and material — differences are comparable.|45|
|vMachineMissing|Not a same-machine comparison: at least one job has no machine set.|46|
|vMachineMismatch|Not a same-machine comparison: the jobs ran on different machines.|47|
|vMaterialMismatch|Same machine, but different materials — differences are not computed.|48|
|vUnmeasured|Same machine, but at least one job has no material summary yet.|49|
|issued|Issued|50|
|good|Good output|51|
|scrap|Total scrap|51|
|offcut|Reusable offcuts|51|
|variance|Variance|51|
|yield_rate|Good yield|51|
|scrap_rate|Scrap rate|51|
|diff|A − B|51|
|kg|kg|52|
|pp|pp|52|
|ppNote|Rate differences are percentage points (pp), not percentage changes.|52|
|scrapByReason|Scrap by reason|52|
|noScrap|No scrap recorded.|53|
|records|Source records|53|
|openJob|Open job card|53|
|entries|{n} entries|53|
|noSummary|No material summary.|53|
|loadError|Could not load the comparison.|54|
|noJobs|No matching jobs.|54|
|material|Material|54|
|defs|Issued = all material issued. Good = acceptable product. Total scrap = sum of scrap categories. Offcuts = retained for reuse, not scrap. Variance = issued − (good + scrap + offcuts), must be exactly 0 to close. Good yield = good ÷ issued × 100. Scrap rate = total scrap ÷ issued × 100 (not 100 − yield). Rework is not recorded in this scope.|54|
|largestScrap|Largest scrap category|55|
|largestScrapNote|Calculated from all active scrap records. Not AI — available even when the assistant provider is offline.|56|
|noLargestScrap|No active scrap recorded.|56|

### Arabic

|Key|Exact wording/template|Line|
|---|---|---|
|reference|المرجع الخارجي|59|
|referenceHint|اختياري. يظهر بدلاً من الرقم الداخلي.|60|
|machine|آلة القص|60|
|machineHint|اختر آلة محفوظة أو اكتب اسماً جديداً.|61|
|machineUnset|غير محددة|61|
|internalNo|الرقم الداخلي|61|
|demo|بيانات تجريبية|62|
|demoTitle|سجل عرض تجريبي|62|
|scrapReason|سبب الهالك|62|
|scrapReasonHint|اتركه فارغاً إذا لم يذكر المصدر سبباً.|63|
|unspecified|غير محدد (لم يُذكر)|63|
|scrapReasonTooLong|يجب ألا يتجاوز سبب الهالك 160 حرفاً.|63|
|closeTitle|إغلاق كمتوازن|64|
|closeDesc|يقفل الإغلاق بطاقة الأمر وجميع سجلات المواد. يتحقق الخادم من الآلة والصرف والإنتاج الجيد وأن الفرق صفر تماماً.|65|
|closeBtn|إغلاق الأمر|65|
|closeConfirm|إغلاق {num} كمتوازن؟|66|
|closeConfirmDesc|بعد الإغلاق يصبح الأمر مكتملاً وللعرض فقط للجميع.|66|
|closeReady|جاهز للإغلاق: جميع الفحوص ناجحة.|66|
|closeBlocked|لا يمكن الإغلاق بعد|67|
|closeDirty|احفظ تعديلاتك قبل الإغلاق.|67|
|closed|تم إغلاق {num} كمتوازن.|67|
|completedLocked|هذا الأمر مكتمل. السجلات للعرض فقط.|68|
|matReadOnlyCompleted|هذا الأمر مكتمل. سجلات المواد للعرض فقط.|68|
|err_machine_required|حدد آلة القص قبل الإغلاق.|69|
|err_material_incomplete|سجّل المادة المصروفة والإنتاج الجيد قبل الإغلاق.|70|
|err_material_unbalanced|المادة المصروفة لا تساوي الجيد + الهالك + البواقي. يجب أن يكون الفرق صفراً تماماً.|70|
|err_job_closed|هذا الأمر مغلق أو ملغى بالفعل.|71|
|err_stale_revision|تغيّر الأمر منذ تحميله. أعد التحميل وحاول مجدداً.|72|
|compare|مقارنة أوامر على نفس الآلة|72|
|cmpTitle|مقارنة على نفس الآلة|73|
|cmpSub|أمران على آلة واحدة جنباً إلى جنب. جميع القيم أرقام دقيقة من الخادم.|73|
|left|الأمر أ|73|
|right|الأمر ب|74|
|pick|ابحث بالمرجع أو العنوان|74|
|pickPrompt|اختر أمرين مختلفين للمقارنة.|74|
|sameJob|اختر أمرين مختلفين.|74|
|vSame|نفس الآلة والمادة — الفروق قابلة للمقارنة.|74|
|vMachineMissing|ليست مقارنة على نفس الآلة: أحد الأمرين بلا آلة محددة.|75|
|vMachineMismatch|ليست مقارنة على نفس الآلة: نُفذ الأمران على آلتين مختلفتين.|76|
|vMaterialMismatch|نفس الآلة لكن بمادتين مختلفتين — لم تُحسب الفروق.|77|
|vUnmeasured|نفس الآلة لكن أحد الأمرين بلا ملخص مواد بعد.|78|
|issued|المصروف|79|
|good|الإنتاج الجيد|80|
|scrap|إجمالي الهالك|80|
|offcut|بواقٍ قابلة لإعادة الاستخدام|80|
|variance|الفرق|80|
|yield_rate|نسبة الإنتاج الجيد|80|
|scrap_rate|نسبة الهالك|80|
|diff|أ − ب|80|
|kg|كغ|81|
|pp|نقطة|81|
|ppNote|فروق النسب بالنقاط المئوية وليست تغيراً نسبياً.|81|
|scrapByReason|الهالك حسب السبب|81|
|noScrap|لا يوجد هالك مسجل.|82|
|records|السجلات المصدرية|82|
|openJob|فتح بطاقة الأمر|82|
|entries|{n} سجلات|82|
|noSummary|لا يوجد ملخص مواد.|82|
|loadError|تعذر تحميل المقارنة.|83|
|noJobs|لا توجد أوامر مطابقة.|83|
|material|المادة|83|
|defs|المصروف = كل المادة المصروفة. الجيد = المنتج المقبول. إجمالي الهالك = مجموع فئات الهالك. البواقي = محفوظة لإعادة الاستخدام وليست هالكاً. الفرق = المصروف − (الجيد + الهالك + البواقي) ويجب أن يكون 0 تماماً للإغلاق. نسبة الإنتاج الجيد = الجيد ÷ المصروف × 100. نسبة الهالك = إجمالي الهالك ÷ المصروف × 100 (وليست 100 − المردود). إعادة التشغيل غير مسجلة في هذا النطاق.|83|
|largestScrap|أكبر فئة هالك|84|
|largestScrapNote|محسوبة من جميع سجلات الهالك النشطة. ليست ذكاءً اصطناعياً — متاحة حتى عند تعطل مزود المساعد.|85|
|noLargestScrap|لا يوجد هالك نشط مسجل.|85|

## artifacts/yieldloop/src/lib/feature-i18n.ts

### English

|Key|Exact wording/template|Line|
|---|---|---|
|asTitle|Production assistant|4|
|asLead|Read the recorded evidence for one job, then optionally ask an advisory question. Facts and kg calculations come from YieldLoop records, never from the model.|5|
|asPickJob|Job|6|
|asSearchJobs|Search job number or title|7|
|asNoJobs|No jobs match.|8|
|asJobUnavailable|This job was not found or is not available to your account. Choose another job.|9|
|asChooseJob|Choose a job to load its evidence.|10|
|asEvidence|Recorded evidence|11|
|asEvidenceBadge|From YieldLoop records — not AI-generated|12|
|asGenerated|Snapshot taken|13|
|asRevision|Job revision {r} · material revision {m}|14|
|asFacts|Recorded facts|15|
|asNoFacts|No recorded quantities for this job yet.|16|
|asVoided|Voided|17|
|asFindings|Calculated kg findings|18|
|asFindingsNote|Computed by the server from the authoritative kg snapshot.|19|
|asNoFindings|No kg summary is available yet — record issued, good, scrap and offcut first.|20|
|asCutting|Cutting plans (geometry, not kg)|21|
|asCuttingNote|Geometric plan metrics. These are not measured material and are never added to kg accounting.|22|
|asNoCutting|No cutting plans saved for this job.|23|
|asScenario|Scenario {n}|24|
|asNoMetrics|No interpretable metrics in this scenario.|25|
|asLimitations|Limitations|26|
|asAsk|Ask an advisory question|27|
|asQuestion|Question|28|
|asQuestionPh|e.g. Which recorded quantities would explain the variance on this job?|29|
|asLanguage|Answer language|30|
|asNotes|Include free-text notes|31|
|asNotesHint|Off by default. Notes may contain names or other details.|32|
|asConsent|I confirm sending this job’s recorded quantities, timestamps and my typed question{notes} to the configured AI provider.|33|
|asConsentNotes|, plus its notes,|34|
|asSend|Ask|35|
|asSending|Asking…|36|
|asUnavailable|AI provider not configured|37|
|asUnavailableDesc|Evidence stays readable. Asking questions is disabled until an administrator configures the provider.|38|
|asProvider|Provider: {p} · model {m}|39|
|asAnswer|Advisory answer|40|
|asAiBadge|AI-generated · advisory|41|
|asLeads|Possible leads to check|42|
|asEvidenceNeeded|Evidence needed|43|
|asNextStep|Next step|44|
|asRecords|Records|45|
|asNoSave|Nothing is saved. Leaving this page discards the answer.|46|
|asStatusError|Could not check the AI provider status.|47|
|asOpenAssistant|Ask assistant|48|
|ai_unavailable|The AI provider is not available right now.|49|
|ai_provider_error|The AI provider returned an error. Try again shortly.|50|
|ai_invalid_output|The AI response failed server checks and was discarded.|51|
|f_issued|Issued|52|
|f_good|Good|53|
|f_scrap|Scrap|53|
|f_offcut|Offcut|53|
|f_accounted|Accounted|53|
|f_variance|Variance|53|
|f_yield_rate|Yield rate|54|
|f_scrap_rate|Scrap rate|54|
|pkTitle|3D packaging concept|54|
|pkLead|Model a tray, sleeve or lid box from internal dimensions in mm. Every panel has its real thickness. Server-validated geometry only.|55|
|pkConceptBadge|Concept — not manufacturable|56|
|pkConceptNote|This is a geometric concept, not a production-validated design, dieline or cutting plan. It is not saved to YieldLoop.|57|
|pkTemplate|Template|58|
|pkName|Concept name|59|
|pkState|View|60|
|st_assembled|Assembled|61|
|st_open|Open|62|
|pkOpenTray|Open shows separated panels (exploded), not an unfolded dieline.|62|
|pkOpenLid|Open shows the lid lifted straight up. No hinge is modelled.|63|
|pkSleeveNoOpen|Sleeves have no open view.|64|
|pkDims|Internal dimensions (mm)|65|
|pkValidate|Validate & render|66|
|pkValidating|Validating…|67|
|pkStale|Stale preview: it still shows the last validated concept ({state}). Your name, dimension or view changes are pending — press Validate changes to update it.|68|
|pkStaleTag|Stale|69|
|pkUpdate|Validate changes|70|
|e_decimal_mm_required|Enter mm as a plain number with up to 3 decimals|70|
|e_out_of_range|Outside the allowed range|71|
|e_too_thick|4 × thickness must not exceed the smallest of L, W, H|71|
|e_exceeds_height|Lid height must not exceed H|72|
|e_missing_or_unknown_parameters|Parameters do not match this template|72|
|e_unsupported_template|Unsupported template|73|
|e_unsupported_state|This view is not available for this template|73|
|e_required_max_160|Name is required (max 160 characters)|74|
|e_invalid_fields|Some fields are invalid. Check the highlighted values.|74|
|e_boolean_required|Invalid option|75|
|stale_revision|Records changed while the answer was generated. It was discarded — review the refreshed evidence and ask again.|75|
|asOutdated|Records changed since the last answer, so it was cleared. Evidence below is current.|76|
|asAnswerBasis|Based on evidence generated {t}|77|
|p_supported_template|A supported template|78|
|f_created_at|Summary recorded|79|
|pkEmptyView|Enter all dimensions and validate to render the concept.|80|
|pkSummary|Dimension summary|81|
|pkInternal|Internal L × W × H|82|
|pkExternal|External envelope (assembled)|83|
|pkPanels|{n} panels, {t} mm thick|84|
|pkExport|Export JSON|85|
|pkImport|Import JSON|86|
|pkImported|Concept imported and validated by the server.|87|
|pkFileErr_json|File is not valid JSON.|88|
|pkFileErr_format|Not a YieldLoop packaging concept file.|89|
|pkFileErr_version|Unsupported concept file version.|90|
|pkFileErr_shape|Concept file is malformed.|91|
|pkPropose|Describe a package|92|
|pkProposeHint|The AI suggests a template and dimensions. You review and apply them; nothing renders until the server validates.|93|
|pkDescription|Description|94|
|pkDescriptionPh|e.g. A shallow tray for six 80 mm jars, 3 mm board|95|
|pkSuggest|Suggest|96|
|pkSuggesting|Suggesting…|97|
|pkReview|Review suggestion|98|
|pkMissing|Missing|99|
|pkAssumptions|Assumptions|100|
|pkNoTemplate|No supported template fits this description.|101|
|pkApply|Apply to form|102|
|pkDiscard|Discard|103|
|pkApplied|Suggestion applied. Validate to render.|104|
|pkLimitations|Limitations|105|
|pkRetry|Retry|106|
|pkTemplatesError|Could not load packaging templates.|107|
|e_required|Required|108|
|e_format|Use a plain number with up to 3 decimals|109|
|e_min|Below minimum {v}|109|
|e_max|Above maximum {v}|109|
|e_thickness_ratio|4 × thickness must not exceed the smallest of L, W, H|109|
|e_lid_exceeds_height|Lid height must not exceed H|110|
|e_unknown|Unknown parameter|110|
|e_state_unsupported|Not available for this template|111|
|e_template|Unsupported template|111|
|v_title|3D concept view|111|
|v_reset|Reset view|112|
|v_zoomIn|Zoom in|112|
|v_zoomOut|Zoom out|112|
|v_rotL|Rotate left|112|
|v_rotR|Rotate right|113|
|v_rotU|Tilt up|113|
|v_rotD|Tilt down|113|
|v_panL|Pan left|113|
|v_panR|Pan right|114|
|v_panU|Pan up|114|
|v_panD|Pan down|114|
|v_hint|Drag to rotate, scroll or pinch to zoom, right-drag or two fingers to pan. Arrow keys pan when focused.|114|
|v_noWebgl|3D view unavailable|115|
|v_noWebglDesc|This browser could not start WebGL. The dimension summary below remains accurate.|116|
|p_length|Length (L)|117|
|p_width|Width (W)|118|
|p_height|Height (H)|118|
|p_thickness|Board thickness|118|
|p_lid_height|Lid height|118|
|p_clearance|Lid clearance|118|
|en|The assistant cannot prove causes; leads are only things to check.|197|
|en|Measured kg and cutting geometry are separate; areas are never converted to kg.|198|
|en|Offcut is recorded weight, not reusable stock.|199|
|en|Only the most recent material entries are included.|200|
|en|Only the most recent cutting plans are included.|201|
|en|No kg reconciliation summary exists for this job yet.|202|
|en|Geometric concept only — not production-validated or manufacturable.|203|
|en|No dieline or flat pattern is generated.|204|
|en|Concepts are not transferred to the Cutting Studio.|205|

### Arabic

|Key|Exact wording/template|Line|
|---|---|---|
|asJobUnavailable|لم يُعثر على هذا الأمر أو أنه غير متاح لحسابك. اختر أمرًا آخر.|121|
|asTitle|مساعد الإنتاج|122|
|asLead|اقرأ الأدلة المسجّلة لأمر عمل واحد، ثم اطرح سؤالًا استشاريًا إن شئت. الحقائق وحسابات الكيلوغرام تأتي من سجلات YieldLoop وليس من النموذج.|123|
|asPickJob|أمر العمل|124|
|asSearchJobs|ابحث برقم الأمر أو العنوان|125|
|asNoJobs|لا توجد أوامر مطابقة.|125|
|asChooseJob|اختر أمر عمل لتحميل أدلته.|125|
|asEvidence|الأدلة المسجّلة|126|
|asEvidenceBadge|من سجلات YieldLoop — ليست من إنتاج الذكاء الاصطناعي|126|
|asGenerated|وقت اللقطة|126|
|asRevision|مراجعة الأمر {r} · مراجعة المواد {m}|127|
|asFacts|الحقائق المسجّلة|127|
|asNoFacts|لا توجد كميات مسجّلة لهذا الأمر بعد.|127|
|asVoided|ملغاة|128|
|asFindings|نتائج الكيلوغرام المحسوبة|128|
|asFindingsNote|يحسبها الخادم من لقطة الكيلوغرام المعتمدة.|128|
|asNoFindings|لا يتوفر ملخص بالكيلوغرام بعد — سجّل المصروف والجيد والهالك والفضلات أولًا.|129|
|asCutting|خطط القص (هندسية وليست كيلوغرام)|129|
|asCuttingNote|مقاييس هندسية للخطة. ليست مادة مقيسة ولا تُضاف إلى حساب الكيلوغرام.|130|
|asNoCutting|لا توجد خطط قص محفوظة لهذا الأمر.|130|
|asScenario|السيناريو {n}|131|
|asNoMetrics|لا توجد مقاييس قابلة للعرض في هذا السيناريو.|131|
|asLimitations|القيود|131|
|asAsk|اطرح سؤالًا استشاريًا|132|
|asQuestion|السؤال|132|
|asQuestionPh|مثال: ما الكميات المسجّلة التي قد تفسّر الفرق في هذا الأمر؟|132|
|asLanguage|لغة الإجابة|133|
|asNotes|تضمين الملاحظات النصية|133|
|asNotesHint|معطّل افتراضيًا. قد تحتوي الملاحظات على أسماء أو تفاصيل أخرى.|134|
|asConsent|أؤكد إرسال الكميات المسجّلة والطوابع الزمنية لهذا الأمر وسؤالي{notes} إلى مزوّد الذكاء الاصطناعي المهيّأ.|134|
|asConsentNotes| وملاحظاته|135|
|asSend|اسأل|136|
|asSending|جارٍ السؤال…|136|
|asUnavailable|مزوّد الذكاء الاصطناعي غير مهيّأ|136|
|asUnavailableDesc|تبقى الأدلة قابلة للقراءة. طرح الأسئلة معطّل حتى يهيّئ المسؤول المزوّد.|136|
|asProvider|المزوّد: {p} · النموذج {m}|137|
|asAnswer|إجابة استشارية|137|
|asAiBadge|من إنتاج الذكاء الاصطناعي · استشارية|138|
|asLeads|خيوط محتملة للتحقق|138|
|asEvidenceNeeded|الأدلة المطلوبة|138|
|asNextStep|الخطوة التالية|139|
|asRecords|السجلات|139|
|asNoSave|لا يُحفظ شيء. مغادرة الصفحة تتجاهل الإجابة.|139|
|asStatusError|تعذّر التحقق من حالة مزوّد الذكاء الاصطناعي.|140|
|asOpenAssistant|اسأل المساعد|140|
|ai_unavailable|مزوّد الذكاء الاصطناعي غير متاح حاليًا.|140|
|ai_provider_error|أعاد المزوّد خطأ. حاول بعد قليل.|141|
|ai_invalid_output|فشلت إجابة الذكاء الاصطناعي في فحوص الخادم وتم تجاهلها.|141|
|f_issued|المصروف|142|
|f_good|الجيد|143|
|f_scrap|الهالك|143|
|f_offcut|الفضلات|143|
|f_accounted|المحسوب|143|
|f_variance|الفرق|143|
|f_yield_rate|نسبة المردود|144|
|f_scrap_rate|نسبة الهالك|144|
|pkTitle|تصوّر تغليف ثلاثي الأبعاد|144|
|pkLead|صمّم صينية أو غلافًا أو علبة بغطاء من الأبعاد الداخلية بالمليمتر. لكل لوح سماكته الحقيقية. هندسة يتحقق منها الخادم فقط.|145|
|pkConceptBadge|تصوّر — غير قابل للتصنيع|146|
|pkConceptNote|هذا تصوّر هندسي وليس تصميمًا معتمدًا للإنتاج أو قالب قص أو خطة قص. لا يُحفظ في YieldLoop.|147|
|pkTemplate|القالب|148|
|pkName|اسم التصوّر|149|
|pkState|العرض|149|
|st_assembled|مجمّع|149|
|st_open|مفتوح|149|
|pkOpenTray|الفتح يعرض الألواح منفصلة (مفكّكة)، وليس قالبًا مفرودًا.|149|
|pkOpenLid|الفتح يعرض الغطاء مرفوعًا للأعلى. لا توجد مفصلة.|150|
|pkSleeveNoOpen|الأغلفة ليس لها عرض مفتوح.|150|
|pkDims|الأبعاد الداخلية (مم)|151|
|pkValidate|تحقّق واعرض|151|
|pkValidating|جارٍ التحقق…|151|
|pkStale|معاينة قديمة: ما زالت تعرض آخر تصوّر تم التحقق منه ({state}). تغييرات الاسم أو الأبعاد أو العرض معلّقة — اضغط «تحقّق من التغييرات» للتحديث.|151|
|pkStaleTag|قديمة|152|
|pkUpdate|تحقّق من التغييرات|153|
|e_decimal_mm_required|أدخل المليمترات رقمًا بسيطًا حتى 3 منازل عشرية|153|
|e_out_of_range|خارج النطاق المسموح|154|
|e_too_thick|يجب ألا تتجاوز 4 × السماكة أصغر الأبعاد|154|
|e_exceeds_height|يجب ألا يتجاوز ارتفاع الغطاء الارتفاع|155|
|e_missing_or_unknown_parameters|المعاملات لا تطابق هذا القالب|155|
|e_unsupported_template|قالب غير مدعوم|156|
|e_unsupported_state|هذا العرض غير متاح لهذا القالب|156|
|e_required_max_160|الاسم مطلوب (160 حرفًا كحد أقصى)|157|
|e_invalid_fields|بعض الحقول غير صالحة. راجع القيم المحددة.|157|
|e_boolean_required|خيار غير صالح|158|
|stale_revision|تغيّرت السجلات أثناء توليد الإجابة فتم تجاهلها — راجع الأدلة المحدّثة واسأل مجددًا.|158|
|asOutdated|تغيّرت السجلات منذ آخر إجابة فتم مسحها. الأدلة أدناه حالية.|159|
|asAnswerBasis|مبنية على أدلة أُنشئت {t}|160|
|p_supported_template|قالب مدعوم|161|
|f_created_at|وقت تسجيل الملخص|162|
|pkEmptyView|أدخل جميع الأبعاد وتحقّق لعرض التصوّر.|163|
|pkSummary|ملخص الأبعاد|163|
|pkInternal|الداخلي ط × ع × ا|164|
|pkExternal|الغلاف الخارجي (مجمّع)|164|
|pkPanels|{n} ألواح بسماكة {t} مم|164|
|pkExport|تصدير JSON|164|
|pkImport|استيراد JSON|165|
|pkImported|تم استيراد التصوّر وتحقق منه الخادم.|165|
|pkFileErr_json|الملف ليس JSON صالحًا.|165|
|pkFileErr_format|ليس ملف تصوّر تغليف من YieldLoop.|166|
|pkFileErr_version|إصدار ملف غير مدعوم.|166|
|pkFileErr_shape|ملف التصوّر تالف.|166|
|pkPropose|صف عبوة|166|
|pkProposeHint|يقترح الذكاء الاصطناعي قالبًا وأبعادًا. تراجعها وتطبّقها؛ لا يُعرض شيء قبل تحقق الخادم.|167|
|pkDescription|الوصف|167|
|pkDescriptionPh|مثال: صينية ضحلة لستة برطمانات 80 مم، كرتون 3 مم|168|
|pkSuggest|اقترح|168|
|pkSuggesting|جارٍ الاقتراح…|168|
|pkReview|مراجعة الاقتراح|168|
|pkMissing|ناقص|169|
|pkAssumptions|الافتراضات|169|
|pkNoTemplate|لا يوجد قالب مدعوم يناسب هذا الوصف.|169|
|pkApply|طبّق على النموذج|169|
|pkDiscard|تجاهل|170|
|pkApplied|تم تطبيق الاقتراح. تحقّق للعرض.|170|
|pkLimitations|القيود|170|
|pkRetry|إعادة المحاولة|170|
|pkTemplatesError|تعذّر تحميل قوالب التغليف.|170|
|e_required|مطلوب|171|
|e_format|استخدم رقمًا بسيطًا حتى 3 منازل عشرية|172|
|e_min|أقل من الحد الأدنى {v}|172|
|e_max|أعلى من الحد الأقصى {v}|172|
|e_thickness_ratio|يجب ألا تتجاوز 4 × السماكة أصغر الأبعاد|172|
|e_lid_exceeds_height|يجب ألا يتجاوز ارتفاع الغطاء الارتفاع|173|
|e_unknown|معامل غير معروف|173|
|e_state_unsupported|غير متاح لهذا القالب|174|
|e_template|قالب غير مدعوم|174|
|v_title|عرض التصوّر ثلاثي الأبعاد|174|
|v_reset|إعادة العرض|175|
|v_zoomIn|تكبير|175|
|v_zoomOut|تصغير|175|
|v_rotL|تدوير لليسار|175|
|v_rotR|تدوير لليمين|176|
|v_rotU|إمالة للأعلى|176|
|v_rotD|إمالة للأسفل|176|
|v_panL|تحريك لليسار|176|
|v_panR|تحريك لليمين|177|
|v_panU|تحريك للأعلى|177|
|v_panD|تحريك للأسفل|177|
|v_hint|اسحب للتدوير، مرّر أو اقرص للتكبير، اسحب بالزر الأيمن أو بإصبعين للتحريك. الأسهم تحرّك العرض عند التركيز.|177|
|v_noWebgl|العرض ثلاثي الأبعاد غير متاح|178|
|v_noWebglDesc|تعذّر تشغيل WebGL في هذا المتصفح. ملخص الأبعاد أدناه يبقى دقيقًا.|179|
|p_length|الطول (ط)|179|
|p_width|العرض (ع)|180|
|p_height|الارتفاع (ا)|180|
|p_thickness|سماكة اللوح|180|
|p_lid_height|ارتفاع الغطاء|180|
|p_clearance|خلوص الغطاء|180|
|ar|لا يستطيع المساعد إثبات الأسباب؛ الخيوط مجرد أمور للتحقق.|197|
|ar|الكيلوغرام المقيس وهندسة القص منفصلان؛ لا تُحوّل المساحات إلى كيلوغرام.|198|
|ar|الفضلات وزن مسجّل وليست مخزونًا قابلًا لإعادة الاستخدام.|199|
|ar|تم تضمين أحدث قيود المواد فقط.|200|
|ar|تم تضمين أحدث خطط القص فقط.|201|
|ar|لا يوجد ملخص مطابقة بالكيلوغرام لهذا الأمر بعد.|202|
|ar|تصوّر هندسي فقط — غير معتمد للإنتاج وغير قابل للتصنيع.|203|
|ar|لا يتم توليد قالب قص أو نمط مفرود.|204|
|ar|لا تُنقل التصوّرات إلى استوديو القص.|205|

## artifacts/yieldloop/src/lib/i18n.tsx

### English

|Key|Exact wording/template|Line|
|---|---|---|
|brand|YieldLoop|5|
|phase|Material accountability workspace|6|
|navDashboard|Dashboard|7|
|navReports|Reports|8|
|title|System connectivity|9|
|subtitle|Live checks against the YieldLoop server and its PostgreSQL database. Results are shown exactly as the server reports them.|10|
|switchLang|العربية|11|
|switchLangLabel|Switch language to Arabic|12|
|retryAll|Check again|13|
|retry|Retry|14|
|apiTitle|API service|15|
|apiDesc|Confirms the application server is running and responding.|16|
|dbTitle|PostgreSQL database|17|
|dbDesc|Confirms the server can reach and query the database.|18|
|checking|Checking|19|
|checkingDetail|Waiting for a response from the server.|20|
|ok|Operational|21|
|okApi|The API server responded and reports healthy.|22|
|okDb|The database is connected and accepting queries.|23|
|failed|Unavailable|24|
|dbUnavailable|The server is running but cannot reach the database.|25|
|timeout|No response within {s} seconds.|26|
|network|The server could not be reached. Check the network or that the API service is running.|27|
|httpError|The server returned an error (HTTP {code}).|28|
|unexpected|The server responded with an unexpected result.|29|
|endpoint|Endpoint|30|
|httpStatus|HTTP|31|
|checkedAt|Checked at|32|
|summaryChecking|Running checks|33|
|summaryOk|All systems connected|34|
|summaryPartial|Attention needed|35|
|summaryDown|Services unavailable|36|
|footer|Status is never cached as healthy. Each check makes a new request with a {s}-second timeout.|37|
|nav|Navigation|38|
|navHome|Overview|39|
|navEmployees|Employees|40|
|navPassword|Password|41|
|navHealth|System status|42|
|signIn|Sign in|43|
|signingIn|Signing in|44|
|signInTitle|Sign in to YieldLoop|45|
|signInSubtitle|Use the account your Manager created for you. Accounts are issued by Managers only.|46|
|username|Username|47|
|password|Password|48|
|showPassword|Show password|49|
|hidePassword|Hide password|50|
|noAccount|No account? Ask a Manager at your site to create one.|51|
|passwordChangedNotice|Your password was changed. Sign in again with the new password.|52|
|sessionEndedNotice|Your session ended. Sign in again to continue.|53|
|signOut|Sign out|54|
|signingOut|Signing out|55|
|loadingSession|Checking your session|56|
|sessionError|Could not confirm your session with the server.|57|
|role_cutting_operator|Cutting operator|58|
|role_production_supervisor|Production supervisor|59|
|role_manager|Manager|60|
|roleLabel|Role|61|
|welcome|Signed in as {name}|62|
|homeTitle|Your workspace|63|
|homeSubtitle|Your identity, role, and access to production jobs on this YieldLoop site.|64|
|identity|Identity|65|
|fullName|Full name|66|
|accountStatus|Account|67|
|active|Active|68|
|inactive|Inactive|69|
|roleScope_cutting_operator|Views open production jobs. Read-only access.|70|
|roleScope_production_supervisor|Views jobs, opens drafts, updates notes and records materials on open jobs.|71|
|roleScope_manager|Manages production jobs, employee accounts, roles and access.|72|
|manageEmployees|Manage employees|73|
|changeMyPassword|Change my password|74|
|notSet|Not set|75|
|empTitle|Employees|76|
|empSubtitle|Create accounts, assign roles, control access and issue temporary passwords. Temporary passwords are never shown again after you submit them.|77|
|addEmployee|Add employee|78|
|searchEmployees|Search by name or username|79|
|colEmployee|Employee|80|
|colRole|Role|81|
|colStatus|Status|82|
|colPassword|Password|83|
|colActions|Actions|84|
|you|You|85|
|pwdTemporary|Temporary, must change|86|
|pwdExpired|Temporary, expired|87|
|pwdSet|Set by employee|88|
|resetPassword|Reset password|89|
|deactivate|Deactivate|90|
|activate|Activate|91|
|emptyEmployees|No employees yet|92|
|emptyEmployeesDesc|Add the first account to give someone access.|93|
|noMatches|No employees match "{q}".|94|
|loadError|Could not load employees.|95|
|createTitle|New employee account|96|
|createDesc|Share the temporary password with the employee privately. They must replace it at first sign-in.|97|
|firstName|First name|98|
|lastName|Last name|99|
|optional|optional|100|
|temporaryPassword|Temporary password|101|
|tempHint|Not stored in this browser and never shown again.|102|
|cancel|Cancel|103|
|create|Create account|104|
|creating|Creating|105|
|created|Account created for {name}.|106|
|resetTitle|Reset password for {name}|107|
|resetDesc|The employee will be signed out and must set a new password with this temporary one.|108|
|resetSubmit|Set temporary password|109|
|resetting|Saving|110|
|resetDone|Temporary password set for {name}.|111|
|roleUpdated|{name} is now {role}.|112|
|deactivateTitle|Deactivate {name}?|113|
|deactivateDesc|They will be signed out and unable to sign in until reactivated.|114|
|activated|{name} can sign in again.|115|
|deactivated|{name} has been deactivated.|116|
|forbiddenTitle|Access restricted|117|
|forbiddenDesc|Your role cannot open this page. Return to your workspace or ask a Manager about access.|118|
|backHome|Back to overview|119|
|pwdTitle|Change password|120|
|pwdSubtitle|After a successful change you will be signed out and asked to sign in again.|121|
|pwdRequiredTitle|Set your own password|122|
|pwdRequiredDesc|You signed in with a temporary password. Replace it before using YieldLoop.|123|
|pwdExpiredTitle|Temporary password expired|124|
|pwdExpiredDesc|Your temporary password is no longer valid and cannot be changed. Ask a Manager to reset it, then sign in with the new temporary password.|125|
|currentPassword|Current password|126|
|currentTempPassword|Temporary password|127|
|newPassword|New password|128|
|confirmPassword|Confirm new password|129|
|mismatch|The new passwords do not match.|130|
|sameAsCurrent|Choose a password different from the current one.|131|
|required|This field is required.|132|
|savePassword|Change password|133|
|saving|Saving|134|
|err_invalid_credentials|Username or password is incorrect.|135|
|err_csrf_failed|Your security token expired. Please try again.|136|
|err_permission_denied|You do not have permission for this action.|137|
|err_password_change_required|You must change your temporary password first.|138|
|err_temporary_password_expired|The temporary password has expired. Ask a Manager to reset it.|139|
|err_self_change_forbidden|You cannot change your own role or access.|140|
|err_last_manager|At least one active Manager must remain.|141|
|err_validation_error|Some fields need attention.|142|
|err_throttled|Too many attempts. Wait a moment and try again.|143|
|err_service_unavailable|The service is unavailable right now. Try again shortly.|144|
|err_not_authenticated|Your session has ended. Sign in again.|145|
|err_network|The server could not be reached. Check your connection.|146|
|err_unknown|Something went wrong. Please try again.|147|
|fieldInvalid|{field}: please check this value.|148|
|field_username|Username|149|
|field_password|Password|150|
|field_first_name|First name|151|
|field_last_name|Last name|152|
|field_role|Role|153|
|field_temporary_password|Temporary password|154|
|field_current_password|Current password|155|
|field_new_password|New password|156|
|field_is_active|Account status|157|
|field_non_field_errors|Request|158|
|navJobs|Production jobs|159|
|jobsTitle|Production jobs|160|
|jobsSubtitle|Each job is a numbered unit of production work. Drafts are prepared by Managers and opened for the floor.|161|
|jobsSubtitleOperator|Jobs currently open for the floor. This list is read-only.|162|
|newJob|New job|163|
|searchJobs|Search by job number or title|164|
|statusFilter|Status|165|
|allStatuses|All statuses|166|
|status_draft|Draft|167|
|status_open|Open|168|
|status_completed|Completed|169|
|field_machine|Machine|170|
|field_reference|Reference|171|
|status_cancelled|Cancelled|172|
|colJob|Job|173|
|colCreatedBy|Created by|174|
|colUpdated|Updated|175|
|jobsLoadError|Could not load production jobs.|176|
|emptyJobs|No production jobs yet|177|
|emptyJobsManager|Create the first draft job to start planning work.|178|
|emptyJobsOther|Jobs appear here once a Manager prepares them.|179|
|emptyJobsOperator|No jobs are open right now.|180|
|noJobMatches|No jobs match these filters.|181|
|clearFilters|Clear filters|182|
|pageOf|Page {page} of {total}|183|
|jobsCount|{n} jobs|184|
|prevPage|Previous page|185|
|nextPage|Next page|186|
|newJobTitle|New production job|187|
|newJobDesc|Jobs are created as drafts. Supervisors and operators will not act on it until it is opened.|188|
|jobTitleLabel|Title|189|
|jobNotesLabel|Notes|190|
|jobTitleHint|Short and specific, as it should read on the floor.|191|
|createJob|Create draft|192|
|jobCreated|Draft {num} created.|193|
|backToJobs|All jobs|194|
|jobLoadError|Could not load this job.|195|
|jobDetails|Details|196|
|revisionLabel|Revision|197|
|createdLabel|Created|198|
|updatedLabel|Last updated|199|
|saveChanges|Save changes|200|
|discardChanges|Discard|201|
|unsaved|Unsaved changes|202|
|jobSaved|Changes saved.|203|
|readOnlyJob|You can view this job but not change it.|204|
|cancelledLocked|Cancelled jobs are permanent and can no longer be changed.|205|
|notesOnlyOpen|Notes can be edited while the job is open.|206|
|noNotes|No notes.|207|
|actions|Status|208|
|openJob|Open job|209|
|cancelJob|Cancel job|210|
|openJobTitle|Open {num}?|211|
|openJobDesc|The job becomes visible to operators on the floor.|212|
|cancelJobTitle|Cancel {num}?|213|
|cancelJobDesc|Cancelling is permanent. The job can never be reopened or edited again.|214|
|keepJob|Keep job|215|
|jobOpened|{num} is now open.|216|
|saveBeforeTransition|Save or discard your edits before changing status.|217|
|jobCancelled|{num} has been cancelled.|218|
|staleTitle|This job changed while you were editing|219|
|staleDesc|Someone saved a newer version. Your edits are kept below. Load the latest version to review it; this replaces your unsaved edits.|220|
|loadLatest|Load latest version|221|
|noTransitions|No status changes available to you.|222|
|err_invalid_transition|That status change is not allowed from the current status.|223|
|err_stale_revision|This job was changed by someone else. Load the latest version and try again.|224|
|err_job_closed|This job is cancelled and can no longer be changed.|225|
|err_not_found|This job does not exist or is not visible to you.|226|
|jobNotFoundTitle|Job not available|227|
|fe_required|{field} is required.|228|
|fe_blank|{field} cannot be blank.|229|
|fe_max_length|{field} is too long.|230|
|fe_invalid_choice|{field} has an invalid value.|231|
|fe_invalid|{field} is invalid.|232|
|fe_unknown_field|{field} is not accepted.|233|
|fe_empty_update|There are no changes to save.|234|
|field_title|Title|235|
|field_notes|Notes|236|
|field_status|Status|237|
|field_revision|Revision|238|
|openJobs|Production jobs|239|
|openJobsDesc|Browse and track production jobs.|240|
|notFoundTitle|Page not found|241|
|notFoundDesc|This address does not exist in YieldLoop.|242|
|matTitle|Materials & reconciliation|243|
|matScope|Tracks one material per job, in kg only. Issued material is reconciled against good output, scrap and offcuts. Completion, rework and material conversions are recorded elsewhere.|244|
|matLoadError|Could not load material records.|245|
|matNoMaterial|No material assigned yet|246|
|matNoMaterialDesc|The first entry must be an issue. It pins the material to this job permanently.|247|
|matPinned|Pinned material|248|
|matPinnedHint|Fixed for this job, even if every entry is voided.|249|
|matUnitKg|kg|250|
|matReadOnlyOpen|You can view material records but not add or void them.|251|
|matReadOnlyDraft|Material entries can be recorded once the job is open.|252|
|matReadOnlyCancelled|This job is cancelled. Material records are read-only.|253|
|matSummary|Reconciliation|254|
|matNoSummary|No totals yet. Totals appear after the first issue.|255|
|matIssued|Issued|256|
|matGood|Good|257|
|matScrap|Scrap|258|
|matOffcut|Offcut|259|
|matAccounted|Accounted|260|
|matVariance|Variance|261|
|matYield|Yield|262|
|matScrapRate|Scrap rate|263|
|matNA|Not available|264|
|matFormulas|How totals are calculated|265|
|fAccounted|Accounted = Good + Scrap + Offcut|266|
|fVariance|Variance = Issued − Accounted|267|
|fYield|Yield = Good ÷ Issued × 100|268|
|fScrap|Scrap rate = Scrap ÷ Issued × 100|269|
|fNull|Rates are not available while Issued is zero. Voided entries are excluded.|270|
|matBalanced|Arithmetic balance only. This does not mean the job is completed or approved.|271|
|matVarianceNote|Variance is unaccounted material, not scrap.|272|
|matSnapshot|Server snapshot {time} · materials revision {rev}|273|
|kind_issue|Issue|274|
|kind_good|Good|275|
|kind_scrap|Scrap|276|
|kind_offcut|Offcut|277|
|matRecord|Record entry|278|
|matRecordTitle|New material entry|279|
|matKind|Entry type|280|
|matQuantity|Quantity (kg)|281|
|matQuantityHint|Positive number, up to 12 digits and 3 decimals.|282|
|matNote|Note|283|
|matSubmit|Record entry|284|
|matRecording|Recording|285|
|matRecorded|Entry recorded.|286|
|matAlreadyRecorded|This entry was already recorded.|287|
|matFirstIssue|The first entry must be an issue.|288|
|matChooseMaterial|Material|289|
|matChooseRequired|Choose a material.|290|
|qtyRequired|Enter a quantity.|291|
|qtyFormat|Use digits only, up to 12 before and 3 after the decimal point.|292|
|qtyPositive|Quantity must be greater than zero.|293|
|noteTooLong|Note is too long.|294|
|matDrift|Material records changed since you started|295|
|matDriftDesc|Your inputs are kept. Review the latest totals and entries, then confirm to submit against them.|296|
|matUseLatest|Review latest and continue|297|
|matJobChanged|The job changed while you were editing. Your inputs are kept. Load the latest state to review before submitting.|298|
|matStale|Not saved: records changed|299|
|matStaleDesc|Your inputs are kept. Load the latest state, review it, and submit again.|300|
|matUncertain|Result unknown|301|
|matUncertainDesc|The connection dropped before the server replied. The entry may have been saved. Refresh to check; retrying is safe and will not duplicate it.|302|
|matCheckRetry|Refresh and check|303|
|matSearch|Search materials|304|
|matNoDefs|No materials defined yet.|305|
|matNoDefMatches|No materials match "{q}".|306|
|matDefsError|Could not load materials.|307|
|matNewDef|New material|308|
|matNewDefDesc|Definitions are permanent and cannot be edited later. Unit is kg.|309|
|matName|Name|310|
|matSpec|Specification|311|
|matCreateDef|Create material|312|
|matDefCreated|Material {name} created.|313|
|matManagerOnly|Only Managers can create materials.|314|
|matEntries|Entries|315|
|matNoEntries|No entries recorded.|316|
|matVoid|Void|317|
|matVoided|Voided|318|
|matVoidedBy|Voided by {user} · {time}|319|
|matBy|{user} · {time}|320|
|matVoidTitle|Void this entry?|321|
|matVoidDesc|The original record is kept and shown crossed out. Totals are recalculated without it. This cannot be undone.|322|
|matReason|Reason|323|
|matReasonRequired|A reason is required.|324|
|matConfirmVoid|Void entry|325|
|matVoiding|Voiding|326|
|matVoidDone|Entry voided.|327|
|mat_err_issue_required|The first entry must be an issue.|328|
|mat_err_material_mismatch|This job is pinned to a different material.|329|
|mat_err_unit_mismatch|Only kg is accepted.|330|
|mat_err_stale_revision|Records changed since you started. Load the latest and review.|331|
|mat_err_job_not_open|The job is no longer open. Entries cannot be recorded.|332|
|mat_err_material_conflict|Another material was pinned to this job first.|333|
|mat_err_duplicate_record|This request was already recorded.|334|
|mat_err_already_voided|This entry is already voided.|335|
|mat_err_material_record_conflict|This material already exists. Search for it instead.|336|
|field_quantity|Quantity|337|
|field_note|Note|338|
|field_kind|Entry type|339|
|field_material_id|Material|340|
|field_reason|Reason|341|
|field_name|Name|342|
|field_specification|Specification|343|
|field_unit|Unit|344|
|field_job_revision|Job revision|345|
|navInventory|Inventory|346|
|invTitle|Offcut inventory|347|
|invSubtitle|Traceable kg offcut lots registered from recorded job output. A lot records that material exists; it says nothing about whether it fits another job.|348|
|invFoundation|Foundation only. Compatibility is unverified and no reuse policy is defined, so reserve, release and consume are blocked.|349|
|invSearch|Search job number, material or specification|350|
|invAllStates|All|351|
|state_available|Available|352|
|state_voided|Voided|353|
|invAvailableHint|Available means registered only. It does not mean suitable or approved for reuse.|354|
|invEmpty|No lots registered yet|355|
|invEmptyDesc|Lots appear here after a supervisor or manager registers an offcut entry from an Open job.|356|
|invNoMatch|No lots match these filters|357|
|invClear|Clear filters|358|
|invLoadError|Inventory could not be loaded.|359|
|invFilteredJob|Showing lots from job #{id}|360|
|invCount|{n} lots|361|
|invLot|Lot|362|
|invRemaining|Remaining|363|
|invOriginal|Original quantity|364|
|invState|State|365|
|invSourceJob|Source job|366|
|invSourceEntry|Source entry|367|
|invReconciliation|Reconciliation|368|
|invSourceStatus|Source job status|369|
|invSourceVoided|Source entry voided|370|
|invSourceVoidedYes|Yes, the source entry was voided|371|
|invSourceVoidedNo|No|372|
|invCreated|Registered|373|
|invMaterial|Material|374|
|invCompat|Compatibility: unverified|375|
|invPolicy|Reuse policy: not defined|376|
|invBlocked|Reserve, release and consume are blocked until a reuse policy exists.|377|
|invHistory|History|378|
|invNoHistory|No history events.|379|
|act_addition|Registered|380|
|act_void|Voided|381|
|invBack|All inventory|382|
|invDetailError|This lot could not be loaded.|383|
|invVoid|Void lot|384|
|invVoidTitle|Void this lot?|385|
|invVoidDesc|Voiding is final. The lot stays in history and cannot be edited or restored.|386|
|invVoidConfirm|I understand voiding is permanent.|387|
|invVoiding|Voiding|388|
|invVoidDone|Lot voided|389|
|invVoidStale|This lot changed since you opened the dialog. Your reason is kept. Load the latest version and review before confirming.|390|
|invTerminal|This lot is voided. Voided is a final state.|391|
|invReadOnly|You can view this lot but not void it.|392|
|invRegister|Register in inventory|393|
|invRegisterTitle|Register offcut in inventory|394|
|invRegisterDesc|The whole recorded output becomes one lot. Partial quantities are not supported.|395|
|invRegisterQty|Whole recorded output|396|
|invRegisterConfirm|I confirm the whole recorded quantity is registered. This does not verify compatibility or approve reuse.|397|
|invRegistering|Registering|398|
|invRegistered|Offcut registered|399|
|invReason|Reason|400|
|invReasonRequired|A reason is required.|401|
|invViewJobLots|View lots for this job|402|
|inv_err_inventory_conflict|Inventory changed at the same time. Reload and try again.|403|
|inv_err_already_registered|This offcut entry is already registered in inventory.|404|
|inv_err_invalid_offcut_source|Only non-voided offcut entries can be registered.|405|
|inv_err_job_not_open|The job is not Open. Inventory changes are only allowed on Open jobs.|406|
|inv_err_stale_revision|This lot was changed by someone else.|407|
|inv_err_reuse_policy_required|Reuse is blocked until a reuse policy is defined.|408|
|inv_err_inventory_active|This entry has an active inventory lot.|409|
|mat_err_inventory_active|This offcut is registered in inventory. Void the inventory lot first, then correct the entry.|410|

### Arabic

|Key|Exact wording/template|Line|
|---|---|---|
|brand|YieldLoop|414|
|phase|مساحة عمل لمحاسبة المواد|415|
|navDashboard|لوحة المتابعة|416|
|navReports|التقارير|417|
|title|اتصال النظام|418|
|subtitle|فحوصات مباشرة لخادم YieldLoop وقاعدة بيانات PostgreSQL. تُعرض النتائج كما يُبلغ عنها الخادم تمامًا.|419|
|switchLang|English|420|
|switchLangLabel|تغيير اللغة إلى الإنجليزية|421|
|retryAll|إعادة الفحص|422|
|retry|إعادة المحاولة|423|
|apiTitle|خدمة الواجهة البرمجية|424|
|apiDesc|يتحقق من أن خادم التطبيق يعمل ويستجيب.|425|
|dbTitle|قاعدة بيانات PostgreSQL|426|
|dbDesc|يتحقق من قدرة الخادم على الوصول إلى قاعدة البيانات والاستعلام منها.|427|
|checking|جارٍ الفحص|428|
|checkingDetail|بانتظار استجابة من الخادم.|429|
|ok|يعمل|430|
|okApi|استجاب خادم الواجهة البرمجية وأفاد بأنه سليم.|431|
|okDb|قاعدة البيانات متصلة وتقبل الاستعلامات.|432|
|failed|غير متاح|433|
|dbUnavailable|الخادم يعمل لكنه لا يستطيع الوصول إلى قاعدة البيانات.|434|
|timeout|لم تصل استجابة خلال {s} ثوانٍ.|435|
|network|تعذّر الوصول إلى الخادم. تحقّق من الشبكة أو من تشغيل خدمة الواجهة البرمجية.|436|
|httpError|أعاد الخادم خطأ (HTTP {code}).|437|
|unexpected|استجاب الخادم بنتيجة غير متوقعة.|438|
|endpoint|نقطة الوصول|439|
|httpStatus|HTTP|440|
|checkedAt|وقت الفحص|441|
|summaryChecking|جارٍ تنفيذ الفحوصات|442|
|summaryOk|جميع الأنظمة متصلة|443|
|summaryPartial|يتطلب الانتباه|444|
|summaryDown|الخدمات غير متاحة|445|
|footer|لا تُخزَّن الحالة السليمة مؤقتًا أبدًا. كل فحص يرسل طلبًا جديدًا بمهلة {s} ثوانٍ.|446|
|nav|التنقل|447|
|navHome|نظرة عامة|448|
|navEmployees|الموظفون|449|
|navPassword|كلمة المرور|450|
|navHealth|حالة النظام|451|
|signIn|تسجيل الدخول|452|
|signingIn|جارٍ تسجيل الدخول|453|
|signInTitle|تسجيل الدخول إلى YieldLoop|454|
|signInSubtitle|استخدم الحساب الذي أنشأه لك المدير. لا يُصدر الحسابات إلا المديرون.|455|
|username|اسم المستخدم|456|
|password|كلمة المرور|457|
|showPassword|إظهار كلمة المرور|458|
|hidePassword|إخفاء كلمة المرور|459|
|noAccount|ليس لديك حساب؟ اطلب من مدير موقعك إنشاء حساب لك.|460|
|passwordChangedNotice|تم تغيير كلمة المرور. سجّل الدخول مجددًا بكلمة المرور الجديدة.|461|
|sessionEndedNotice|انتهت جلستك. سجّل الدخول مجددًا للمتابعة.|462|
|signOut|تسجيل الخروج|463|
|signingOut|جارٍ تسجيل الخروج|464|
|loadingSession|جارٍ التحقق من جلستك|465|
|sessionError|تعذّر تأكيد جلستك مع الخادم.|466|
|role_cutting_operator|مشغّل قص|467|
|role_production_supervisor|مشرف إنتاج|468|
|role_manager|مدير|469|
|roleLabel|الدور|470|
|welcome|مسجّل الدخول باسم {name}|471|
|homeTitle|مساحة عملك|472|
|homeSubtitle|هويتك ودورك وصلاحيات وصولك إلى أوامر الإنتاج في موقع YieldLoop هذا.|473|
|identity|الهوية|474|
|fullName|الاسم الكامل|475|
|accountStatus|الحساب|476|
|active|نشط|477|
|inactive|غير نشط|478|
|roleScope_cutting_operator|يعرض أوامر الإنتاج المفتوحة بصلاحية القراءة فقط.|479|
|roleScope_production_supervisor|يعرض الأوامر ويفتح المسودات ويحدّث الملاحظات ويسجّل المواد في الأوامر المفتوحة.|480|
|roleScope_manager|يدير أوامر الإنتاج وحسابات الموظفين وأدوارهم وصلاحيات وصولهم.|481|
|manageEmployees|إدارة الموظفين|482|
|changeMyPassword|تغيير كلمة المرور|483|
|notSet|غير محدد|484|
|empTitle|الموظفون|485|
|empSubtitle|أنشئ الحسابات وعيّن الأدوار وتحكّم في الوصول وأصدر كلمات مرور مؤقتة. لا تُعرض كلمات المرور المؤقتة مرة أخرى بعد إرسالها.|486|
|addEmployee|إضافة موظف|487|
|searchEmployees|ابحث بالاسم أو اسم المستخدم|488|
|colEmployee|الموظف|489|
|colRole|الدور|490|
|colStatus|الحالة|491|
|colPassword|كلمة المرور|492|
|colActions|الإجراءات|493|
|you|أنت|494|
|pwdTemporary|مؤقتة، يجب تغييرها|495|
|pwdExpired|مؤقتة، منتهية الصلاحية|496|
|pwdSet|عيّنها الموظف|497|
|resetPassword|إعادة تعيين كلمة المرور|498|
|deactivate|إلغاء التفعيل|499|
|activate|تفعيل|500|
|emptyEmployees|لا يوجد موظفون بعد|501|
|emptyEmployeesDesc|أضف الحساب الأول لمنح أحدهم إمكانية الوصول.|502|
|noMatches|لا يوجد موظفون يطابقون "{q}".|503|
|loadError|تعذّر تحميل الموظفين.|504|
|createTitle|حساب موظف جديد|505|
|createDesc|شارك كلمة المرور المؤقتة مع الموظف بشكل خاص. يجب عليه استبدالها عند أول تسجيل دخول.|506|
|firstName|الاسم الأول|507|
|lastName|اسم العائلة|508|
|optional|اختياري|509|
|temporaryPassword|كلمة المرور المؤقتة|510|
|tempHint|لا تُحفظ في هذا المتصفح ولن تُعرض مرة أخرى.|511|
|cancel|إلغاء|512|
|create|إنشاء الحساب|513|
|creating|جارٍ الإنشاء|514|
|created|تم إنشاء حساب {name}.|515|
|resetTitle|إعادة تعيين كلمة مرور {name}|516|
|resetDesc|سيُسجَّل خروج الموظف ويجب عليه تعيين كلمة مرور جديدة باستخدام هذه الكلمة المؤقتة.|517|
|resetSubmit|تعيين كلمة مرور مؤقتة|518|
|resetting|جارٍ الحفظ|519|
|resetDone|تم تعيين كلمة مرور مؤقتة لـ {name}.|520|
|roleUpdated|أصبح {name} بدور {role}.|521|
|deactivateTitle|إلغاء تفعيل {name}؟|522|
|deactivateDesc|سيُسجَّل خروجه ولن يتمكن من تسجيل الدخول حتى يُعاد تفعيله.|523|
|activated|يمكن لـ {name} تسجيل الدخول مجددًا.|524|
|deactivated|تم إلغاء تفعيل {name}.|525|
|forbiddenTitle|الوصول مقيّد|526|
|forbiddenDesc|لا يسمح دورك بفتح هذه الصفحة. عد إلى مساحة عملك أو استفسر من المدير عن الصلاحيات.|527|
|backHome|العودة إلى النظرة العامة|528|
|pwdTitle|تغيير كلمة المرور|529|
|pwdSubtitle|بعد التغيير بنجاح سيتم تسجيل خروجك وستُطالب بتسجيل الدخول مجددًا.|530|
|pwdRequiredTitle|عيّن كلمة مرورك الخاصة|531|
|pwdRequiredDesc|سجّلت الدخول بكلمة مرور مؤقتة. استبدلها قبل استخدام YieldLoop.|532|
|pwdExpiredTitle|انتهت صلاحية كلمة المرور المؤقتة|533|
|pwdExpiredDesc|لم تعد كلمة المرور المؤقتة صالحة ولا يمكن تغييرها. اطلب من المدير إعادة تعيينها، ثم سجّل الدخول بكلمة المرور المؤقتة الجديدة.|534|
|currentPassword|كلمة المرور الحالية|535|
|currentTempPassword|كلمة المرور المؤقتة|536|
|newPassword|كلمة المرور الجديدة|537|
|confirmPassword|تأكيد كلمة المرور الجديدة|538|
|mismatch|كلمتا المرور الجديدتان غير متطابقتين.|539|
|sameAsCurrent|اختر كلمة مرور مختلفة عن الحالية.|540|
|required|هذا الحقل مطلوب.|541|
|savePassword|تغيير كلمة المرور|542|
|saving|جارٍ الحفظ|543|
|err_invalid_credentials|اسم المستخدم أو كلمة المرور غير صحيحة.|544|
|err_csrf_failed|انتهت صلاحية رمز الأمان. يرجى المحاولة مجددًا.|545|
|err_permission_denied|ليست لديك صلاحية لهذا الإجراء.|546|
|err_password_change_required|يجب عليك تغيير كلمة المرور المؤقتة أولًا.|547|
|err_temporary_password_expired|انتهت صلاحية كلمة المرور المؤقتة. اطلب من المدير إعادة تعيينها.|548|
|err_self_change_forbidden|لا يمكنك تغيير دورك أو صلاحية وصولك بنفسك.|549|
|err_last_manager|يجب أن يبقى مدير نشط واحد على الأقل.|550|
|err_validation_error|بعض الحقول تحتاج إلى مراجعة.|551|
|err_throttled|محاولات كثيرة جدًا. انتظر قليلًا ثم حاول مجددًا.|552|
|err_service_unavailable|الخدمة غير متاحة حاليًا. حاول بعد قليل.|553|
|err_not_authenticated|انتهت جلستك. سجّل الدخول مجددًا.|554|
|err_network|تعذّر الوصول إلى الخادم. تحقّق من اتصالك.|555|
|err_unknown|حدث خطأ ما. يرجى المحاولة مجددًا.|556|
|fieldInvalid|{field}: يرجى التحقق من هذه القيمة.|557|
|field_username|اسم المستخدم|558|
|field_password|كلمة المرور|559|
|field_first_name|الاسم الأول|560|
|field_last_name|اسم العائلة|561|
|field_role|الدور|562|
|field_temporary_password|كلمة المرور المؤقتة|563|
|field_current_password|كلمة المرور الحالية|564|
|field_new_password|كلمة المرور الجديدة|565|
|field_is_active|حالة الحساب|566|
|field_non_field_errors|الطلب|567|
|navJobs|أوامر الإنتاج|568|
|jobsTitle|أوامر الإنتاج|569|
|jobsSubtitle|كل أمر هو وحدة عمل إنتاجي مرقّمة. يُعدّ المديرون المسودات ثم تُفتح لأرض المصنع.|570|
|jobsSubtitleOperator|الأوامر المفتوحة حاليًا لأرض المصنع. هذه القائمة للعرض فقط.|571|
|newJob|أمر جديد|572|
|searchJobs|ابحث برقم الأمر أو العنوان|573|
|statusFilter|الحالة|574|
|allStatuses|كل الحالات|575|
|status_draft|مسودة|576|
|status_open|مفتوح|577|
|status_completed|مكتمل|578|
|field_machine|الآلة|579|
|field_reference|المرجع|580|
|status_cancelled|ملغى|581|
|colJob|الأمر|582|
|colCreatedBy|أنشأه|583|
|colUpdated|آخر تحديث|584|
|jobsLoadError|تعذّر تحميل أوامر الإنتاج.|585|
|emptyJobs|لا توجد أوامر إنتاج بعد|586|
|emptyJobsManager|أنشئ أول مسودة أمر لبدء تخطيط العمل.|587|
|emptyJobsOther|تظهر الأوامر هنا عندما يُعدّها المدير.|588|
|emptyJobsOperator|لا توجد أوامر مفتوحة حاليًا.|589|
|noJobMatches|لا توجد أوامر تطابق هذه المرشحات.|590|
|clearFilters|مسح المرشحات|591|
|pageOf|الصفحة {page} من {total}|592|
|jobsCount|{n} أمر|593|
|prevPage|الصفحة السابقة|594|
|nextPage|الصفحة التالية|595|
|newJobTitle|أمر إنتاج جديد|596|
|newJobDesc|تُنشأ الأوامر كمسودات. لن يعمل عليها المشرفون والمشغّلون حتى تُفتح.|597|
|jobTitleLabel|العنوان|598|
|jobNotesLabel|ملاحظات|599|
|jobTitleHint|قصير ومحدد كما يجب أن يُقرأ في أرض المصنع.|600|
|createJob|إنشاء مسودة|601|
|jobCreated|تم إنشاء المسودة {num}.|602|
|backToJobs|كل الأوامر|603|
|jobLoadError|تعذّر تحميل هذا الأمر.|604|
|jobDetails|التفاصيل|605|
|revisionLabel|المراجعة|606|
|createdLabel|تاريخ الإنشاء|607|
|updatedLabel|آخر تحديث|608|
|saveChanges|حفظ التغييرات|609|
|discardChanges|تجاهل|610|
|unsaved|تغييرات غير محفوظة|611|
|jobSaved|تم حفظ التغييرات.|612|
|readOnlyJob|يمكنك عرض هذا الأمر دون تعديله.|613|
|cancelledLocked|الأوامر الملغاة نهائية ولا يمكن تعديلها.|614|
|notesOnlyOpen|يمكن تعديل الملاحظات عندما يكون الأمر مفتوحًا.|615|
|noNotes|لا توجد ملاحظات.|616|
|actions|الحالة|617|
|openJob|فتح الأمر|618|
|cancelJob|إلغاء الأمر|619|
|openJobTitle|فتح {num}؟|620|
|openJobDesc|سيصبح الأمر مرئيًا للمشغّلين في أرض المصنع.|621|
|cancelJobTitle|إلغاء {num}؟|622|
|cancelJobDesc|الإلغاء نهائي. لا يمكن إعادة فتح الأمر أو تعديله مرة أخرى.|623|
|keepJob|الإبقاء على الأمر|624|
|jobOpened|أصبح {num} مفتوحًا.|625|
|saveBeforeTransition|احفظ تعديلاتك أو تجاهلها قبل تغيير الحالة.|626|
|jobCancelled|تم إلغاء {num}.|627|
|staleTitle|تغيّر هذا الأمر أثناء تعديلك|628|
|staleDesc|حفظ شخص آخر نسخة أحدث. تعديلاتك محفوظة أدناه. حمّل أحدث نسخة لمراجعتها؛ سيؤدي ذلك إلى استبدال تعديلاتك غير المحفوظة.|629|
|loadLatest|تحميل أحدث نسخة|630|
|noTransitions|لا توجد تغييرات حالة متاحة لك.|631|
|err_invalid_transition|تغيير الحالة هذا غير مسموح من الحالة الحالية.|632|
|err_stale_revision|عدّل شخص آخر هذا الأمر. حمّل أحدث نسخة وحاول مجددًا.|633|
|err_job_closed|هذا الأمر ملغى ولا يمكن تعديله.|634|
|err_not_found|هذا الأمر غير موجود أو غير مرئي لك.|635|
|jobNotFoundTitle|الأمر غير متاح|636|
|fe_required|{field} مطلوب.|637|
|fe_blank|لا يمكن ترك {field} فارغًا.|638|
|fe_max_length|{field} طويل جدًا.|639|
|fe_invalid_choice|{field} يحتوي على قيمة غير صالحة.|640|
|fe_invalid|{field} غير صالح.|641|
|fe_unknown_field|{field} غير مقبول.|642|
|fe_empty_update|لا توجد تغييرات لحفظها.|643|
|field_title|العنوان|644|
|field_notes|الملاحظات|645|
|field_status|الحالة|646|
|field_revision|المراجعة|647|
|openJobs|أوامر الإنتاج|648|
|openJobsDesc|تصفّح أوامر الإنتاج وتابعها.|649|
|notFoundTitle|الصفحة غير موجودة|650|
|notFoundDesc|هذا العنوان غير موجود في YieldLoop.|651|
|matTitle|المواد والمطابقة|652|
|matScope|يتتبع مادة واحدة لكل أمر بالكيلوغرام فقط. تُطابَق المادة المصروفة مع الإنتاج السليم والهالك والقصاصات. يُسجَّل الإكمال وإعادة العمل وتحويل المواد في مواضع أخرى.|653|
|matLoadError|تعذّر تحميل سجلات المواد.|654|
|matNoMaterial|لم تُحدَّد مادة بعد|655|
|matNoMaterialDesc|يجب أن يكون أول قيد صرفًا، وهو يثبّت المادة لهذا الأمر نهائيًا.|656|
|matPinned|المادة المثبّتة|657|
|matPinnedHint|ثابتة لهذا الأمر حتى لو أُبطلت كل القيود.|658|
|matUnitKg|كغ|659|
|matReadOnlyOpen|يمكنك عرض سجلات المواد دون إضافتها أو إبطالها.|660|
|matReadOnlyDraft|يمكن تسجيل قيود المواد بعد فتح الأمر.|661|
|matReadOnlyCancelled|هذا الأمر ملغى. سجلات المواد للعرض فقط.|662|
|matSummary|المطابقة|663|
|matNoSummary|لا توجد مجاميع بعد. تظهر بعد أول صرف.|664|
|matIssued|المصروف|665|
|matGood|السليم|666|
|matScrap|الهالك|667|
|matOffcut|القصاصات|668|
|matAccounted|المحتسب|669|
|matVariance|الفرق|670|
|matYield|المردود|671|
|matScrapRate|نسبة الهالك|672|
|matNA|غير متاح|673|
|matFormulas|طريقة حساب المجاميع|674|
|fAccounted|المحتسب = السليم + الهالك + القصاصات|675|
|fVariance|الفرق = المصروف − المحتسب|676|
|fYield|المردود = السليم ÷ المصروف × 100|677|
|fScrap|نسبة الهالك = الهالك ÷ المصروف × 100|678|
|fNull|النسب غير متاحة عندما يكون المصروف صفرًا. القيود المُبطلة مستبعدة.|679|
|matBalanced|توازن حسابي فقط. لا يعني أن الأمر مكتمل أو معتمد.|680|
|matVarianceNote|الفرق مادة غير محتسبة وليس هالكًا.|681|
|matSnapshot|لقطة الخادم {time} · مراجعة المواد {rev}|682|
|kind_issue|صرف|683|
|kind_good|سليم|684|
|kind_scrap|هالك|685|
|kind_offcut|قصاصات|686|
|matRecord|تسجيل قيد|687|
|matRecordTitle|قيد مادة جديد|688|
|matKind|نوع القيد|689|
|matQuantity|الكمية (كغ)|690|
|matQuantityHint|رقم موجب، حتى 12 خانة و3 خانات عشرية.|691|
|matNote|ملاحظة|692|
|matSubmit|تسجيل القيد|693|
|matRecording|جارٍ التسجيل|694|
|matRecorded|تم تسجيل القيد.|695|
|matAlreadyRecorded|سُجّل هذا القيد مسبقًا.|696|
|matFirstIssue|يجب أن يكون أول قيد صرفًا.|697|
|matChooseMaterial|المادة|698|
|matChooseRequired|اختر مادة.|699|
|qtyRequired|أدخل الكمية.|700|
|qtyFormat|استخدم أرقامًا فقط، حتى 12 خانة قبل الفاصلة و3 بعدها.|701|
|qtyPositive|يجب أن تكون الكمية أكبر من صفر.|702|
|noteTooLong|الملاحظة طويلة جدًا.|703|
|matDrift|تغيّرت سجلات المواد منذ أن بدأت|704|
|matDriftDesc|مدخلاتك محفوظة. راجع أحدث المجاميع والقيود ثم أكّد للإرسال على أساسها.|705|
|matUseLatest|مراجعة الأحدث والمتابعة|706|
|matJobChanged|تغيّر الأمر أثناء تعديلك. مدخلاتك محفوظة. حمّل أحدث حالة للمراجعة قبل الإرسال.|707|
|matStale|لم يُحفظ: تغيّرت السجلات|708|
|matStaleDesc|مدخلاتك محفوظة. حمّل أحدث حالة وراجعها ثم أرسل مجددًا.|709|
|matUncertain|النتيجة غير معروفة|710|
|matUncertainDesc|انقطع الاتصال قبل رد الخادم. ربما حُفظ القيد. حدّث للتحقق؛ إعادة المحاولة آمنة ولن تكرّر القيد.|711|
|matCheckRetry|تحديث وتحقق|712|
|matSearch|ابحث في المواد|713|
|matNoDefs|لا توجد مواد معرّفة بعد.|714|
|matNoDefMatches|لا توجد مواد تطابق "{q}".|715|
|matDefsError|تعذّر تحميل المواد.|716|
|matNewDef|مادة جديدة|717|
|matNewDefDesc|التعريفات نهائية ولا يمكن تعديلها لاحقًا. الوحدة كغ.|718|
|matName|الاسم|719|
|matSpec|المواصفات|720|
|matCreateDef|إنشاء المادة|721|
|matDefCreated|تم إنشاء المادة {name}.|722|
|matManagerOnly|لا يُنشئ المواد إلا المديرون.|723|
|matEntries|القيود|724|
|matNoEntries|لا توجد قيود مسجّلة.|725|
|matVoid|إبطال|726|
|matVoided|مُبطل|727|
|matVoidedBy|أبطله {user} · {time}|728|
|matBy|{user} · {time}|729|
|matVoidTitle|إبطال هذا القيد؟|730|
|matVoidDesc|يُحتفظ بالسجل الأصلي ويظهر مشطوبًا، وتُعاد المجاميع بدونه. لا يمكن التراجع.|731|
|matReason|السبب|732|
|matReasonRequired|السبب مطلوب.|733|
|matConfirmVoid|إبطال القيد|734|
|matVoiding|جارٍ الإبطال|735|
|matVoidDone|تم إبطال القيد.|736|
|mat_err_issue_required|يجب أن يكون أول قيد صرفًا.|737|
|mat_err_material_mismatch|هذا الأمر مثبّت على مادة مختلفة.|738|
|mat_err_unit_mismatch|الوحدة المقبولة هي الكيلوغرام فقط.|739|
|mat_err_stale_revision|تغيّرت السجلات منذ أن بدأت. حمّل الأحدث وراجعه.|740|
|mat_err_job_not_open|لم يعد الأمر مفتوحًا. لا يمكن تسجيل القيود.|741|
|mat_err_material_conflict|ثُبّتت مادة أخرى على هذا الأمر أولًا.|742|
|mat_err_duplicate_record|سُجّل هذا الطلب مسبقًا.|743|
|mat_err_already_voided|هذا القيد مُبطل مسبقًا.|744|
|mat_err_material_record_conflict|هذه المادة موجودة مسبقًا. ابحث عنها بدلًا من ذلك.|745|
|field_quantity|الكمية|746|
|field_note|الملاحظة|747|
|field_kind|نوع القيد|748|
|field_material_id|المادة|749|
|field_reason|السبب|750|
|field_name|الاسم|751|
|field_specification|المواصفات|752|
|field_unit|الوحدة|753|
|field_job_revision|مراجعة الأمر|754|
|navInventory|المخزون|755|
|invTitle|مخزون البواقي|756|
|invSubtitle|دفعات بواقي قابلة للتتبع بالكيلوغرام، مسجّلة من مخرجات الأوامر. الدفعة تثبت وجود المادة فقط ولا تعني ملاءمتها لأمر آخر.|757|
|invFoundation|أساس فقط. التوافق غير متحقق منه ولا توجد سياسة لإعادة الاستخدام، لذا الحجز والإفراج والاستهلاك محظورة.|758|
|invSearch|ابحث برقم الأمر أو المادة أو المواصفة|759|
|invAllStates|الكل|760|
|state_available|متاحة|761|
|state_voided|مُبطلة|762|
|invAvailableHint|متاحة تعني مسجّلة فقط، ولا تعني صالحة أو معتمدة لإعادة الاستخدام.|763|
|invEmpty|لا توجد دفعات مسجّلة بعد|764|
|invEmptyDesc|تظهر الدفعات هنا بعد أن يسجّل مشرف أو مدير قيد بواقٍ من أمر مفتوح.|765|
|invNoMatch|لا توجد دفعات تطابق هذه المرشحات|766|
|invClear|مسح المرشحات|767|
|invLoadError|تعذّر تحميل المخزون.|768|
|invFilteredJob|عرض دفعات الأمر رقم {id}|769|
|invCount|{n} دفعة|770|
|invLot|دفعة|771|
|invRemaining|المتبقي|772|
|invOriginal|الكمية الأصلية|773|
|invState|الحالة|774|
|invSourceJob|الأمر المصدر|775|
|invSourceEntry|القيد المصدر|776|
|invReconciliation|المطابقة|777|
|invSourceStatus|حالة الأمر المصدر|778|
|invSourceVoided|القيد المصدر مُبطل|779|
|invSourceVoidedYes|نعم، القيد المصدر مُبطل|780|
|invSourceVoidedNo|لا|781|
|invCreated|تاريخ التسجيل|782|
|invMaterial|المادة|783|
|invCompat|التوافق: غير متحقق منه|784|
|invPolicy|سياسة إعادة الاستخدام: غير محددة|785|
|invBlocked|الحجز والإفراج والاستهلاك محظورة حتى توجد سياسة لإعادة الاستخدام.|786|
|invHistory|السجل|787|
|invNoHistory|لا توجد أحداث.|788|
|act_addition|تسجيل|789|
|act_void|إبطال|790|
|invBack|كل المخزون|791|
|invDetailError|تعذّر تحميل هذه الدفعة.|792|
|invVoid|إبطال الدفعة|793|
|invVoidTitle|إبطال هذه الدفعة؟|794|
|invVoidDesc|الإبطال نهائي. تبقى الدفعة في السجل ولا يمكن تعديلها أو استعادتها.|795|
|invVoidConfirm|أفهم أن الإبطال دائم.|796|
|invVoiding|جارٍ الإبطال|797|
|invVoidDone|تم إبطال الدفعة|798|
|invVoidStale|تغيّرت هذه الدفعة منذ فتح النافذة. تم الاحتفاظ بالسبب. حمّل أحدث نسخة وراجعها قبل التأكيد.|799|
|invTerminal|هذه الدفعة مُبطلة. الإبطال حالة نهائية.|800|
|invReadOnly|يمكنك عرض هذه الدفعة دون إبطالها.|801|
|invRegister|تسجيل في المخزون|802|
|invRegisterTitle|تسجيل البواقي في المخزون|803|
|invRegisterDesc|تصبح كامل الكمية المسجّلة دفعة واحدة. الكميات الجزئية غير مدعومة.|804|
|invRegisterQty|كامل المخرجات المسجّلة|805|
|invRegisterConfirm|أؤكد تسجيل كامل الكمية. هذا لا يتحقق من التوافق ولا يعتمد إعادة الاستخدام.|806|
|invRegistering|جارٍ التسجيل|807|
|invRegistered|تم تسجيل البواقي|808|
|invReason|السبب|809|
|invReasonRequired|السبب مطلوب.|810|
|invViewJobLots|عرض دفعات هذا الأمر|811|
|inv_err_inventory_conflict|تغيّر المخزون في الوقت نفسه. أعد التحميل وحاول مجددًا.|812|
|inv_err_already_registered|قيد البواقي هذا مسجّل في المخزون مسبقًا.|813|
|inv_err_invalid_offcut_source|يمكن تسجيل قيود البواقي غير المُبطلة فقط.|814|
|inv_err_job_not_open|الأمر ليس مفتوحًا. تغييرات المخزون مسموحة على الأوامر المفتوحة فقط.|815|
|inv_err_stale_revision|عدّل شخص آخر هذه الدفعة.|816|
|inv_err_reuse_policy_required|إعادة الاستخدام محظورة حتى تُحدد سياسة لها.|817|
|inv_err_inventory_active|لهذا القيد دفعة مخزون نشطة.|818|
|mat_err_inventory_active|هذه البواقي مسجّلة في المخزون. أبطل دفعة المخزون أولًا ثم صحّح القيد.|819|

## artifacts/yieldloop/src/lib/ui-i18n.ts

### English

|Key|Exact wording/template|Line|
|---|---|---|
|navProduction|Production|4|
|navAdmin|Administration|5|
|openMenu|Open navigation|6|
|account|Account|7|
|systemStatus|System status|8|
|pageDashboard|Dashboard|9|
|pageReports|Reports|10|
|pageJobs|Production Jobs|11|
|pageJobNew|New production job|12|
|pageJob|Job details|13|
|pageCutting|Cutting Studio|14|
|pageInventory|Inventory|15|
|pageLot|Inventory lot|16|
|pageEmployees|Employees|17|
|pagePassword|Change password|18|
|pageNotFound|Not found|19|
|navOverview|Production Overview|20|
|navDashboard|Dashboard|21|
|navMyWork|My Work|21|
|navJobs|Production Jobs|21|
|navCutting|Cutting Studio|21|
|navInventory|Inventory|21|
|navReports|Reports|22|
|navPackaging|Packaging Concepts|22|
|navEmployees|Employees|22|
|collapseSidebar|Collapse sidebar|22|
|expandSidebar|Expand sidebar|23|
|language|Language|23|
|langEn|English|23|
|langAr|العربية|23|
|pageIndicator|{p} / {n}|23|
|pagination|Pagination|24|
|allRoles|All roles|24|
|recordMaterials|Record|24|
|opRecTitle|Open jobs needing reconciliation|24|
|opRecClear|Open jobs are balanced|24|
|opRecUnmeasured|No material balance recorded yet|24|
|opRecVariance|Unexplained variance {v} kg|24|
|pageAssistant|Production assistant|24|
|pagePackaging|3D packaging concept|25|
|grpStock|Stock board|26|
|grpMargins|Margins & kerf|27|
|grpMode|Cutting mode|28|
|grpParts|Parts|29|
|addRectangle|Add rectangle|30|
|addSquare|Add square|31|
|squareLocked|Square: height follows width|32|
|unlockSquare|Unlock square|33|
|lockSquare|Keep square|34|
|tabSetup|Setup|35|
|tabLayout|Layout|36|
|tabResults|Results|37|
|boardPreview|Board preview|38|
|boardPreviewHint|Usable area inside the margins. Complete the remaining inputs to place parts.|39|
|boardPreviewWaiting|Enter board width and height to preview the stock board.|40|
|usable|Usable {w} × {h} mm|41|
|plans|Plans|42|
|showPlans|Show plans|43|
|hidePlans|Hide plans|44|
|marginsPending|Board outline only. Enter all four margins (0 is allowed) to see the usable area.|45|
|changeLanguage|Change language|46|
|loginTagline|Production & Material Yield|47|
|loginLead|Track material, understand scrap, and identify reusable offcuts.|48|
|orgName|Ibn Khaldoun Printing and Publishing|49|
|welcome|Welcome, {name}|50|
|dashLead_cutting_operator|Open jobs you can record against, with their material balance.|51|
|dashLead_production_supervisor|Open work, reconciliation and scrap across your jobs.|52|
|dashLead_manager|Production, yield and inventory across all jobs.|53|
|mOpen|Open jobs|54|
|mOpenSub|{d} draft · {c} completed|55|
|mIssued|Material issued|55|
|mGood|Good output|55|
|mScrap|Total scrap|55|
|mOffcut|Reusable offcuts|55|
|mYield|Good yield|56|
|mLots|Available offcut lots|56|
|mReconciled|Reconciled jobs|56|
|mReconciledSub|{n} awaiting reconciliation|56|
|mNeedMaterial|Choose one material to see kg totals|56|
|mNeedMaterialSub|Totals across different materials would mix unrelated kg.|57|
|mChoose|Choose material|57|
|hIssued|Material issued to jobs in this view, for the selected material.|57|
|hGood|Recorded good output for the selected material.|58|
|hScrap|Recorded scrap for the selected material. Unaccounted variance is not scrap.|59|
|hOffcut|Offcuts recorded as reusable. Registered only, not approved for reuse.|60|
|hYield|Good output divided by material issued.|61|
|hLots|Offcut lots currently available in inventory for jobs in this view.|62|
|chStatus|Job status|63|
|chStatusEmpty|No jobs in this view.|64|
|chStatusSummary|{total} jobs. {parts}|64|
|chOutput|Where the material went|64|
|chOutputEmpty|No issued material recorded for this material yet.|65|
|chOutputNeed|Choose one material to compare good output, scrap and offcuts.|65|
|chOutputSummary|Good {g} kg, scrap {s} kg, offcuts {o} kg, unaccounted {v} kg.|66|
|unaccounted|Unaccounted|67|
|tblRecent|Recent jobs|67|
|tblOpen|Production jobs · open first|68|
|tblJob|Job|68|
|tblMachine|Machine|68|
|tblStatus|Status|68|
|tblYield|Yield|68|
|tblCreated|Created|68|
|viewAllJobs|All jobs|68|
|quickCompare|Compare jobs|69|
|quickEmployees|Employees|69|
|quickReports|Reports|69|
|quickInventory|Inventory|69|
|filterLabel|Filters|69|
|asstOpen|Open YieldLoop Assistant|69|
|asstTitle|YieldLoop Assistant|70|
|asstGreeting|Ask about one job’s recorded material. Answers cite records and can be uncertain.|70|
|asstJob|Job|71|
|asstChooseJob|Choose a job|72|
|asstQuestion|Your question|72|
|asstPlaceholder|Ask about this job…|72|
|asstSend|Send|72|
|asstClose|Close assistant|72|
|asstSuggest|Suggestions|73|
|sgScrap|Why is scrap high in {job}?|73|
|sgMaterial|Where did the issued material go in {job}?|73|
|sgCompare|Compare {a} with {b}|73|
|asstOneJob|Each question covers one job. Comparisons open the side-by-side view.|74|
|asstAskThis|Ask the assistant|74|
|asstEvidenceLink|View evidence|74|
|asstNoJobs|No jobs available.|75|
|asstNew|New question|75|

### Arabic

|Key|Exact wording/template|Line|
|---|---|---|
|navProduction|الإنتاج|79|
|navAdmin|الإدارة|80|
|openMenu|فتح التنقل|81|
|account|الحساب|82|
|systemStatus|حالة النظام|83|
|pageDashboard|لوحة المتابعة|84|
|pageReports|التقارير|85|
|pageJobs|أوامر الإنتاج|86|
|pageJobNew|أمر إنتاج جديد|87|
|pageJob|تفاصيل الأمر|88|
|pageCutting|استوديو القص|89|
|pageInventory|المخزون|90|
|pageLot|دفعة مخزون|91|
|pageEmployees|الموظفون|92|
|pagePassword|تغيير كلمة المرور|93|
|pageNotFound|غير موجود|94|
|navOverview|نظرة عامة على الإنتاج|95|
|navDashboard|لوحة المتابعة|96|
|navMyWork|عملي|96|
|navJobs|أوامر الإنتاج|96|
|navCutting|استوديو القص|96|
|navInventory|المخزون|96|
|navReports|التقارير|97|
|navPackaging|تصاميم التغليف|97|
|navEmployees|الموظفون|97|
|collapseSidebar|طي الشريط الجانبي|97|
|expandSidebar|توسيع الشريط الجانبي|98|
|language|اللغة|98|
|langEn|English|98|
|langAr|العربية|98|
|pageIndicator|{p} / {n}|98|
|pagination|التنقل بين الصفحات|99|
|allRoles|كل الأدوار|99|
|recordMaterials|تسجيل|99|
|opRecTitle|أوامر مفتوحة تحتاج إلى تسوية|99|
|opRecClear|الأوامر المفتوحة متوازنة|99|
|opRecUnmeasured|لم يُسجَّل رصيد المواد بعد|99|
|opRecVariance|فرق غير مفسَّر {v} كغ|99|
|pageAssistant|مساعد الإنتاج|99|
|pagePackaging|تصوّر تغليف ثلاثي الأبعاد|100|
|grpStock|لوح الخام|101|
|grpMargins|الهوامش وعرض القطع|102|
|grpMode|نمط القص|103|
|grpParts|القطع|104|
|addRectangle|إضافة مستطيل|105|
|addSquare|إضافة مربع|106|
|squareLocked|مربع: الارتفاع يتبع العرض|107|
|unlockSquare|إلغاء قفل المربع|108|
|lockSquare|إبقاء مربعًا|109|
|tabSetup|الإعداد|110|
|tabLayout|التخطيط|111|
|tabResults|النتائج|112|
|boardPreview|معاينة اللوح|113|
|boardPreviewHint|المساحة القابلة للاستخدام داخل الهوامش. أكمل بقية المدخلات لوضع القطع.|114|
|boardPreviewWaiting|أدخل عرض اللوح وارتفاعه لمعاينة لوح الخام.|115|
|usable|المساحة المتاحة {w} × {h} مم|116|
|plans|الخطط|117|
|showPlans|عرض الخطط|118|
|hidePlans|إخفاء الخطط|119|
|marginsPending|حدود اللوح فقط. أدخل الهوامش الأربعة (يُسمح بالصفر) لعرض المساحة القابلة للاستخدام.|120|
|changeLanguage|تغيير اللغة|121|
|loginTagline|الإنتاج وكفاءة استخدام المواد|122|
|loginLead|تابع استهلاك المواد، وافهم أسباب الهدر، وحدد القصاصات القابلة لإعادة الاستخدام.|123|
|orgName|مطبعة ابن خلدون للطباعة والنشر|124|
|welcome|أهلًا، {name}|125|
|dashLead_cutting_operator|الأوامر المفتوحة التي يمكنك التسجيل عليها مع رصيد موادها.|126|
|dashLead_production_supervisor|العمل المفتوح والتسويات والهدر عبر أوامرك.|127|
|dashLead_manager|الإنتاج والمردود والمخزون عبر كل الأوامر.|128|
|mOpen|الأوامر المفتوحة|129|
|mOpenSub|{d} مسودة · {c} مكتملة|130|
|mIssued|المواد المصروفة|130|
|mGood|الإنتاج الجيد|130|
|mScrap|إجمالي الهدر|130|
|mOffcut|قصاصات قابلة لإعادة الاستخدام|130|
|mYield|المردود الجيد|131|
|mLots|دفعات قصاصات متاحة|131|
|mReconciled|أوامر مُسوّاة|131|
|mReconciledSub|{n} بانتظار التسوية|131|
|mNeedMaterial|اختر مادة واحدة لعرض إجماليات الكيلوغرام|131|
|mNeedMaterialSub|جمع مواد مختلفة يخلط كيلوغرامات غير مرتبطة.|132|
|mChoose|اختر مادة|132|
|hIssued|المواد المصروفة للأوامر في هذا العرض، للمادة المحددة.|132|
|hGood|الإنتاج الجيد المسجّل للمادة المحددة.|133|
|hScrap|الهدر المسجّل للمادة المحددة. الفرق غير المحتسب ليس هدرًا.|134|
|hOffcut|قصاصات مسجّلة كقابلة لإعادة الاستخدام. مسجّلة فقط وغير معتمدة لإعادة الاستخدام.|135|
|hYield|الإنتاج الجيد مقسومًا على المواد المصروفة.|136|
|hLots|دفعات القصاصات المتاحة حاليًا في المخزون لأوامر هذا العرض.|137|
|chStatus|حالة الأوامر|138|
|chStatusEmpty|لا توجد أوامر في هذا العرض.|139|
|chStatusSummary|{total} أمر. {parts}|139|
|chOutput|أين ذهبت المواد|139|
|chOutputEmpty|لا توجد مواد مصروفة مسجّلة لهذه المادة بعد.|140|
|chOutputNeed|اختر مادة واحدة لمقارنة الإنتاج الجيد والهدر والقصاصات.|140|
|chOutputSummary|جيد {g} كغ، هدر {s} كغ، قصاصات {o} كغ، غير محتسب {v} كغ.|141|
|unaccounted|غير محتسب|142|
|tblRecent|أحدث الأوامر|142|
|tblOpen|أوامر الإنتاج · المفتوحة أولاً|143|
|tblJob|الأمر|143|
|tblMachine|الماكينة|143|
|tblStatus|الحالة|143|
|tblYield|المردود|143|
|tblCreated|الإنشاء|143|
|viewAllJobs|كل الأوامر|143|
|quickCompare|مقارنة الأوامر|144|
|quickEmployees|الموظفون|144|
|quickReports|التقارير|144|
|quickInventory|المخزون|144|
|filterLabel|عوامل التصفية|144|
|asstOpen|فتح مساعد YieldLoop|144|
|asstTitle|مساعد YieldLoop|145|
|asstGreeting|اسأل عن المواد المسجّلة لأمر واحد. تستند الإجابات إلى السجلات وقد تكون غير مؤكدة.|145|
|asstJob|الأمر|146|
|asstChooseJob|اختر أمرًا|147|
|asstQuestion|سؤالك|147|
|asstPlaceholder|اسأل عن هذا الأمر…|147|
|asstSend|إرسال|147|
|asstClose|إغلاق المساعد|147|
|asstSuggest|اقتراحات|148|
|sgScrap|ليش نسبة الهدر مرتفعة في {job}؟|148|
|sgMaterial|وين راحت المواد المصروفة في {job}؟|148|
|sgCompare|قارن {a} مع {b}|148|
|asstOneJob|كل سؤال يخص أمرًا واحدًا. المقارنات تفتح العرض جنبًا إلى جنب.|149|
|asstAskThis|اسأل المساعد|149|
|asstEvidenceLink|عرض الأدلة|149|
|asstNoJobs|لا توجد أوامر متاحة.|150|
|asstNew|سؤال جديد|150|

## artifacts/yieldloop/src/pages/packaging.tsx

### English

|Key|Exact wording/template|Line|
|---|---|---|
|en|Tray|25|
|en|Sleeve|25|
|en|Lid box|25|

### Arabic

|Key|Exact wording/template|Line|
|---|---|---|
|ar|صينية|25|
|ar|غلاف|25|
|ar|علبة بغطاء|25|

## artifacts/yieldloop/src/pages/reports.tsx

### English

|Key|Exact wording/template|Line|
|---|---|---|
|dashTitle|Material dashboard|26|
|dashSub|Current material balances for a cohort of production jobs. Values are recorded figures, never inferred.|27|
|repTitle|Job & inventory report|27|
|repSub|Every job and inventory lot in the selected cohort, with its latest reconciliation.|28|
|filters|Filters|28|
|startDate|Created from|29|
|endDate|Created to|29|
|timezone|Date timezone|29|
|status|Job status|29|
|anyStatus|Any status|29|
|material|Material|29|
|allMaterials|All materials (quantities hidden)|30|
|chooseMaterial|Choose material|30|
|hidePicker|Hide list|30|
|clearMaterial|Clear material|30|
|apply|Apply|30|
|reset|Reset|31|
|refresh|Refresh|31|
|refreshing|Refreshing|31|
|dateFormat|Use the format YYYY-MM-DD.|31|
|dateOrder|The start date must be on or before the end date.|32|
|invalidChoice|Choose one of the listed options.|32|
|invalidFilter|Enter a valid value or clear this filter.|33|
|generated|Generated {time}|33|
|tzLabel|Timezone {tz}|34|
|basis|Dates select jobs by when the job was created.|34|
|allTime|All time|34|
|range|{a} to {b}|35|
|from|From {a}|35|
|until|Until {b}|35|
|jobs|Jobs in cohort|35|
|measured|Measured|36|
|unmeasured|Unmeasured|36|
|production|Production balance|36|
|inventory|Offcut inventory|37|
|available|Available lots|37|
|voided|Voided lots|37|
|lots|{n} lots|37|
|original|Original|38|
|remaining|Remaining|38|
|selectMaterial|Select one material to see kg totals, rates and inventory weights. Totals across different materials would mix unrelated kg.|38|
|unavailable|Unavailable|39|
|noData|No reconciliation recorded|40|
|openReport|Open detailed report|40|
|openDashboard|Back to dashboard|41|
|jobsTable|Jobs|41|
|lotsTable|Inventory lots|42|
|colJob|Job|42|
|colStatus|Status|42|
|colCreated|Created|42|
|colMaterial|Material|42|
|colLot|Lot|42|
|colSource|Source job|43|
|colState|State|43|
|snapshot|Reconciliation #{id} · revision {rev} · {time}|43|
|emptyTitle|No jobs in this cohort|44|
|emptyDesc|No production jobs visible to you were created in this range. Widen the dates or clear filters.|45|
|emptyLots|No inventory lots come from jobs in this cohort.|45|
|loadError|The report could not be loaded.|46|
|notFound|The selected material or page does not exist or is not visible to you.|47|
|validation|The server rejected some filters. Your inputs are kept below.|47|
|clearFilters|Clear filters|48|
|pageOf|Page {p} of {n} · {c} total|48|
|prev|Previous page|49|
|next|Next page|49|
|defs|Definitions|49|
|defsHint|What every number means|50|
|viewing|Showing {status} · {material}|50|
|dashTitle2|Today on the floor|51|
|dashSub2|What needs a decision now. Full figures live in Reports.|52|
|showFilters|Filters|52|
|hideFilters|Hide filters|53|
|activeFilters|{n} active|53|
|kJobs|Jobs in cohort|53|
|kOpen|{n} open · {d} draft|54|
|kMeasured|Reconciled|54|
|kMeasuredSub|{n} awaiting reconciliation|54|
|kYield|Yield|54|
|kVariance|Net variance|55|
|kLots|Available offcut lots|55|
|kLotsSub|Registered only, not approved for reuse|55|
|needMaterial|Select a material|55|
|needMaterialSub|Totals are only shown for one material|56|
|attention|Needs attention|56|
|attentionScope|Checked across the first {n} jobs of this cohort. Open Reports for the rest.|57|
|attVariance|Unaccounted material {v} kg|57|
|attNegVariance|Accounted exceeds issued by {v} kg|58|
|attUnmeasured|No reconciliation yet|58|
|allClear|Nothing flagged in these jobs.|58|
|allClearSub|Every listed job is reconciled with zero variance.|59|
|recent|Jobs in this cohort|59|
|viewAll|All jobs|60|
|openJob|Open job|60|
|openCutting|Cutting Studio|60|
|colIssued|Issued|60|
|colGood|Good|61|
|colScrap|Scrap|61|
|colOffcut|Offcut|61|
|colVariance|Variance|61|
|colYield|Yield|61|
|colActions||61|
|unitsNote|All quantities in kg. Variance is unaccounted material, never scrap. Rates show Unavailable when nothing was issued.|61|
|issued|Issued|107|
|good|Good|107|
|scrap|Scrap|107|
|offcut|Offcut|107|
|accounted|Accounted|107|
|variance|Variance|107|
|yield_rate|Yield|107|
|scrap_rate|Scrap rate|107|
|offcut_rate|Offcut rate|107|

### Arabic

|Key|Exact wording/template|Line|
|---|---|---|
|dashTitle|لوحة المواد|64|
|dashSub|أرصدة المواد الحالية لمجموعة من أوامر الإنتاج. القيم مسجّلة فعليًا وليست مستنتجة.|65|
|repTitle|تقرير الأوامر والمخزون|65|
|repSub|كل أمر وكل دفعة مخزون في المجموعة المحددة مع آخر تسوية لها.|66|
|filters|عوامل التصفية|66|
|startDate|تاريخ الإنشاء من|67|
|endDate|تاريخ الإنشاء إلى|67|
|timezone|المنطقة الزمنية للتاريخ|67|
|status|حالة الأمر|67|
|anyStatus|أي حالة|67|
|material|المادة|67|
|allMaterials|كل المواد (الكميات مخفية)|68|
|chooseMaterial|اختر مادة|68|
|hidePicker|إخفاء القائمة|68|
|clearMaterial|إزالة المادة|68|
|apply|تطبيق|68|
|reset|إعادة الضبط|69|
|refresh|تحديث|69|
|refreshing|جارٍ التحديث|69|
|dateFormat|استخدم الصيغة YYYY-MM-DD.|69|
|dateOrder|يجب أن يكون تاريخ البداية في تاريخ النهاية أو قبله.|70|
|invalidChoice|اختر أحد الخيارات المدرجة.|70|
|invalidFilter|أدخل قيمة صالحة أو امسح عامل التصفية هذا.|71|
|generated|أُنشئ {time}|71|
|tzLabel|المنطقة الزمنية {tz}|72|
|basis|تحدد التواريخ الأوامر حسب وقت إنشاء الأمر.|72|
|allTime|كل الأوقات|72|
|range|من {a} إلى {b}|73|
|from|من {a}|73|
|until|حتى {b}|73|
|jobs|الأوامر في المجموعة|73|
|measured|مقيسة|74|
|unmeasured|غير مقيسة|74|
|production|رصيد الإنتاج|74|
|inventory|مخزون القصاصات|75|
|available|دفعات متاحة|75|
|voided|دفعات ملغاة|75|
|lots|{n} دفعات|75|
|original|الأصلية|76|
|remaining|المتبقية|76|
|selectMaterial|اختر مادة واحدة لعرض إجماليات الكيلوغرام والنسب وأوزان المخزون. جمع مواد مختلفة يخلط كيلوغرامات غير مرتبطة.|76|
|unavailable|غير متاح|77|
|noData|لا توجد تسوية مسجّلة|78|
|openReport|فتح التقرير المفصل|78|
|openDashboard|العودة إلى اللوحة|79|
|jobsTable|الأوامر|79|
|lotsTable|دفعات المخزون|80|
|colJob|الأمر|80|
|colStatus|الحالة|80|
|colCreated|الإنشاء|80|
|colMaterial|المادة|80|
|colLot|الدفعة|80|
|colSource|الأمر المصدر|81|
|colState|الحالة|81|
|snapshot|التسوية #{id} · المراجعة {rev} · {time}|81|
|emptyTitle|لا توجد أوامر في هذه المجموعة|82|
|emptyDesc|لم يُنشأ في هذا النطاق أي أمر إنتاج مرئي لك. وسّع التواريخ أو امسح عوامل التصفية.|83|
|emptyLots|لا توجد دفعات مخزون من أوامر هذه المجموعة.|83|
|loadError|تعذّر تحميل التقرير.|84|
|notFound|المادة أو الصفحة المحددة غير موجودة أو غير مرئية لك.|85|
|validation|رفض الخادم بعض عوامل التصفية. مدخلاتك محفوظة أدناه.|85|
|clearFilters|مسح عوامل التصفية|86|
|pageOf|الصفحة {p} من {n} · الإجمالي {c}|86|
|prev|الصفحة السابقة|87|
|next|الصفحة التالية|87|
|defs|التعريفات|87|
|defsHint|معنى كل رقم|88|
|viewing|عرض {status} · {material}|88|
|dashTitle2|اليوم في الورشة|89|
|dashSub2|ما يحتاج قرارًا الآن. الأرقام الكاملة في التقارير.|90|
|showFilters|عوامل التصفية|90|
|hideFilters|إخفاء عوامل التصفية|91|
|activeFilters|{n} نشطة|91|
|kJobs|الأوامر في المجموعة|91|
|kOpen|{n} مفتوحة · {d} مسودة|92|
|kMeasured|مُسوّاة|92|
|kMeasuredSub|{n} بانتظار التسوية|92|
|kYield|المردود|92|
|kVariance|صافي الفرق|93|
|kLots|دفعات قصاصات متاحة|93|
|kLotsSub|مسجّلة فقط وغير معتمدة لإعادة الاستخدام|93|
|needMaterial|اختر مادة|93|
|needMaterialSub|تُعرض الإجماليات لمادة واحدة فقط|94|
|attention|يحتاج انتباهًا|94|
|attentionScope|فُحص أول {n} أمر في هذه المجموعة. افتح التقارير للبقية.|95|
|attVariance|مادة غير محتسبة {v} كغ|95|
|attNegVariance|المحتسب يزيد على المصروف بمقدار {v} كغ|96|
|attUnmeasured|لا توجد تسوية بعد|96|
|allClear|لا شيء مُعلَّم في هذه الأوامر.|96|
|allClearSub|كل أمر مدرج مُسوّى بفرق صفري.|97|
|recent|أوامر هذه المجموعة|97|
|viewAll|كل الأوامر|98|
|openJob|فتح الأمر|98|
|openCutting|استوديو القص|98|
|colIssued|المصروف|98|
|colGood|الجيد|99|
|colScrap|الهالك|99|
|colOffcut|القصاصات|99|
|colVariance|الفرق|99|
|colYield|المردود|99|
|colActions||99|
|unitsNote|كل الكميات بالكيلوغرام. الفرق مادة غير محتسبة وليس هالكًا. تظهر النسب غير متاحة عند عدم صرف أي مادة.|99|
|issued|المصروف|108|
|good|الجيد|108|
|scrap|الهالك|108|
|offcut|القصاصات|108|
|accounted|المحتسب|108|
|variance|الفرق|108|
|yield_rate|المردود|108|
|scrap_rate|نسبة الهالك|108|
|offcut_rate|نسبة القصاصات|108|
