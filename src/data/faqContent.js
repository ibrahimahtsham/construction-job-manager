export const FAQ_SECTIONS = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    content: `The Dashboard is the first thing you see when you log in. It gives you a quick snapshot of where the business stands.

KPI CARDS (top row):
• Total Jobs — every job currently in the system, all statuses combined
• Pending Approval — documents (proposals, contracts, invoices) sent to customers that haven't been approved yet. This is the most important number to watch — if it's high, customers are sitting on something that needs a follow-up.
• Open Invoices — invoices issued but not yet paid
• Paid Invoices (30d) — invoices paid in the last 30 days (a rough revenue-received indicator)
• Approved Expenses — total dollar value of expenses that have been marked "approved for payment"
• Appointments (7d) — inspections and site visits scheduled in the next 7 days

JOB LOCATIONS MAP:
Pins on the map represent active jobs and pipeline leads that have a GPS address set. Amber pins are leads still in the pipeline (not yet won). Green pins are active jobs currently under construction. Click any pin to see the job name and a link to open it.

RECENT ACTIVITY FEED:
A running log of things that happened — new jobs created, expenses logged, documents sent or signed. Most recent events appear at the top. Clicking a job link in the feed takes you directly to that job.`,
  },
  {
    key: 'pipeline',
    title: 'Pipeline',
    content: `The Pipeline is where you manage leads — potential jobs that haven't been started yet. Think of it as a sales funnel: leads enter as "New Lead" and move right until they become a won job (Active) or are closed out.

PIPELINE STAGES (left to right):
• New Lead — a new inquiry just came in; nothing has happened yet
• Inspection Scheduled — you've booked a time to go look at the property
• Inspected — the site visit happened; you're working on a bid
• Bid In Progress — the estimate/proposal is being built
• Bid Sent — the proposal was sent to the customer; waiting on their response
• Follow Up — the customer hasn't responded; it needs another touch

MOVING A LEAD:
Drag a job card from one column to the next, or open the job and change the Status field. Either method works.

WINNING OR CLOSING A LEAD:
• Won (Active) — the customer said yes and the job is starting. Change status to "Active."
• Lost — the customer went with someone else or said no. Change status to "Lost." The job stays in the system for records but disappears from the pipeline board.
• No Value — the lead went nowhere (customer unreachable, not a real opportunity). Change status to "No Value."

CREATING A NEW LEAD:
Click the "+ New Job" button (top right on the Pipeline or Active Jobs page). Fill in the job name, customer, address, and optionally an appointment date. Leave the status as "New Lead" or set it to whatever stage it's already at.`,
  },
  {
    key: 'active_jobs',
    title: 'Active Jobs',
    content: `Active Jobs shows all jobs currently under construction — the pipeline is won and work is happening. You can also see "Pending Permit" jobs here (jobs that are won but waiting for a permit before work begins).

FINDING A JOB:
Use the search bar at the top to filter by job name, number, or customer. The list is sorted by job number newest-first.

JOB DETAIL PAGE:
Click any job row to open it. The detail page has several tabs:

• Dashboard tab — the main overview. Shows all the key fields (customer, address, status, type, appointment, etc.) and a small location map if coordinates are set. Almost every field has a pencil icon — click it to edit inline without opening a separate form.

• Budget tab — the full financial breakdown: line items, groups, margin, totals. See the Budget section below.

• Expenses tab — costs logged against this job (materials, labor, subs). See Expenses below.

• Documents tab — proposals, contracts, change orders, and invoices tied to this job. See Documents below.

• Notes tab — free-text notes for the job. Use this for anything that doesn't fit a structured field.

COMPLETED JOBS:
Once a job is fully done and paid, change its status to "Completed." It will move to the Completed Jobs page (separate from Active Jobs) so the active list stays clean.`,
  },
  {
    key: 'budget',
    title: 'Budget',
    content: `The Budget tab is the financial core of a job. It tracks what you're selling to the customer (price) and what it costs you (cost), so you always know your margin.

KEY CONCEPTS:
• Line Item — a single work item or material. Has a description, quantity, unit, unit price (what the customer pays), and unit cost (what it costs you).
• Group — a container that holds line items. Groups keep budgets organized (e.g., "Demo," "Framing," "Electrical"). Totals roll up from items to groups to the overall job budget.
• Extended Price — unit price × quantity. This is what appears on customer documents.
• Extended Cost — unit cost × quantity. This is your actual cost for the line item.
• Margin — (Extended Price − Extended Cost) / Extended Price. The app targets 40% by default. When you type a unit cost, the unit price is automatically calculated to hit the target margin (and vice versa).

ADDING ITEMS:
Click "+ Add Item" inside a group, or "+ Add Group" to create a new group first. You can also pull from the Catalog — click the catalog icon to search your reusable items and add them to the budget at their saved prices.

EDITING ITEMS:
Click any cell in the budget table to edit it. Price and cost fields update the margin calculation live as you type.

APPROVED vs. PENDING:
Budget items are linked to documents (proposals, change orders). Once a document is approved by the customer, those line items become "approved" — they count toward the approved budget total shown in the job's stat bar.`,
  },
  {
    key: 'expenses',
    title: 'Expenses',
    content: `The Expenses tab tracks money going out — materials purchased, subcontractor invoices, equipment rental, anything that costs the company money on this job.

LOGGING AN EXPENSE:
Click "+ Add Expense." Fill in:
• Vendor — who you paid (supplier name, subcontractor, etc.)
• Amount — the dollar amount
• Date — when the expense occurred
• Description — what it was for
• Category — use the dropdown to categorize (Materials, Labor, Subcontractor, etc.)
• Receipt — attach a photo or PDF of the receipt if you have one

EXPENSE STATUSES:
• Pending — just entered; needs review
• Approved — reviewed and approved for payment. The "Approved Expenses" total on the Dashboard counts these.
• Paid — the check or bank transfer has gone out

APPROVING EXPENSES:
Click the checkbox or status field on an expense row to mark it approved. Only approved expenses show up in the company-wide financial summaries.

WHY TRACK EXPENSES?
Expenses feed the job's "Actual Cost" figure. When you compare Actual Cost to the budget's Extended Cost, you see whether the job is running over or under. If actual costs are higher than budgeted costs, the margin is being eroded.`,
  },
  {
    key: 'documents',
    title: 'Documents',
    content: `The Documents tab manages everything you send to customers for review and signature — proposals, contracts, change orders, and invoices.

DOCUMENT TYPES:
• Proposal — a quote sent before the job is won. The customer reviews the scope and price and approves or declines.
• Contract — the formal agreement. Usually replaces or follows the proposal once the customer says yes.
• Change Order — an addition or modification to the original contract scope. Each change order has its own line items and customer approval.
• Invoice — a payment request. Can be a deposit (before work), progress invoice (mid-job), or final invoice (at completion).

CREATING A DOCUMENT:
Go to the Documents tab on the job, click "+ New Document," choose the type, select which budget line items to include, and save. The system generates a PDF preview automatically.

SENDING TO THE CUSTOMER:
Once the document looks right, click "Send to Portal." This makes the document visible to the customer in their Customer Portal. They'll get a link (you send it via email separately — the app doesn't send emails). The document shows up on their portal page where they can view it, approve it, or decline it.

DOCUMENT STATUSES:
• Draft — not sent yet; still being built
• Sent — visible in the customer portal; awaiting response
• Approved — customer clicked "Approve" in the portal (or you manually approved it)
• Declined — customer clicked "Decline" and may have left a reason
• Voided — cancelled; no longer active

WHAT HAPPENS AFTER APPROVAL:
When a customer approves a proposal or contract, those budget line items become "approved" in the budget. When an invoice is approved and paid via the Pay Now button, the invoice status updates to Paid automatically.`,
  },
  {
    key: 'portal',
    title: 'Customer Portal',
    content: `The Customer Portal is a private web page your customer accesses to review and sign documents, and to pay invoices. They do NOT need to create an account — they access it via a unique link you send them.

WHAT THE CUSTOMER SEES:
• A list of all documents sent to them for this job
• Each document can be opened to read the full line items and scope
• An "Approve" button (green) and "Decline" button (red) on pending documents
• A "Pay Now" button on approved invoices (links to QuickBooks Payments checkout)

HOW TO SHARE THE PORTAL:
On the job's Documents tab, there is a "Portal Link" button. Copy that URL and paste it into an email to the customer. Every job has a unique portal link — it only shows that job's documents.

AFTER THE CUSTOMER ACTS:
• If they approve: the document status updates to "Approved" in real time. You'll also see a notification in the top-right bell icon.
• If they decline: the status updates to "Declined" and they can leave a reason. You'll see a notification. Review their reason and either revise the document or discuss with them directly.
• If they pay an invoice: the invoice status updates to "Paid" via a QuickBooks webhook (may take a minute or two).

DECLINED DOCUMENTS:
A declined document is not automatically deleted. You can open it, review the customer's reason, revise the line items, and re-send it — it will generate a new version for the customer to review.`,
  },
  {
    key: 'customers',
    title: 'Customers',
    content: `The Customers section stores information about the people and companies you do work for. Every job links to a customer record.

CUSTOMER RECORD:
Each customer has:
• Account Name — the customer or company name
• Type — whether they're a Homeowner, Commercial property, or other category
• Lead Source — how they found you (referral, Google, door-to-door, etc.)
• Contact info — name, email, phone (stored at the location or job level)

LOCATIONS:
A customer can have multiple saved locations (job sites). Each location stores the address, entry code, foundation type, and contact details for that specific property. When you create a new job for a returning customer, you can pick one of their saved locations to pre-fill all that information automatically.

FINDING A CUSTOMER:
Use the search bar on the Customers page. You can search by name. Clicking a customer row shows their full record and all jobs associated with them.

CREATING A CUSTOMER:
Customers are created automatically when you type a new name in the "Customer" field on a new job form. You don't need to go to the Customers page first — just type the name and it gets created or matched on save.`,
  },
  {
    key: 'catalog',
    title: 'Catalog',
    content: `The Catalog is your library of reusable work items. Instead of typing the same roofing shingle line item from scratch on every bid, you save it to the catalog once with your standard price and cost, then pull it into any job's budget in seconds.

CATALOG ITEMS:
Each item has a description, unit (per sq ft, per sheet, each, etc.), unit price, unit cost, and an optional category. The price and cost are defaults — you can override them in a specific job's budget without changing the catalog.

CATALOG GROUPS:
You can bundle multiple items into a catalog group (e.g., "Standard Roof Replacement Package" might include tear-off, underlayment, shingles, flashing, and cleanup as separate line items). Pulling a group into a budget adds all its items at once.

USING THE CATALOG IN A BUDGET:
In any job's Budget tab, click the catalog icon (book icon) next to "+ Add Item." Search for the item or group you want, select it, and it's added to the budget with the saved prices pre-filled.

MANAGING THE CATALOG:
Go to Catalog in the left sidebar. You can add, edit, and organize items and groups there. Changing a catalog item's price does not retroactively change it on existing job budgets — budgets snapshot the price at the time they were added.`,
  },
  {
    key: 'settings',
    title: 'Settings',
    content: `The Settings page (gear icon in the sidebar, or Admin → Settings) lets you configure app-wide options.

CHANGING YOUR PASSWORD:
The default admin password is set during initial setup. To change it, go to Settings → Account and update it there. Use a strong password — this account has full access to all data.

CATEGORY OPTIONS:
Several dropdown fields across the app (Customer Type, Lead Source, Job Type, Expense Category, etc.) pull their options from Settings → Categories. If you need to add a new lead source or job type, this is where you do it. Changes take effect immediately for all users.`,
  },
];
