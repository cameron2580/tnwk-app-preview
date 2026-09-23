const STORAGE_KEY = "tnwk-sending-plan-v1";
const ROLE_KEY = "tnwk-preview-role-v1";

const phases = [
  {
    id: "alignment",
    number: "01",
    title: "Calling & alignment",
    description: "Put the church and missionary on the same page.",
    steps: [
      {
        id: "purpose",
        lead: "together",
        title: "Confirm calling and shared purpose",
        description: "Write down the proposed work, why this church is sending, and what a faithful first term would look like.",
        prompt: "What is the missionary being sent to do, and how will the church discern and affirm that calling?",
      },
      {
        id: "authority",
        lead: "church",
        title: "Agree on church ownership and decisions",
        description: "Name the leaders who will make decisions, the missionary's role, and the way disagreements will be handled.",
        prompt: "Who can approve a plan, change it, and speak for the church when questions arise?",
      },
    ],
  },
  {
    id: "field",
    number: "02",
    title: "Field context",
    description: "Ground the plan in real people and current sources.",
    steps: [
      {
        id: "needs",
        lead: "missionary",
        title: "Research local needs and relationships",
        description: "Record what local leaders say is needed, existing work in the area, and sources that support the plan.",
        prompt: "Whose perspective from the destination has shaped this plan? What still needs to be learned?",
      },
      {
        id: "permissions",
        lead: "together",
        title: "Review destination permissions and safety",
        description: "Check current entry rules, permitted activities, travel guidance, and emergency considerations for the destination.",
        prompt: "Who will verify immigration, local law, and safety details before any departure decision?",
        review: true,
      },
    ],
  },
  {
    id: "oversight",
    number: "03",
    title: "Oversight & preparation",
    description: "Make care and accountability concrete.",
    steps: [
      {
        id: "team",
        lead: "church",
        title: "Name the sending and care team",
        description: "Assign a church leader, care contact, and practical coordinator with a clear way to reach the missionary.",
        prompt: "Who owns the relationship once the missionary leaves, and how will that person stay in touch?",
      },
      {
        id: "training",
        lead: "missionary",
        title: "Set a preparation path",
        description: "List the language, cultural, ministry, safeguarding, and practical preparation this assignment requires.",
        prompt: "What preparation is essential before departure, and who will help provide or assess it?",
      },
    ],
  },
  {
    id: "stewardship",
    number: "04",
    title: "Stewardship & support",
    description: "Make assumptions, controls, and review visible.",
    steps: [
      {
        id: "budget",
        lead: "together",
        title: "Draft a sourced field budget",
        description: "Add recurring and setup expenses, including insurance, travel, transfer costs, and a contingency where relevant.",
        prompt: "Which costs are backed by current quotes, and which are still estimates?",
      },
      {
        id: "money",
        lead: "church",
        title: "Decide how money will be governed",
        description: "Document approval, records, reporting, and the people who will obtain qualified tax and legal review.",
        prompt: "How will the church receive, approve, record, review, and report support? Which decisions need professional advice?",
        review: true,
      },
    ],
  },
  {
    id: "launch",
    number: "05",
    title: "Launch readiness",
    description: "Turn a plan into a responsible departure decision.",
    steps: [
      {
        id: "practical",
        lead: "missionary",
        title: "Confirm practical readiness",
        description: "Check travel documents, housing, insurance, emergency contacts, health needs, and a response plan.",
        prompt: "What must be confirmed before travel is booked or announced?",
      },
      {
        id: "approval",
        lead: "church",
        title: "Review and approve the sending plan",
        description: "Bring unresolved questions, the budget, and the care plan to the church's decision makers.",
        prompt: "Who must review the complete plan, and where will their decision be recorded?",
        review: true,
      },
    ],
  },
  {
    id: "care",
    number: "06",
    title: "Ongoing care",
    description: "Keep the church engaged after departure.",
    steps: [
      {
        id: "communication",
        lead: "together",
        title: "Schedule communication and care",
        description: "Agree on check-ins, pastoral care, sensitive information boundaries, and a way to request help.",
        prompt: "What will the church ask, listen for, and share at each check-in?",
      },
      {
        id: "review",
        lead: "together",
        title: "Set recurring plan reviews",
        description: "Decide when to revisit the budget, ministry goals, health, and next-term plans together.",
        prompt: "How often will the church and missionary review what is working and what needs to change?",
      },
    ],
  },
];

const allSteps = phases.flatMap((phase) => phase.steps);
const stepById = Object.fromEntries(allSteps.map((step) => [step.id, step]));

function freshState() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    profile: { church: "", missionary: "", destination: "", purpose: "", departure: "" },
    steps: {},
    missionaryUpdates: {},
    budget: [
      { id: "housing", label: "Housing & utilities", cadence: "monthly", amount: 0, source: "", checkedOn: "" },
      { id: "living", label: "Food & daily living", cadence: "monthly", amount: 0, source: "", checkedOn: "" },
      { id: "insurance", label: "Insurance & healthcare", cadence: "monthly", amount: 0, source: "", checkedOn: "" },
      { id: "travel", label: "Travel & setup", cadence: "once", amount: 0, source: "", checkedOn: "" },
    ],
    currency: "USD",
    monthlySupport: 0,
    stewardship: { financeLead: "", approver: "", reviewer: "", cadence: "Monthly", reporting: "", notes: "" },
    research: [],
  };
}

function normalizeState(saved) {
  const base = freshState();
  if (!saved || saved.version !== 1 || !saved.profile || !Array.isArray(saved.budget) || !Array.isArray(saved.research)) return null;
  return {
    ...base,
    ...saved,
    profile: { ...base.profile, ...saved.profile },
    steps: saved.steps && typeof saved.steps === "object" ? saved.steps : {},
    missionaryUpdates: saved.missionaryUpdates && typeof saved.missionaryUpdates === "object" && !Array.isArray(saved.missionaryUpdates) ? saved.missionaryUpdates : {},
    budget: saved.budget,
    stewardship: { ...base.stewardship, ...(saved.stewardship || {}) },
    research: saved.research,
  };
}

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")) || freshState();
  } catch {
    return freshState();
  }
}

let state = loadState();
let currentRole = (() => {
  try { return localStorage.getItem(ROLE_KEY) === "missionary" ? "missionary" : "church"; }
  catch { return "church"; }
})();
const initialView = location.hash.slice(1);
if (["missionary", "preparation"].includes(initialView)) currentRole = "missionary";
if (["overview", "plan", "stewardship"].includes(initialView)) currentRole = "church";
let currentView = ["overview", "plan", "budget", "stewardship", "research", "missionary", "preparation"].includes(initialView)
  ? initialView
  : currentRole === "church" ? "overview" : "missionary";
let toastTimer;

const root = document.getElementById("view-root");

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function safeUrl(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function money(value) {
  const currency = ["USD", "EUR", "GBP", "JPY"].includes(state.currency) ? state.currency : "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "JPY" ? 0 : 2 }).format(Number(value) || 0);
}

function persist() {
  state.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    toast("This browser could not save your draft. Download a copy before leaving.");
  }
}

function toast(message) {
  const element = document.getElementById("toast");
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("visible"), 3500);
}

function getStep(id) {
  const saved = state.steps[id] || {};
  return {
    status: "not-started", owner: "", next: "", notes: "",
    ...saved,
    lead: ["church", "missionary", "together"].includes(saved.lead) ? saved.lead : (stepById[id]?.lead || "together"),
  };
}

function getMissionaryUpdate(id) {
  return { update: "", request: "", ...(state.missionaryUpdates[id] || {}) };
}

function missionarySteps() {
  return allSteps.filter((step) => getStep(step.id).lead !== "church");
}

function missionaryRequests() {
  return allSteps.filter((step) => String(getMissionaryUpdate(step.id).request).trim());
}

function counts() {
  const done = allSteps.filter((step) => getStep(step.id).status === "done").length;
  const review = allSteps.filter((step) => getStep(step.id).status === "needs-review" || (step.review && getStep(step.id).status !== "done")).length;
  const started = allSteps.filter((step) => getStep(step.id).status === "in-progress").length;
  return { done, review, started, total: allSteps.length };
}

function budgetTotals() {
  return state.budget.reduce((total, item) => {
    const amount = Math.max(0, Number(item.amount) || 0);
    total[item.cadence === "once" ? "once" : "monthly"] += amount;
    return total;
  }, { monthly: 0, once: 0 });
}

function nonnegativeAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(1_000_000_000_000, Math.max(0, parsed)) : 0;
}

function refreshBudgetSummary() {
  if (currentView !== "budget") return;
  const totals = budgetTotals();
  const unverified = state.budget.filter((item) => Number(item.amount) > 0 && (!String(item.source || "").trim() || !item.checkedOn)).length;
  document.getElementById("monthly-total").textContent = money(totals.monthly);
  document.getElementById("annual-total").textContent = `${money(totals.monthly * 12)} estimated annually`;
  document.getElementById("setup-total").textContent = money(totals.once);
  document.getElementById("gap-total").textContent = money(Math.max(0, totals.monthly - nonnegativeAmount(state.monthlySupport)));
  const badge = document.getElementById("unverified-count");
  badge.textContent = `${unverified} need sources`;
  badge.classList.toggle("badge-review", Boolean(unverified));
}

function button(label, view, primary = false) {
  return `<button class="${primary ? "primary-button" : "secondary-button"}" type="button" data-go="${view}">${label}</button>`;
}

function pageHeader(eyebrow, title, description, action = "") {
  return `<div class="page-header"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}

function progressBar(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}" aria-label="Sending plan progress"><span class="progress-fill" style="width:${pct}%"></span></div>`;
}

function renderOverview() {
  const { done, review, total } = counts();
  const budget = budgetTotals();
  const next = allSteps.filter((step) => getStep(step.id).status !== "done").slice(0, 3);
  const requests = missionaryRequests();
  const greeting = state.profile.church ? esc(state.profile.church) : "your church";
  return `<div class="page">
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow hero-eyebrow">A CHURCH-OWNED SENDING PLAN</div>
        <h1>Send well.<br><em>Stay connected.</em></h1>
        <p>A practical place for ${greeting} to make the decisions, assign the people, and build the care needed to send a missionary directly.</p>
        <div class="hero-actions">${button("Continue sending plan <span aria-hidden=\"true\">→</span>", "plan", true)}${button("Build a field budget", "budget")}</div>
      </div>
      <div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="hero-star">✦</div><div class="hero-art-label">From your church<br>to the field</div></div>
    </section>

    <section class="stats-grid" aria-label="Plan at a glance">
      <div class="stat-card"><div class="stat-top"><span class="stat-label">ROADMAP PROGRESS</span><span class="stat-symbol">↗</span></div><div class="stat-value">${done}<span> / ${total}</span></div>${progressBar(done, total)}<small>steps completed</small></div>
      <div class="stat-card"><div class="stat-top"><span class="stat-label">MONTHLY FIELD BUDGET</span><span class="stat-symbol">◉</span></div><div class="stat-value">${money(budget.monthly)}</div><small>from your own estimates</small></div>
      <div class="stat-card"><div class="stat-top"><span class="stat-label">NEEDS REVIEW</span><span class="stat-symbol">◇</span></div><div class="stat-value">${review}</div><small>open review steps and decisions</small></div>
    </section>

    <section class="overview-columns">
      <div>
        <div class="section-header"><div><div class="eyebrow">THE PATH AHEAD</div><h2>Your sending pathway</h2></div><button class="link-button" type="button" data-go="plan">View full plan →</button></div>
        <div class="phase-grid">${phases.map((phase) => {
          const phaseDone = phase.steps.filter((step) => getStep(step.id).status === "done").length;
          return `<button class="phase-card" type="button" data-go="plan"><span class="phase-number">${phase.number}</span><strong>${phase.title}</strong><span class="phase-meta">${phaseDone} of ${phase.steps.length} complete <span aria-hidden="true">↗</span></span></button>`;
        }).join("")}</div>
      </div>
      <div class="next-panel"><div class="eyebrow">NEXT CONVERSATIONS</div><h2>What to settle next</h2><div class="next-list">${next.length ? next.map((step, index) => `<button class="next-item" type="button" data-go="plan"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${step.title}</strong><small>${getStep(step.id).owner ? `Owner: ${esc(getStep(step.id).owner)}` : "Assign an owner in the plan"}</small></div><span aria-hidden="true">↗</span></button>`).join("") : `<p>All roadmap steps are marked complete. Review the plan with your church's leaders.</p>`}</div></div>
    </section>
    <section class="card"><div class="section-header"><div><div class="eyebrow">FROM THE MISSIONARY SIDE</div><h2>Questions for the church</h2></div><span class="small-note">${requests.length} recorded</span></div>
      ${requests.length ? `<div class="request-list">${requests.map((step) => `<div class="request-item"><strong>${esc(step.title)}</strong><p>${esc(getMissionaryUpdate(step.id).request)}</p></div>`).join("")}</div>` : `<p class="muted-copy">No questions have been recorded in the missionary view yet. Switch views above to explore that side of the plan.</p>`}
    </section>
    <div class="info-banner"><span class="info-mark">i</span><div><strong>A working draft for real conversations</strong><p>This prototype saves only in this browser. It does not invite collaborators, move money, verify compliance, or replace church leadership and professional review.</p></div></div>
  </div>`;
}

function renderProfile() {
  const p = state.profile;
  return `<section class="profile-card card"><div class="section-header"><div><div class="eyebrow">PLAN DETAILS</div><h2>Start with the people and purpose</h2></div><span class="small-note">Saved as you leave each field</span></div>
    <div class="form-grid">
      <label class="field"><span>Church name</span><input class="input" data-profile="church" value="${esc(p.church)}" placeholder="Name of sending church" /></label>
      <label class="field"><span>Missionary name</span><input class="input" data-profile="missionary" value="${esc(p.missionary)}" placeholder="Name or team" /></label>
      <label class="field"><span>Destination</span><input class="input" data-profile="destination" value="${esc(p.destination)}" placeholder="City, region, country" /></label>
      <label class="field"><span>Target departure</span><input class="input" type="date" data-profile="departure" value="${esc(p.departure)}" /></label>
      <label class="field field-wide"><span>Purpose of the work</span><textarea class="textarea" data-profile="purpose" rows="2" placeholder="What is the church sending this person or team to do?">${esc(p.purpose)}</textarea></label>
    </div></section>`;
}

function renderStep(step, number) {
  const saved = getStep(step.id);
  const missionary = getMissionaryUpdate(step.id);
  const statusNames = { "not-started": "Not started", "in-progress": "In progress", "needs-review": "Needs review", done: "Complete" };
  return `<details class="step-card ${saved.status === "done" ? "is-done" : ""}" id="step-${step.id}">
    <summary class="step-summary"><span class="step-check" aria-hidden="true">${saved.status === "done" ? "✓" : number}</span><span class="step-main"><strong class="step-title">${step.title}</strong><span class="step-description">${step.description}</span><span class="step-meta">${saved.owner ? `Owner: ${esc(saved.owner)}` : "No owner yet"} · ${statusNames[saved.status]} · ${saved.lead === "together" ? "Led together" : `${saved.lead === "church" ? "Church" : "Missionary"} lead`}</span></span>${step.review ? `<span class="badge badge-review">Qualified review</span>` : ""}<span class="chevron" aria-hidden="true">⌄</span></summary>
    <div class="step-details"><p class="step-prompt">${step.prompt}</p><div class="step-fields">
      <label class="field"><span>Status</span><select class="select" data-step-id="${step.id}" data-step-field="status">${Object.entries(statusNames).map(([value, text]) => `<option value="${value}" ${saved.status === value ? "selected" : ""}>${text}</option>`).join("")}</select></label>
      <label class="field"><span>Lead side</span><select class="select" data-step-id="${step.id}" data-step-field="lead"><option value="church" ${saved.lead === "church" ? "selected" : ""}>Church</option><option value="missionary" ${saved.lead === "missionary" ? "selected" : ""}>Missionary</option><option value="together" ${saved.lead === "together" ? "selected" : ""}>Together</option></select></label>
      <label class="field"><span>Owner</span><input class="input" data-step-id="${step.id}" data-step-field="owner" value="${esc(saved.owner)}" placeholder="Person or team" /></label>
      <label class="field field-wide"><span>Next action</span><input class="input" data-step-id="${step.id}" data-step-field="next" value="${esc(saved.next)}" placeholder="What happens next, and by when?" /></label>
      <label class="field field-wide"><span>Decision / discussion notes</span><textarea class="textarea" rows="3" data-step-id="${step.id}" data-step-field="notes" placeholder="Record the decision, evidence, unresolved questions, or advice to seek.">${esc(saved.notes)}</textarea></label>
    </div>${missionary.update || missionary.request ? `<div class="missionary-perspective"><strong>From the missionary view</strong>${missionary.update ? `<p><span>Update</span>${esc(missionary.update)}</p>` : ""}${missionary.request ? `<p><span>Question or support needed</span>${esc(missionary.request)}</p>` : ""}</div>` : ""}</div>
  </details>`;
}

function renderPlan() {
  const { done, total } = counts();
  return `<div class="page">
    ${pageHeader("THE SENDING ROADMAP", "A clear path from call to care", "Work through the decisions with your missionary and church leaders. Assign an owner and record the next action for each step.", `<div class="header-progress"><strong>${done} of ${total}</strong><span>steps complete</span>${progressBar(done, total)}</div>`)}
    ${renderProfile()}
    <div class="alert"><span aria-hidden="true">✦</span><div><strong>Make review visible</strong><p>Steps marked “Qualified review” call for current legal, tax, travel, or other specialist input. Mark them complete only after your church has recorded its own decision.</p></div></div>
    <div class="roadmap">${phases.map((phase) => `<section class="phase-section" id="phase-${phase.id}"><div class="phase-heading"><span class="phase-number">${phase.number}</span><div><h2>${phase.title}</h2><p>${phase.description}</p></div><span class="phase-count">${phase.steps.filter((step) => getStep(step.id).status === "done").length}/${phase.steps.length} complete</span></div><div class="step-list">${phase.steps.map((step, index) => renderStep(step, index + 1)).join("")}</div></section>`).join("")}</div>
    <div class="footer-note">This roadmap is a planning aid for U.S. churches. It does not determine tax, employment, immigration, or legal requirements for a particular church or destination.</div>
  </div>`;
}

function renderMissionaryHome() {
  const mine = missionarySteps();
  const open = mine.filter((step) => getStep(step.id).status !== "done");
  const requests = missionaryRequests();
  const destination = state.profile.destination ? esc(state.profile.destination) : "the field";
  const decisions = ["authority", "money", "approval"].map((id) => stepById[id]);
  const statusNames = { "not-started": "Not started", "in-progress": "In progress", "needs-review": "Needs review", done: "Complete" };
  return `<div class="page">
    <section class="hero missionary-hero"><div class="hero-copy"><div class="eyebrow hero-eyebrow">THE MISSIONARY SIDE</div><h1>Prepare well.<br><em>Stay connected.</em></h1><p>Use this space to prepare for ${destination}, share field information, and name what support you need from the church.</p><div class="hero-actions">${button("Open my work <span aria-hidden=\"true\">→</span>", "preparation", true)}${button("Review field budget", "budget")}</div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="hero-star">✦</div><div class="hero-art-label">A shared purpose<br>with clear roles</div></div></section>
    <section class="stats-grid" aria-label="Missionary plan at a glance">
      <div class="stat-card"><div class="stat-top"><span class="stat-label">MY OPEN STEPS</span><span class="stat-symbol">◫</span></div><div class="stat-value">${open.length}<span> / ${mine.length}</span></div><small>led by you or together</small></div>
      <div class="stat-card"><div class="stat-top"><span class="stat-label">MONTHLY FIELD ESTIMATE</span><span class="stat-symbol">◉</span></div><div class="stat-value">${money(budgetTotals().monthly)}</div><small>from the draft budget</small></div>
      <div class="stat-card"><div class="stat-top"><span class="stat-label">QUESTIONS TO CHURCH</span><span class="stat-symbol">◇</span></div><div class="stat-value">${requests.length}</div><small>recorded in your work</small></div>
    </section>
    <section class="missionary-columns"><div class="card"><div class="section-header"><div><div class="eyebrow">YOUR NEXT WORK</div><h2>Keep these moving</h2></div><button class="link-button" type="button" data-go="preparation">View all →</button></div><div class="next-list">${open.length ? open.slice(0, 4).map((step, index) => `<button class="next-item" type="button" data-go="preparation"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${esc(step.title)}</strong><small>${getStep(step.id).lead === "together" ? "Led together" : "Missionary lead"}</small></div><span aria-hidden="true">↗</span></button>`).join("") : `<p>Every step on your side is marked complete. Review the plan with your church.</p>`}</div></div>
      <div class="card"><div class="section-header"><div><div class="eyebrow">FROM THE CHURCH SIDE</div><h2>Church decisions</h2></div></div><div class="decision-list">${decisions.map((step) => { const saved = getStep(step.id); return `<div class="decision-item"><strong>${esc(step.title)}</strong><span class="badge ${saved.status === "needs-review" || step.review && saved.status !== "done" ? "badge-review" : ""}">${statusNames[saved.status] || "Not started"}</span>${saved.next ? `<p>Next action: ${esc(saved.next)}</p>` : ""}</div>`; }).join("")}</div></div></section>
    <div class="info-banner"><span class="info-mark">i</span><div><strong>Two views of one local draft</strong><p>This is an interface preview. Switching views on this device does not create separate accounts, invite a missionary, or sync plans between devices.</p></div></div>
  </div>`;
}

function renderMissionaryProfile() {
  const p = state.profile;
  return `<section class="profile-card card"><div class="section-header"><div><div class="eyebrow">YOUR CONTEXT</div><h2>Where are you preparing to go?</h2></div><span class="small-note">Saved as you leave each field</span></div><div class="form-grid">
    <label class="field"><span>Missionary name</span><input class="input" data-profile="missionary" value="${esc(p.missionary)}" placeholder="Name or team" /></label>
    <label class="field"><span>Destination</span><input class="input" data-profile="destination" value="${esc(p.destination)}" placeholder="City, region, country" /></label>
    <label class="field"><span>Target departure</span><input class="input" type="date" data-profile="departure" value="${esc(p.departure)}" /></label>
    <label class="field field-wide"><span>Purpose of the work</span><textarea class="textarea" data-profile="purpose" rows="2" placeholder="What work are you and the church discerning together?">${esc(p.purpose)}</textarea></label>
  </div><p class="muted-copy">These details also appear in the church view of this browser draft.</p></section>`;
}

function renderMissionaryTask(step) {
  const saved = getStep(step.id);
  const update = getMissionaryUpdate(step.id);
  const statusNames = { "not-started": "Not started", "in-progress": "In progress", "needs-review": "Needs review", done: "Complete" };
  return `<article class="card missionary-task"><div class="missionary-task-heading"><div><span class="eyebrow">${saved.lead === "together" ? "LED TOGETHER" : "MISSIONARY LEAD"}</span><h3>${esc(step.title)}</h3></div><span class="badge ${saved.status === "needs-review" ? "badge-review" : ""}">${statusNames[saved.status] || "Not started"}</span></div><p>${esc(step.description)}</p><div class="church-context"><strong>From the church plan</strong><span>${saved.next ? `Next action: ${esc(saved.next)}` : "No next action recorded yet."}</span></div><div class="missionary-fields">
    <label class="field"><span>Your update</span><textarea class="textarea" rows="3" data-missionary-step-id="${step.id}" data-missionary-field="update" placeholder="What have you learned or completed?">${esc(update.update)}</textarea></label>
    <label class="field"><span>Question or support needed from the church</span><textarea class="textarea" rows="2" data-missionary-step-id="${step.id}" data-missionary-field="request" placeholder="What decision, contact, or help would move this forward?">${esc(update.request)}</textarea></label>
  </div></article>`;
}

function renderPreparation() {
  const mine = missionarySteps();
  const done = mine.filter((step) => getStep(step.id).status === "done").length;
  return `<div class="page">
    ${pageHeader("YOUR SIDE OF THE SENDING PLAN", "My work", "Record your field perspective and the questions you need the church to answer. The church view sets the step status and lead side.", `<div class="header-progress"><strong>${done} of ${mine.length}</strong><span>steps complete</span>${progressBar(done, mine.length)}</div>`)}
    ${renderMissionaryProfile()}
    <section><div class="section-header"><div><div class="eyebrow">MISSIONARY & JOINT STEPS</div><h2>Your updates and requests</h2></div><span class="small-note">Saved as you leave each field</span></div><div class="missionary-task-list">${mine.length ? mine.map(renderMissionaryTask).join("") : `<div class="empty-state"><h3>No steps assigned yet</h3><p>In the church view, set a step's lead side to Missionary or Together.</p></div>`}</div></section>
    <div class="footer-note">This preview keeps your updates in the same browser draft. It does not send them to another person or device.</div>
  </div>`;
}

function renderBudgetRow(item) {
  const sourceUrl = safeUrl(item.source);
  return `<div class="budget-row" data-budget-id="${esc(item.id)}">
    <label class="field"><span class="mobile-field-label">Expense</span><input class="input" data-budget-field="label" value="${esc(item.label)}" aria-label="Expense name" placeholder="Expense name" /></label>
    <label class="field"><span class="mobile-field-label">Amount</span><input class="input amount-input" type="number" min="0" step="0.01" data-budget-field="amount" value="${esc(item.amount)}" aria-label="Amount" /></label>
    <label class="field"><span class="mobile-field-label">Frequency</span><select class="select" data-budget-field="cadence" aria-label="Frequency"><option value="monthly" ${item.cadence === "monthly" ? "selected" : ""}>Monthly</option><option value="once" ${item.cadence === "once" ? "selected" : ""}>One-time</option></select></label>
    <label class="field"><span class="mobile-field-label">Source / quote</span><input class="input" data-budget-field="source" value="${esc(item.source)}" aria-label="Source or quote" placeholder="Quote, person, or URL" /></label>
    <label class="field"><span class="mobile-field-label">Checked on</span><input class="input" type="date" data-budget-field="checkedOn" value="${esc(item.checkedOn)}" aria-label="Date estimate was checked" /></label>
    <div class="budget-actions">${sourceUrl ? `<a href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open source for ${esc(item.label)}">↗</a>` : ""}<button type="button" data-delete-budget="${esc(item.id)}" aria-label="Remove ${esc(item.label)}">×</button></div>
  </div>`;
}

function renderBudget() {
  const totals = budgetTotals();
  const support = Math.max(0, Number(state.monthlySupport) || 0);
  const unverified = state.budget.filter((item) => Number(item.amount) > 0 && (!String(item.source || "").trim() || !item.checkedOn)).length;
  return `<div class="page">
    ${pageHeader("FIELD BUDGET", "Build from real numbers", currentRole === "church" ? "Enter your own estimates and keep a source and date beside each one. No location cost is prefilled as fact." : "Add field estimates and where they came from so your church can review them with you.")}
    <div class="info-banner"><span class="info-mark">i</span><div><strong>Budget for a decision, not a promise</strong><p>These figures are planning inputs. Confirm local prices, church policy, insurance, taxes, and transfer costs with the right people before committing support.</p></div></div>
    <section class="budget-summary">
      <div class="summary-card summary-primary"><span>ESTIMATED MONTHLY COST</span><strong id="monthly-total">${money(totals.monthly)}</strong><small id="annual-total">${money(totals.monthly * 12)} estimated annually</small></div>
      <div class="summary-card"><span>ONE-TIME SETUP</span><strong id="setup-total">${money(totals.once)}</strong><small>travel, setup, and other initial costs</small></div>
      <div class="summary-card"><span>MONTHLY GAP</span><strong id="gap-total">${money(Math.max(0, totals.monthly - support))}</strong><small>cost minus church support estimate</small></div>
    </section>
    <section class="card budget-card"><div class="section-header"><div><div class="eyebrow">YOUR ESTIMATES</div><h2>Budget lines</h2></div><span class="badge ${unverified ? "badge-review" : ""}" id="unverified-count">${unverified} need sources</span></div>
      <div class="budget-table"><div class="budget-table-head"><span>EXPENSE</span><span>AMOUNT</span><span>FREQUENCY</span><span>SOURCE / QUOTE</span><span>CHECKED ON</span><span></span></div>${state.budget.map(renderBudgetRow).join("")}</div>
      <form class="add-form" id="budget-add-form"><div class="field"><label for="new-budget-label">Add an expense</label><input class="input" id="new-budget-label" name="label" required placeholder="e.g. Language training" /></div><button class="secondary-button" type="submit">+ Add line</button></form>
    </section>
    ${currentRole === "church" ? `<section class="card support-card"><div><div class="eyebrow">SUPPORT PLANNING</div><h2>Monthly support recorded</h2><p>Enter the monthly amount the church currently expects to have available. This is a planning figure, not a donation or account balance.</p></div><label class="field"><span>Amount (${esc(state.currency)})</span><input class="input" type="number" min="0" step="0.01" data-support value="${esc(state.monthlySupport)}" /></label><label class="field"><span>Currency</span><select class="select" data-currency>${["USD", "EUR", "GBP", "JPY"].map((value) => `<option value="${value}" ${state.currency === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></section>` : `<section class="card support-readonly"><div><div class="eyebrow">FROM THE CHURCH SIDE</div><h2>Monthly support recorded</h2><p>The church has entered <strong>${money(support)}</strong> as a planning figure. Review the gap together; this is not a donation or account balance.</p></div></section>`}
    <div class="footer-note">The app does not process gifts, issue tax receipts, hold funds, or calculate payroll. Download your plan to keep a backup of this browser-only draft.</div>
  </div>`;
}

function stewardField(key, label, placeholder = "") {
  return `<label class="field"><span>${label}</span><input class="input" data-steward="${key}" value="${esc(state.stewardship[key])}" placeholder="${placeholder}" /></label>`;
}

function renderStewardship() {
  return `<div class="page">
    ${pageHeader("FINANCIAL STEWARDSHIP", "Make responsibility visible", "Record who will handle each part of the church's financial process, then take the unresolved questions to qualified advisers.")}
    <div class="alert"><span aria-hidden="true">!</span><div><strong>Review the arrangement before moving money</strong><p>Donation treatment, compensation, reimbursements, and international transfers depend on the church's facts and destination. This workspace records decisions; it does not determine compliance.</p></div></div>
    <section class="card"><div class="section-header"><div><div class="eyebrow">PEOPLE & PROCESS</div><h2>Who is responsible?</h2></div></div><div class="form-grid">
      ${stewardField("financeLead", "Finance lead", "Person responsible for records")}
      ${stewardField("approver", "Disbursement approver", "Person who approves spending")}
      ${stewardField("reviewer", "Independent reviewer", "Person who reviews the records")}
      <label class="field"><span>Review cadence</span><select class="select" data-steward="cadence">${["Monthly", "Quarterly", "Other / undecided"].map((value) => `<option ${state.stewardship.cadence === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      ${stewardField("reporting", "Who receives a report?", "Leadership, missionary, finance team…")}
      <label class="field field-wide"><span>Open questions / policy notes</span><textarea class="textarea" rows="4" data-steward="notes" placeholder="Document what needs review and who will resolve it.">${esc(state.stewardship.notes)}</textarea></label>
    </div></section>
    <section><div class="section-header"><div><div class="eyebrow">BRING THESE TO THE TABLE</div><h2>Decisions to review</h2></div></div><div class="card-grid review-grid">
      <div class="card review-card"><span class="review-index">01</span><h3>Gifts and church control</h3><p>Set a giving policy and confirm how the church retains control and discretion over donated funds.</p><span class="badge badge-review">Tax review</span></div>
      <div class="card review-card"><span class="review-index">02</span><h3>Compensation and reimbursements</h3><p>Get advice on worker status, payroll, allowances, expense records, and overseas tax questions.</p><span class="badge badge-review">Specialist review</span></div>
      <div class="card review-card"><span class="review-index">03</span><h3>Transfers and records</h3><p>Define approvals, receipts, reconciliations, reporting, and review of overseas payment routes.</p><span class="badge badge-review">Policy review</span></div>
    </div></section>
    <section><div class="section-header"><div><div class="eyebrow">OFFICIAL STARTING POINTS</div><h2>Sources for your advisers</h2></div></div><div class="resource-grid">
      <a class="resource-card" href="https://www.irs.gov/publications/p526" target="_blank" rel="noopener noreferrer"><span>IRS</span><strong>Charitable contributions</strong><small>Publication 526 ↗</small></a>
      <a class="resource-card" href="https://www.irs.gov/pub/irs-pdf/p1828.pdf" target="_blank" rel="noopener noreferrer"><span>IRS</span><strong>Tax guide for churches</strong><small>Publication 1828 ↗</small></a>
      <a class="resource-card" href="https://ofac.treasury.gov/system/files/126/charity_risk_matrix.pdf" target="_blank" rel="noopener noreferrer"><span>U.S. Treasury</span><strong>Charitable sector risk matrix</strong><small>OFAC ↗</small></a>
    </div></section>
  </div>`;
}

function renderResearch() {
  return `<div class="page">
    ${pageHeader("DESTINATION RESEARCH", "Listen first. Keep the source.", "Capture what you learn from local relationships and current sources. Use the notes to shape the church's decisions, not to rank communities from a distance.")}
    <div class="research-prompts"><div><span>01</span><strong>Local voices</strong><p>Who in the destination has described the need and invited this work?</p></div><div><span>02</span><strong>Current context</strong><p>What local work, rules, and risks affect this plan today?</p></div><div><span>03</span><strong>Cost evidence</strong><p>Which housing, health, travel, and living costs have current quotes?</p></div></div>
    <section class="card"><div class="section-header"><div><div class="eyebrow">RESEARCH LOG</div><h2>Add a source or conversation</h2></div></div>
      <form id="research-add-form" class="research-form"><div class="form-grid"><label class="field"><span>Title / person</span><input class="input" name="title" required placeholder="e.g. Local partner conversation" /></label><label class="field"><span>Link (optional)</span><input class="input" name="url" type="url" placeholder="https://…" /></label><label class="field"><span>Date</span><input class="input" type="date" name="date" /></label><label class="field field-wide"><span>What did you learn?</span><textarea class="textarea" name="note" rows="3" placeholder="Include unanswered questions and any limits of this source."></textarea></label></div><button class="primary-button" type="submit">Save research note →</button></form>
    </section>
    <section><div class="section-header"><div><div class="eyebrow">SAVED EVIDENCE</div><h2>Your research notes</h2></div><span class="small-note">${state.research.length} saved</span></div>
      <div class="research-list">${state.research.length ? state.research.map((item) => {
        const url = safeUrl(item.url);
        return `<article class="research-card card"><div><div class="research-date">${item.date ? esc(item.date) : "DATE NOT RECORDED"}</div><h3>${esc(item.title)}</h3><p>${esc(item.note) || "No details recorded yet."}</p>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>` : ""}</div><button type="button" data-delete-research="${esc(item.id)}" aria-label="Remove ${esc(item.title)}">×</button></article>`;
      }).join("") : `<div class="empty-state"><span>⌕</span><h3>No research saved yet</h3><p>Begin with a local conversation or a current source relevant to your destination.</p></div>`}</div>
    </section>
    <section><div class="section-header"><div><div class="eyebrow">OFFICIAL STARTING POINT</div><h2>Travel and destination guidance</h2></div></div><div class="resource-grid"><a class="resource-card" href="https://travel.state.gov/en/international-travel/planning.html" target="_blank" rel="noopener noreferrer"><span>U.S. State Department</span><strong>International travel planning</strong><small>Current guidance ↗</small></a><a class="resource-card" href="https://travel.state.gov/en/international-travel/planning/safety-tips/faith-based.html" target="_blank" rel="noopener noreferrer"><span>U.S. State Department</span><strong>Faith-based travel</strong><small>Rules and risks ↗</small></a></div></section>
  </div>`;
}

const renderers = { overview: renderOverview, plan: renderPlan, missionary: renderMissionaryHome, preparation: renderPreparation, budget: renderBudget, stewardship: renderStewardship, research: renderResearch };
const labels = { overview: "Church home", plan: "Sending plan", missionary: "Missionary home", preparation: "My work", budget: "Field budget", stewardship: "Stewardship", research: "Research notes" };

function roleForView(view) {
  if (["overview", "plan", "stewardship"].includes(view)) return "church";
  if (["missionary", "preparation"].includes(view)) return "missionary";
  return null;
}

function saveRole() {
  try { localStorage.setItem(ROLE_KEY, currentRole); } catch { /* The draft still works without a saved view preference. */ }
}

function render() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.hidden = Boolean(button.dataset.roleNav && button.dataset.roleNav !== currentRole);
    const active = button.dataset.view === currentView;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.getElementById("role-switch").value = currentRole;
  document.getElementById("workspace-label").textContent = `${currentRole.toUpperCase()} WORKSPACE`;
  document.getElementById("nav-progress").textContent = `${counts().done}/${allSteps.length}`;
  document.getElementById("page-name").textContent = labels[currentView];
  root.innerHTML = renderers[currentView]();
  document.title = `${labels[currentView]} | TNWK`;
}

function navigate(view) {
  if (!renderers[view]) return;
  const role = roleForView(view);
  if (role) { currentRole = role; saveRole(); }
  currentView = view;
  history.replaceState(null, "", `#${view}`);
  render();
  window.scrollTo({ top: 0, behavior: "auto" });
  document.querySelector(".sidebar").classList.remove("open");
  document.getElementById("menu-button").setAttribute("aria-expanded", "false");
  root.focus({ preventScroll: true });
}

document.getElementById("role-switch").addEventListener("change", (event) => {
  currentRole = event.target.value === "missionary" ? "missionary" : "church";
  saveRole();
  navigate(currentRole === "church" ? "overview" : "missionary");
});

document.addEventListener("click", (event) => {
  const navigation = event.target.closest("[data-view], [data-go]");
  if (navigation) navigate(navigation.dataset.view || navigation.dataset.go);
  const budgetDelete = event.target.closest("[data-delete-budget]");
  if (budgetDelete && confirm("Remove this budget line?")) {
    state.budget = state.budget.filter((item) => item.id !== budgetDelete.dataset.deleteBudget);
    persist(); render(); toast("Budget line removed.");
  }
  const researchDelete = event.target.closest("[data-delete-research]");
  if (researchDelete && confirm("Remove this research note?")) {
    state.research = state.research.filter((item) => item.id !== researchDelete.dataset.deleteResearch);
    persist(); render(); toast("Research note removed.");
  }
});

root.addEventListener("change", (event) => {
  const field = event.target;
  if (field.dataset.profile) state.profile[field.dataset.profile] = field.value;
  else if (field.dataset.missionaryField) {
    const id = field.dataset.missionaryStepId;
    if (!stepById[id] || !["update", "request"].includes(field.dataset.missionaryField)) return;
    state.missionaryUpdates[id] = { ...getMissionaryUpdate(id), [field.dataset.missionaryField]: field.value };
  }
  else if (field.dataset.stepField) {
    const id = field.dataset.stepId;
    if (!stepById[id]) return;
    state.steps[id] = { ...getStep(id), [field.dataset.stepField]: field.value };
  } else if (field.dataset.budgetField) {
    const row = field.closest("[data-budget-id]");
    const item = state.budget.find((entry) => entry.id === row?.dataset.budgetId);
    if (!item) return;
    item[field.dataset.budgetField] = field.dataset.budgetField === "amount" ? nonnegativeAmount(field.value) : field.value;
  } else if (field.dataset.steward) state.stewardship[field.dataset.steward] = field.value;
  else if (field.hasAttribute("data-support")) state.monthlySupport = nonnegativeAmount(field.value);
  else if (field.hasAttribute("data-currency")) state.currency = field.value;
  else return;
  persist();
  if (field.dataset.budgetField || field.hasAttribute("data-support")) {
    refreshBudgetSummary();
    if (field.dataset.budgetField === "source") {
      const actions = field.closest(".budget-row")?.querySelector(".budget-actions");
      const url = safeUrl(field.value);
      const existing = actions?.querySelector("a");
      if (existing && !url) existing.remove();
      else if (url && existing) existing.href = url;
      else if (url && actions) {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "↗";
        link.setAttribute("aria-label", "Open budget source");
        actions.prepend(link);
      }
    }
  }
  if (["status", "lead"].includes(field.dataset.stepField) || field.hasAttribute("data-currency")) {
    const openStep = field.closest("details")?.id;
    render();
    if (openStep) document.getElementById(openStep)?.setAttribute("open", "");
  }
});

root.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  if (form.id === "budget-add-form") {
    const label = String(data.get("label") || "").trim();
    if (!label) return;
    state.budget.push({ id: crypto.randomUUID(), label, cadence: "monthly", amount: 0, source: "", checkedOn: "" });
    persist(); render(); toast("Budget line added.");
  }
  if (form.id === "research-add-form") {
    const title = String(data.get("title") || "").trim();
    if (!title) return;
    state.research.unshift({ id: crypto.randomUUID(), title, url: String(data.get("url") || "").trim(), date: String(data.get("date") || ""), note: String(data.get("note") || "").trim() });
    persist(); render(); toast("Research note saved.");
  }
});

document.getElementById("menu-button").addEventListener("click", () => {
  const open = document.querySelector(".sidebar").classList.toggle("open");
  document.getElementById("menu-button").setAttribute("aria-expanded", String(open));
});

document.getElementById("print-button").addEventListener("click", () => window.print());
document.getElementById("export-button").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tnwk-sending-plan-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast("Plan downloaded. Store the file securely if it contains personal details.");
});

document.getElementById("import-button").addEventListener("click", () => document.getElementById("import-file").click());
document.getElementById("import-file").addEventListener("change", async (event) => {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error("This file is too large for a plan draft.");
    const imported = normalizeState(JSON.parse(await file.text()));
    if (!imported) throw new Error("This is not a TNWK plan file.");
    if (!confirm("Replace the current browser draft with this imported plan?")) return;
    state = imported;
    persist();
    render();
    toast("Plan imported into this browser.");
  } catch (error) {
    toast(error.message || "The plan could not be imported.");
  } finally {
    input.value = "";
  }
});

window.addEventListener("hashchange", () => {
  const view = location.hash.slice(1);
  if (renderers[view] && view !== currentView) {
    currentView = view;
    const role = roleForView(view);
    if (role) { currentRole = role; saveRole(); }
    render();
  }
});

render();
