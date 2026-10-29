(() => {
  "use strict";

  const STORAGE_KEY = "rescueroute-prototype-state-v1";
  const priorityRank = { critical: 4, high: 3, medium: 2, low: 1 };
  const priorityColor = { critical: "#c6413b", high: "#b8751e", medium: "#346b94", low: "#208978" };
  const symbols = { Waterlogging: "≈", "Fallen tree": "♣", Fire: "△", "Lightning injury": "ϟ", "Road accident": "◇", Other: "+" };

  const seedIncidents = [
    {
      id: "RR-1047", type: "Lightning injury", title: "Lightning injury reported", location: "Cubbon Park, north entrance",
      description: "One person reportedly collapsed after a nearby lightning strike. Medical assistance requested.",
      priority: "critical", score: 91, verification: "review", status: "new", updatedMinutes: 3, source: "Citizen report",
      peopleAffected: 1, injury: true, blocked: false, emergencyAccess: false, resource: null, queued: false,
      x: 51, y: 48, reasons: ["Medical need reported", "Immediate danger", "Recent report"],
      analysis: ["Medical need raises urgency", "No supporting report received yet", "Exact patient condition is unknown"],
      confidence: 58, timeline: [{ label: "Report received", detail: "Citizen report · 3 minutes ago" }, { label: "System suggestion created", detail: "Critical priority · awaiting human review" }]
    },
    {
      id: "RR-1046", type: "Fallen tree", title: "Tree blocking emergency access", location: "Indiranagar 12th Main",
      description: "Large tree across both lanes. An ambulance was reportedly redirected at the junction.",
      priority: "critical", score: 88, verification: "verified", status: "responding", updatedMinutes: 6, source: "Field volunteer",
      peopleAffected: 18, injury: false, blocked: true, emergencyAccess: true, resource: "Road clearance unit A2", queued: false,
      x: 78, y: 56, reasons: ["Emergency access affected", "Road fully blocked", "Field source"],
      analysis: ["Two nearby reports describe the same blockage", "Field volunteer supplied a current image", "Emergency access impact confirmed by coordinator"],
      confidence: 86, timeline: [{ label: "First report received", detail: "Citizen report · 14 minutes ago" }, { label: "Duplicate reports merged", detail: "2 reports · 9 minutes ago" }, { label: "Coordinator verified incident", detail: "6 minutes ago" }, { label: "Road clearance assigned", detail: "Unit A2 · en route" }]
    },
    {
      id: "RR-1045", type: "Waterlogging", title: "Severe road waterlogging", location: "Rajajinagar 2nd Block",
      description: "Water appears above the kerb. Two-wheelers are turning back and one car may be stalled.",
      priority: "high", score: 72, verification: "unverified", status: "new", updatedMinutes: 8, source: "Citizen report",
      peopleAffected: 30, injury: false, blocked: true, emergencyAccess: false, resource: null, queued: false,
      x: 23, y: 45, reasons: ["Access disruption", "Multiple people affected", "Possible duplicate nearby"],
      analysis: ["A similar waterlogging report was submitted 400 m away", "No authorised source has confirmed road depth", "Report remains current but unverified"],
      confidence: 63, timeline: [{ label: "Report received", detail: "Citizen report · 8 minutes ago" }, { label: "Possible duplicate found", detail: "1 nearby report · review required" }]
    },
    {
      id: "RR-1043", type: "Fire", title: "Smoke from commercial building", location: "Koramangala 5th Block",
      description: "Dark smoke visible from the rear of a three-storey commercial building. Occupancy is unknown.",
      priority: "high", score: 76, verification: "verified", status: "responding", updatedMinutes: 12, source: "Authority",
      peopleAffected: 0, injury: false, blocked: false, emergencyAccess: false, resource: "Fire response B1", queued: false,
      x: 75, y: 81, reasons: ["Active fire indicator", "Occupancy unknown", "Authority confirmed"],
      analysis: ["Fire control room confirmed the call", "Building occupancy has not been established", "Access route currently has no reported disruption"],
      confidence: 91, timeline: [{ label: "Report received", detail: "Authority source · 18 minutes ago" }, { label: "Incident verified", detail: "Fire control confirmation · 15 minutes ago" }, { label: "Response assigned", detail: "Fire response B1 · 12 minutes ago" }]
    }
  ];

  const seedResources = [
    { id: "AMB-12", symbol: "+", name: "Ambulance 12", location: "Victoria Hospital", state: "available" },
    { id: "FIRE-B1", symbol: "△", name: "Fire response B1", location: "Koramangala", state: "assigned" },
    { id: "CLEAR-A2", symbol: "↗", name: "Road clearance A2", location: "Indiranagar", state: "assigned" },
    { id: "RESCUE-04", symbol: "R", name: "Rescue team 04", location: "Hebbal hub", state: "available" },
    { id: "VOL-07", symbol: "V", name: "Volunteer unit 07", location: "Malleshwaram", state: "available" }
  ];

  let state = loadState();
  let currentMapFilter = "all";
  let selectedIncidentId = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = "") => String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const labelize = value => value === "review" ? "Under review" : value.charAt(0).toUpperCase() + value.slice(1);
  const relativeTime = incident => incident.queued ? "Queued offline" : incident.updatedMinutes <= 1 ? "Just now" : `${incident.updatedMinutes} min ago`;

  function defaultState() {
    return { incidents: structuredClone(seedIncidents), resources: structuredClone(seedResources), online: true, nextId: 1048 };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.incidents?.length && saved?.resources?.length) return saved;
    } catch (_) { /* Start with deterministic demo data. */ }
    return defaultState();
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function badge(type, text = labelize(type)) {
    return `<span class="badge badge-${esc(type)}">${esc(text)}</span>`;
  }

  function navigate(view) {
    $$("[data-view-panel]").forEach(panel => panel.classList.toggle("is-visible", panel.dataset.viewPanel === view));
    $$(".nav-item").forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "coordination") renderCoordination();
  }

  function renderAll() {
    renderStats();
    renderMap();
    renderIncidentList();
    renderCoordination();
    renderResources();
    renderConnection();
  }

  function renderStats() {
    const active = state.incidents.filter(i => i.status !== "resolved");
    const needReview = active.filter(i => i.verification !== "verified");
    const disruptions = active.filter(i => i.blocked || i.emergencyAccess);
    const assigned = active.filter(i => i.resource);
    $("#activeCount").textContent = active.length;
    $("#unverifiedCount").textContent = needReview.length;
    $("#routeCount").textContent = disruptions.length;
    $("#assignedCount").textContent = assigned.length;
    $("#navQueueCount").textContent = needReview.length;
    $("#reviewSummary").textContent = needReview.length;
    $("#criticalSummary").textContent = active.filter(i => i.priority === "critical").length;
    $("#resourceSummary").textContent = active.filter(i => !i.resource).length;
    $("#offlineSummary").textContent = state.incidents.filter(i => i.queued).length;
    $("#lastUpdated").textContent = state.online ? "just now" : "before connection was lost";
  }

  function filteredMapIncidents() {
    if (currentMapFilter === "all") return state.incidents.filter(i => i.status !== "resolved");
    if (currentMapFilter === "unverified") return state.incidents.filter(i => i.verification !== "verified" && i.status !== "resolved");
    return state.incidents.filter(i => i.priority === currentMapFilter && i.status !== "resolved");
  }

  function renderMap() {
    const container = $("#mapMarkers");
    container.innerHTML = filteredMapIncidents().map(incident => `
      <button class="map-marker ${incident.verification !== "verified" ? "unverified" : ""}"
        style="left:${incident.x}%;top:${incident.y}%;--priority-color:${priorityColor[incident.priority]}"
        data-incident-id="${incident.id}" data-symbol="${esc(symbols[incident.type] || "+")}" aria-label="${esc(incident.title)} at ${esc(incident.location)}"></button>
    `).join("");
    $$(".map-marker", container).forEach(marker => marker.addEventListener("click", () => showMapCallout(marker.dataset.incidentId)));
  }

  function showMapCallout(id) {
    const incident = state.incidents.find(item => item.id === id);
    if (!incident) return;
    selectedIncidentId = id;
    $("#calloutMeta").textContent = `${incident.priority} priority · ${relativeTime(incident)}`;
    $("#calloutTitle").textContent = incident.title;
    $("#calloutLocation").textContent = incident.location;
    $("#calloutBadges").innerHTML = badge(incident.priority) + badge(incident.verification);
    $("#mapCallout").hidden = false;
  }

  function renderIncidentList() {
    const query = $("#incidentSearch").value.trim().toLowerCase();
    const status = $("#incidentStatusFilter").value;
    const visible = [...state.incidents]
      .filter(i => i.status !== "resolved")
      .filter(i => status === "all" || i.verification === status)
      .filter(i => !query || `${i.title} ${i.location} ${i.type}`.toLowerCase().includes(query))
      .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || a.updatedMinutes - b.updatedMinutes);

    $("#incidentListCount").textContent = `${visible.length} report${visible.length === 1 ? "" : "s"}`;
    $("#incidentList").innerHTML = visible.length ? visible.map(incident => `
      <button class="incident-card" data-open-incident="${incident.id}">
        <div class="incident-card-header"><div><h3>${esc(incident.title)}</h3><p>${esc(incident.location)}</p></div>${badge(incident.priority)}</div>
        <div class="incident-card-footer">${badge(incident.verification)}<time>${esc(relativeTime(incident))}</time></div>
      </button>
    `).join("") : `<div class="empty-state">No incidents match this filter.</div>`;
    bindIncidentOpeners($("#incidentList"));
  }

  function renderCoordination() {
    const filter = $("#queueFilter")?.value || "all";
    const queue = [...state.incidents]
      .filter(i => i.status !== "resolved")
      .filter(i => filter === "all" || i.priority === filter)
      .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || b.score - a.score);

    const target = $("#priorityQueue");
    if (!target) return;
    target.innerHTML = queue.length ? queue.map(incident => `
      <article class="priority-card" data-open-incident="${incident.id}" role="button" tabindex="0" aria-label="Open ${esc(incident.title)}">
        <span class="priority-stripe" style="--priority-color:${priorityColor[incident.priority]}"></span>
        <div><h3>${esc(incident.title)}</h3><p>${esc(incident.location)} · ${esc(incident.source)}</p><div class="priority-reasons">${incident.reasons.slice(0, 3).map(reason => `<span>${esc(reason)}</span>`).join("")}</div></div>
        <div class="priority-meta">${badge(incident.priority)}${badge(incident.verification)}<time>${esc(relativeTime(incident))}</time></div>
      </article>
    `).join("") : `<div class="empty-state">No incidents match this priority.</div>`;
    bindIncidentOpeners(target);
  }

  function renderResources() {
    const target = $("#resourceList");
    target.innerHTML = state.resources.map(resource => `
      <article class="resource-item"><span class="resource-symbol">${esc(resource.symbol)}</span><div><strong>${esc(resource.name)}</strong><small>${esc(resource.location)}</small></div><span class="resource-state ${resource.state}">${labelize(resource.state)}</span></article>
    `).join("");
  }

  function renderConnection() {
    const toggle = $("#connectionToggle");
    toggle.checked = state.online;
    $("#connectionText").textContent = state.online ? "Online" : "Offline";
    toggle.closest(".connection-control").classList.toggle("offline", !state.online);
    $("#connectionBanner").hidden = state.online;
  }

  function bindIncidentOpeners(root) {
    $$('[data-open-incident]', root).forEach(node => {
      const open = () => openIncident(node.dataset.openIncident);
      node.addEventListener("click", open);
      node.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
    });
  }

  function openIncident(id) {
    const incident = state.incidents.find(item => item.id === id);
    if (!incident) return;
    selectedIncidentId = id;
    const availableResources = state.resources.filter(resource => resource.state === "available" || resource.name === incident.resource);
    $("#drawerContent").innerHTML = `
      <div class="drawer-topline">${badge(incident.priority)}${badge(incident.verification)}${incident.queued ? badge("review", "Queued offline") : ""}</div>
      <header class="drawer-header"><p class="eyebrow">${esc(incident.id)} · ${esc(incident.type)}</p><h2 id="drawerTitle">${esc(incident.title)}</h2><p>${esc(incident.location)} · updated ${esc(relativeTime(incident))}</p></header>
      <section class="drawer-section"><h3>Observed information</h3><p>${esc(incident.description)}</p><div class="reason-grid"><span><strong>${incident.peopleAffected || "Unknown"}</strong><br>People affected</span><span><strong>${incident.source === "Citizen report" ? "Public" : "Authorised"}</strong><br>Source category</span><span><strong>${incident.blocked ? "Reported blocked" : "No full blockage"}</strong><br>Road access</span><span><strong>${incident.emergencyAccess ? "Affected" : "Not reported"}</strong><br>Emergency access</span></div></section>
      <section class="drawer-section"><h3>Reliability and uncertainty</h3><div class="confidence-row"><span>System confidence in report completeness</span><strong>${incident.confidence}%</strong></div><div class="confidence-bar"><span style="width:${incident.confidence}%"></span></div><ul class="analysis-list">${incident.analysis.map((item, index) => `<li><i class="${index > 0 && incident.verification !== "verified" ? "warning" : ""}">${index === 0 ? "✓" : "!"}</i>${esc(item)}</li>`).join("")}</ul></section>
      <section class="drawer-section"><h3>Why ${esc(incident.priority)} priority was suggested</h3><div class="reason-grid">${incident.reasons.map(reason => `<span>${esc(reason)}</span>`).join("")}</div><p style="margin-top:10px">Priority score ${incident.score}/100. This is a transparent suggestion, not an automatic dispatch decision.</p></section>
      <section class="drawer-section"><h3>Coordinator decision</h3><div class="drawer-controls"><label>Verification status<select id="drawerVerification"><option value="unverified" ${incident.verification === "unverified" ? "selected" : ""}>Unverified</option><option value="review" ${incident.verification === "review" ? "selected" : ""}>Under review</option><option value="verified" ${incident.verification === "verified" ? "selected" : ""}>Verified</option></select></label><label>Response status<select id="drawerStatus"><option value="new" ${incident.status === "new" ? "selected" : ""}>New</option><option value="responding" ${incident.status === "responding" ? "selected" : ""}>Response in progress</option><option value="monitoring" ${incident.status === "monitoring" ? "selected" : ""}>Monitoring</option><option value="resolved" ${incident.status === "resolved" ? "selected" : ""}>Resolved</option></select></label><label style="grid-column:1/-1">Assign resource<select id="drawerResource"><option value="">Not assigned</option>${availableResources.map(resource => `<option value="${esc(resource.name)}" ${incident.resource === resource.name ? "selected" : ""}>${esc(resource.name)} · ${esc(resource.location)}</option>`).join("")}</select></label></div><div class="drawer-actions"><button class="secondary-button" id="saveReviewButton">Save review</button><button class="primary-button" id="verifyAssignButton">Verify & coordinate</button></div></section>
      <section class="drawer-section"><h3>Incident timeline</h3><ol class="timeline">${incident.timeline.slice().reverse().map(event => `<li><strong>${esc(event.label)}</strong>${esc(event.detail)}</li>`).join("")}</ol></section>
      <section class="drawer-section"><p><strong>Safety note:</strong> This demonstration supports human decisions. It does not independently confirm an incident, dispatch emergency services or guarantee route safety.</p></section>
    `;
    $("#drawerBackdrop").hidden = false;
    $("#incidentDrawer").classList.add("is-open");
    $("#incidentDrawer").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $("#saveReviewButton").addEventListener("click", () => saveReview(false));
    $("#verifyAssignButton").addEventListener("click", () => saveReview(true));
    setTimeout(() => $("#drawerClose").focus(), 50);
  }

  function closeDrawer() {
    $("#incidentDrawer").classList.remove("is-open");
    $("#incidentDrawer").setAttribute("aria-hidden", "true");
    $("#drawerBackdrop").hidden = true;
    document.body.style.overflow = "";
  }

  function saveReview(verifyAndCoordinate) {
    const incident = state.incidents.find(item => item.id === selectedIncidentId);
    if (!incident) return;
    const oldResource = incident.resource;
    incident.verification = verifyAndCoordinate ? "verified" : $("#drawerVerification").value;
    incident.status = verifyAndCoordinate && $("#drawerStatus").value === "new" ? "responding" : $("#drawerStatus").value;
    incident.resource = $("#drawerResource").value || null;
    incident.updatedMinutes = 0;
    if (incident.verification === "verified") {
      incident.analysis = incident.analysis.map(item => item === "Report has not yet been reviewed by a coordinator" ? "Coordinator review has been completed" : item);
      incident.confidence = Math.max(incident.confidence, 78);
    }
    if (verifyAndCoordinate && !incident.resource) {
      const firstAvailable = state.resources.find(resource => resource.state === "available");
      if (firstAvailable) incident.resource = firstAvailable.name;
    }
    state.resources.forEach(resource => {
      if (resource.name === oldResource && oldResource !== incident.resource) resource.state = "available";
      if (resource.name === incident.resource) resource.state = "assigned";
    });
    incident.timeline.push({ label: verifyAndCoordinate ? "Coordinator verified and coordinated" : "Coordinator review updated", detail: `${incident.resource ? `${incident.resource} assigned · ` : ""}just now` });
    saveState();
    renderAll();
    openIncident(incident.id);
    toast("Coordinator update saved", `${incident.id} now shows ${labelize(incident.verification)} · ${labelize(incident.status)}.`);
  }

  function analyseReport(data) {
    const injury = data.get("injury") === "on";
    const blocked = data.get("blocked") === "on";
    const emergencyAccess = data.get("emergencyAccess") === "on";
    const peopleAffected = Number(data.get("peopleAffected")) || 0;
    const type = data.get("type");
    const location = data.get("location").trim();
    let score = 22;
    const reasons = [];
    if (["Fire", "Lightning injury"].includes(type)) { score += 25; reasons.push("Immediate danger indicator"); }
    if (injury) { score += 30; reasons.push("Medical need reported"); }
    if (emergencyAccess) { score += 20; reasons.push("Emergency access affected"); }
    if (blocked) { score += 15; reasons.push("Road fully blocked"); }
    if (peopleAffected >= 20) { score += 12; reasons.push("Multiple people affected"); }
    else if (peopleAffected > 0) { score += 5; reasons.push("People affected"); }
    score = Math.min(score, 98);
    const duplicate = state.incidents.find(item => item.type === type || location.toLowerCase().split(" ").some(word => word.length > 5 && item.location.toLowerCase().includes(word)));
    if (duplicate) reasons.push("Possible duplicate nearby");
    if (reasons.length === 0) reasons.push("Recent field report");
    const priority = score >= 80 ? "critical" : score >= 58 ? "high" : score >= 36 ? "medium" : "low";
    return { injury, blocked, emergencyAccess, peopleAffected, score, priority, reasons, duplicate };
  }

  function submitIncident(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const analysis = analyseReport(data);
    const type = data.get("type");
    const positions = [[31, 65], [62, 29], [45, 76], [83, 35], [18, 74]];
    const position = positions[(state.nextId - 1048) % positions.length];
    const id = `RR-${state.nextId++}`;
    const incident = {
      id, type, title: type === "Waterlogging" ? "Waterlogging reported" : `${type} reported`, location: data.get("location").trim(),
      description: data.get("description").trim(), priority: analysis.priority, score: analysis.score,
      verification: "unverified", status: "new", updatedMinutes: 0, source: data.get("source"),
      peopleAffected: analysis.peopleAffected, injury: analysis.injury, blocked: analysis.blocked, emergencyAccess: analysis.emergencyAccess,
      resource: null, queued: !state.online, x: position[0], y: position[1], reasons: analysis.reasons,
      analysis: [analysis.duplicate ? `Possible duplicate: ${analysis.duplicate.id} is a related report` : "No nearby matching report found", analysis.peopleAffected ? "People affected estimate was supplied" : "Number of people affected is unknown", "Report has not yet been reviewed by a coordinator"],
      confidence: analysis.duplicate ? 61 : 52,
      timeline: [{ label: state.online ? "Report received" : "Report saved offline", detail: `${data.get("source")} · just now` }, { label: "System suggestion created", detail: `${labelize(analysis.priority)} priority · reasons shown for review` }]
    };
    state.incidents.unshift(incident);
    saveState();
    form.reset();
    setDefaultReportTime();
    renderAll();
    navigate(state.online ? "coordination" : "situation");
    toast(state.online ? "Report added to the review queue" : "Report safely queued on this device", `${id} · ${labelize(analysis.priority)} priority suggested with ${analysis.reasons.length} reason${analysis.reasons.length === 1 ? "" : "s"}.`);
    if (state.online) setTimeout(() => openIncident(id), 350);
  }

  function setConnection(online) {
    const wasOnline = state.online;
    state.online = online;
    if (online && !wasOnline) {
      const queued = state.incidents.filter(i => i.queued);
      queued.forEach(incident => {
        incident.queued = false;
        incident.updatedMinutes = 0;
        incident.timeline.push({ label: "Offline report synchronised", detail: "Connection restored · just now" });
      });
      if (queued.length) toast("Queued reports synchronised", `${queued.length} report${queued.length === 1 ? "" : "s"} added to the shared operational picture.`);
      else toast("Connection restored", "The prototype is back online.");
    } else if (!online) {
      toast("Offline simulation enabled", "New reports will remain on this device until connection returns.");
    }
    saveState();
    renderAll();
  }

  function setDefaultReportTime() {
    const input = $('input[name="time"]');
    const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    input.value = now.toISOString().slice(0, 16);
  }

  function toast(title, detail) {
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = `<strong>${esc(title)}</strong><p>${esc(detail)}</p>`;
    $("#toastRegion").append(node);
    setTimeout(() => node.remove(), 4700);
  }

  function resetDemo() {
    state = defaultState();
    saveState();
    closeDrawer();
    renderAll();
    toast("Demo data reset", "The original incident and resource scenario has been restored.");
  }

  function bindEvents() {
    $$(".nav-item").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
    $$('[data-go-view]').forEach(button => button.addEventListener("click", () => navigate(button.dataset.goView)));
    $$("[data-map-filter]").forEach(button => button.addEventListener("click", () => {
      currentMapFilter = button.dataset.mapFilter;
      $$("[data-map-filter]").forEach(item => item.classList.toggle("is-active", item === button));
      renderMap();
      $("#mapCallout").hidden = true;
    }));
    $("#incidentSearch").addEventListener("input", renderIncidentList);
    $("#incidentStatusFilter").addEventListener("change", renderIncidentList);
    $("#queueFilter").addEventListener("change", renderCoordination);
    $("#incidentForm").addEventListener("submit", submitIncident);
    $("#connectionToggle").addEventListener("change", event => setConnection(event.target.checked));
    $("#calloutDetails").addEventListener("click", () => openIncident(selectedIncidentId));
    $(".callout-close").addEventListener("click", () => { $("#mapCallout").hidden = true; });
    $("#drawerClose").addEventListener("click", closeDrawer);
    $("#drawerBackdrop").addEventListener("click", closeDrawer);
    $("#checkRouteButton").addEventListener("click", () => {
      $("#routeResult").hidden = false;
      $("#routeResult").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    $("#resetDemoButton").addEventListener("click", resetDemo);

    const guide = $("#guideDialog");
    $("#demoGuideButton").addEventListener("click", () => guide.showModal());
    $("#guideClose").addEventListener("click", () => guide.close());
    $("#startDemoButton").addEventListener("click", () => { guide.close(); navigate("situation"); });
    guide.addEventListener("click", event => { if (event.target === guide) guide.close(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeDrawer(); });
  }

  setDefaultReportTime();
  bindEvents();
  renderAll();
})();
