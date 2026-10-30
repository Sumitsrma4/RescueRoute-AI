(() => {
  "use strict";

  const STORAGE_KEY = "rescueroute-prototype-state-v2";
  const priorityRank = { critical: 4, high: 3, medium: 2, low: 1 };
  const priorityColor = { critical: "#c43f3b", high: "#b66a17", medium: "#356c92", low: "#17806b" };
  const symbols = { Waterlogging: "≈", Fire: "△", "Road blocked": "×", Injury: "+", Other: "?" };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const seedIncidents = [
    { id: "RR-1047", type: "Injury", title: "Lightning injury reported", location: "Cubbon Park, north entrance", description: "One person reportedly collapsed after a nearby lightning strike. Medical assistance requested.", priority: "critical", score: 92, verification: "review", status: "new", updatedMinutes: 3, peopleAffected: 1, injury: true, blocked: false, resource: null, x: 51, y: 48, reasons: ["Medical need reported", "Immediate danger", "Very recent report"], uncertainty: "One public report; exact patient condition is unconfirmed.", timeline: [{ label: "Citizen report received", detail: "3 min ago" }, { label: "AI suggestion created", detail: "Critical · awaiting human review" }] },
    { id: "RR-1048", type: "Waterlogging", title: "Severe waterlogging", location: "Rajajinagar 2nd Block", description: "Waist-deep water reported across the road. A bus is stalled and local access is blocked.", priority: "critical", score: 87, verification: "review", status: "new", updatedMinutes: 8, peopleAffected: 24, injury: false, blocked: true, resource: null, x: 25, y: 50, reasons: ["24 people may be affected", "Road access blocked", "Nearby related report"], uncertainty: "Two related reports are present, but water depth still needs responder confirmation.", timeline: [{ label: "Two reports linked", detail: "8 min ago" }, { label: "Access risk flagged", detail: "No resource assigned" }] },
    { id: "RR-1049", type: "Fire", title: "Smoke from commercial building", location: "MG Road, Brigade junction", description: "Dark smoke visible from an upper floor. Occupancy is unknown.", priority: "high", score: 76, verification: "verified", status: "responding", updatedMinutes: 12, peopleAffected: 8, injury: false, blocked: false, resource: "Fire Unit F-12", x: 56, y: 57, reasons: ["Active fire indicator", "Occupied area", "Rapid escalation possible"], uncertainty: "Fire is verified. Exact number of occupants remains unknown.", timeline: [{ label: "Authority feed verified", detail: "10 min ago" }, { label: "Fire Unit F-12 assigned", detail: "7 min ago" }] },
    { id: "RR-1050", type: "Road blocked", title: "Fallen tree blocking road", location: "Indiranagar 100 Feet Road", description: "A large tree is blocking two lanes. No injury has been reported.", priority: "medium", score: 48, verification: "verified", status: "monitoring", updatedMinutes: 19, peopleAffected: 0, injury: false, blocked: true, resource: "Public Works Crew P-4", x: 78, y: 60, reasons: ["Road access blocked", "Verified obstruction", "No injury reported"], uncertainty: "Extent of traffic diversion is not yet confirmed.", timeline: [{ label: "Field volunteer report", detail: "19 min ago" }, { label: "Public Works Crew P-4 assigned", detail: "14 min ago" }] }
  ];

  const seedResources = [
    { id: "AMB-07", name: "Ambulance A-07", kind: "Ambulance", location: "Victoria Hospital", state: "available", symbol: "+", x: 43, y: 66 },
    { id: "FIRE-12", name: "Fire Unit F-12", kind: "Fire response", location: "MG Road", state: "assigned", symbol: "△", x: 59, y: 53 },
    { id: "RES-03", name: "Rescue Team R-03", kind: "Rescue team", location: "Hebbal response hub", state: "available", symbol: "R", x: 73, y: 25 },
    { id: "PWC-04", name: "Public Works Crew P-4", kind: "Road clearance", location: "Indiranagar", state: "assigned", symbol: "×", x: 80, y: 60 },
    { id: "MED-02", name: "Medical Team M-02", kind: "Medical response", location: "NIMHANS", state: "available", symbol: "+", x: 48, y: 82 }
  ];

  const seedAlerts = [
    { id: "ALERT-01", incidentId: "RR-1048", message: "Waterlogging is blocking access near Rajajinagar.", updatedMinutes: 8, approvedBy: "Demo coordinator" }
  ];

  const helpLocations = [
    { name: "NIMHANS Emergency Services", address: "Hosur Road / Marigowda Road, Bengaluru 560029", query: "NIMHANS Emergency Services Bengaluru", icon: "+" },
    { name: "Victoria Hospital", address: "Victoria Hospital campus, Fort Road, Bengaluru", query: "Victoria Hospital Bengaluru", icon: "+" },
    { name: "Bowring & Lady Curzon Hospital", address: "Lady Curzon Road, Shivaji Nagar, Bengaluru 560001", query: "Bowring and Lady Curzon Hospital Bengaluru", icon: "+" }
  ];

  function defaultState() {
    return { incidents: JSON.parse(JSON.stringify(seedIncidents)), resources: JSON.parse(JSON.stringify(seedResources)), publicAlerts: JSON.parse(JSON.stringify(seedAlerts)), lastCitizenReportId: null, nextId: 1051 };
  }

  function normalizeState(saved) {
    const fallback = defaultState();
    const normalized = { ...fallback, ...saved };
    normalized.publicAlerts = Array.isArray(saved.publicAlerts) ? saved.publicAlerts : fallback.publicAlerts;
    normalized.incidents = saved.incidents.map(incident => ({
      verificationChecks: incident.verificationChecks || { location: incident.verification === "verified", source: incident.verification === "verified", freshness: incident.verification === "verified", duplicate: incident.verification === "verified" },
      verificationNote: incident.verificationNote || "",
      latitude: incident.latitude || null,
      longitude: incident.longitude || null,
      ...incident
    }));
    return normalized;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.incidents && saved?.resources) return normalizeState(saved);
    } catch (_) { /* keep a usable demo even if storage is unavailable */ }
    return defaultState();
  }

  let state = loadState();
  let role = "citizen";
  let currentView = "situation";
  let currentMapFilter = "all";
  let selectedIncidentId = null;
  let broadcastPreviewReady = false;

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* prototype remains functional */ }
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function label(value) { return String(value).replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
  function relativeTime(incident) { return incident.updatedMinutes === 0 ? "just now" : `${incident.updatedMinutes} min ago`; }
  function badge(value, text = label(value)) { return `<span class="badge ${esc(value)}">${esc(text)}</span>`; }
  function activeIncidents() { return state.incidents.filter(incident => incident.status !== "resolved"); }

  function navigate(view) {
    const responderViews = ["overview", "queue", "resources"];
    if (responderViews.includes(view) && role !== "responder") { $("#loginDialog").showModal(); return; }
    currentView = view;
    $$('[data-view-panel]').forEach(panel => panel.classList.toggle("is-visible", panel.dataset.viewPanel === view));
    $$(".nav-button").forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    if (view === "overview") renderOverview();
    if (view === "queue") renderQueue();
    if (view === "resources") renderResources();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setRole(nextRole) {
    role = nextRole;
    const responder = role === "responder";
    $("#citizenNav").hidden = responder;
    $("#responderNav").hidden = !responder;
    $("#responderLoginButton").hidden = responder;
    $("#responderProfile").hidden = !responder;
    navigate(responder ? "overview" : "situation");
  }

  function renderStats() {
    const incidents = activeIncidents();
    const needsReview = incidents.filter(item => item.verification !== "verified");
    const critical = incidents.filter(item => item.priority === "critical");
    const urgent = incidents.filter(item => ["critical", "high"].includes(item.priority));
    const blocked = incidents.filter(item => item.blocked);
    const unassigned = incidents.filter(item => !item.resource);
    const responding = incidents.filter(item => item.resource && item.status === "responding");
    $("#activeCount").textContent = incidents.length;
    $("#criticalCount").textContent = urgent.length;
    $("#unverifiedCount").textContent = needsReview.length;
    $("#blockedCount").textContent = blocked.length;
    $("#reviewCount").textContent = needsReview.length;
    $("#responderCriticalCount").textContent = critical.length;
    $("#unassignedCount").textContent = unassigned.length;
    $("#respondingCount").textContent = responding.length;
    $("#queueNavCount").textContent = needsReview.length;
  }

  function renderPublicAlert() {
    const alert = state.publicAlerts[0];
    const panel = $("#publicAlert");
    if (!alert) { panel.hidden = true; return; }
    panel.hidden = false;
    $("#publicAlertMessage").textContent = alert.message;
    $("#publicAlertMeta").textContent = `Updated ${alert.updatedMinutes === 0 ? "just now" : `${alert.updatedMinutes} min ago`} · human-approved demo alert`;
    const viewButton = $("#publicAlertView");
    viewButton.dataset.openIncident = alert.incidentId;
    viewButton.hidden = !state.incidents.some(incident => incident.id === alert.incidentId);
  }

  function reportStage(incident) {
    if (incident.status === "resolved") return { step: 4, label: "Closed" };
    if (incident.resource) return { step: 3, label: "Response assigned" };
    if (incident.verification === "verified") return { step: 2, label: "Verified" };
    return { step: 1, label: "Awaiting verification" };
  }

  function statusStepsHTML(incident) {
    const current = reportStage(incident).step;
    return `<div class="status-steps"><span class="${current >= 1 ? "is-complete" : ""}"><i>${current >= 1 ? "✓" : "1"}</i>Received</span><span class="${current >= 2 ? "is-complete" : ""}"><i>${current >= 2 ? "✓" : "2"}</i>Verified</span><span class="${current >= 3 ? "is-complete" : ""}"><i>${current >= 3 ? "✓" : "3"}</i>Response assigned</span><span class="${current >= 4 ? "is-complete" : ""}"><i>${current >= 4 ? "✓" : "4"}</i>Closed</span></div>`;
  }

  function renderRecentReport() {
    const panel = $("#recentReportPanel");
    const incident = state.incidents.find(item => item.id === state.lastCitizenReportId);
    if (!incident) { panel.hidden = true; return; }
    const stage = reportStage(incident);
    panel.hidden = false;
    panel.innerHTML = `<span>${stage.step}/4</span><div><p class="eyebrow">Your recent report · ${esc(incident.id)}</p><h2>${esc(stage.label)}</h2><p>${esc(incident.title)} at ${esc(incident.location)} · updated ${esc(relativeTime(incident))}</p></div><button data-open-incident="${incident.id}">Track report</button>`;
  }

  function visibleMapItems() {
    const incidents = activeIncidents();
    if (currentMapFilter === "resources") return [];
    if (currentMapFilter === "blocked") return incidents.filter(item => item.blocked);
    if (currentMapFilter === "unverified") return incidents.filter(item => item.verification !== "verified");
    if (["critical", "high"].includes(currentMapFilter)) return incidents.filter(item => item.priority === currentMapFilter);
    return incidents;
  }

  function markerHTML(incident) {
    return `<button class="map-marker ${incident.verification !== "verified" ? "unverified" : ""}" style="left:${incident.x}%;top:${incident.y}%;--marker:${priorityColor[incident.priority]}" data-map-incident="${incident.id}" aria-label="${esc(incident.title)} at ${esc(incident.location)}"><span>${esc(symbols[incident.type] || "!")}</span></button>`;
  }

  function resourceMarkerHTML(resource) {
    return `<button class="resource-marker" style="left:${resource.x}%;top:${resource.y}%" data-resource-id="${resource.id}" aria-label="Available ${esc(resource.name)}"><span>${esc(resource.symbol)}</span></button>`;
  }

  function renderMap() {
    const showResources = ["all", "resources"].includes(currentMapFilter);
    const incidents = visibleMapItems();
    const resources = showResources ? state.resources.filter(item => item.state === "available") : [];
    $("#mapMarkers").innerHTML = incidents.map(markerHTML).join("") + resources.map(resourceMarkerHTML).join("");
    $("#roadBlocks").classList.toggle("is-hidden", !["all", "blocked"].includes(currentMapFilter));
  }

  function showMapCallout(id) {
    const incident = state.incidents.find(item => item.id === id);
    if (!incident) return;
    selectedIncidentId = id;
    $("#calloutMeta").textContent = `${label(incident.priority)} priority · ${relativeTime(incident)}`;
    $("#calloutTitle").textContent = incident.title;
    $("#calloutLocation").textContent = incident.location;
    $("#calloutBadges").innerHTML = badge(incident.priority) + badge(incident.verification);
    $("#mapCallout").hidden = false;
  }

  function renderIncidentList() {
    const list = activeIncidents().sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || a.updatedMinutes - b.updatedMinutes);
    $("#incidentCount").textContent = list.length;
    $("#incidentList").innerHTML = list.map(incident => `<button class="incident-card" data-open-incident="${incident.id}"><div class="incident-card-top"><div><h3>${esc(incident.title)}</h3><p>${esc(incident.location)}</p></div>${badge(incident.priority)}</div><div class="incident-card-bottom">${badge(incident.verification)}<time>${esc(relativeTime(incident))}</time></div></button>`).join("");
  }

  function renderHelpLocations() {
    $("#helpLocations").innerHTML = helpLocations.map(place => `<article class="location-card"><span>${place.icon}</span><h3>${esc(place.name)}</h3><p>${esc(place.address)}</p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.query)}" target="_blank" rel="noopener noreferrer">Open in Google Maps →</a></article>`).join("");
  }

  function openIncident(id) {
    const incident = state.incidents.find(item => item.id === id);
    if (!incident) return;
    selectedIncidentId = id;
    $("#drawerContent").innerHTML = `<div class="drawer-badges">${badge(incident.priority)}${badge(incident.verification)}</div><header class="drawer-header"><p class="eyebrow">${esc(incident.id)} · ${esc(incident.type)}</p><h2 id="drawerTitle">${esc(incident.title)}</h2><p>${esc(incident.location)} · updated ${esc(relativeTime(incident))}</p></header><section class="drawer-section"><h3>Report progress</h3>${statusStepsHTML(incident)}</section><section class="drawer-section"><h3>What is reported</h3><p>${esc(incident.description)}</p><div class="observed-grid"><span><strong>${incident.peopleAffected || "None reported"}</strong>People affected</span><span><strong>${incident.blocked ? "Blocked" : "No blockage reported"}</strong>Road access</span></div></section><section class="drawer-section"><h3>Verification and uncertainty</h3><p>${esc(incident.uncertainty)}</p></section><section class="drawer-section"><h3>Public response status</h3><p>${incident.resource ? `${esc(incident.resource)} is marked as assigned. Status: ${esc(label(incident.status))}.` : "No response resource is shown as assigned yet."}</p></section><section class="drawer-section"><p><strong>Prototype safety note:</strong> This information is simulated and does not guarantee that an area or route is safe.</p></section>`;
    $("#drawerBackdrop").hidden = false;
    $("#incidentDrawer").classList.add("is-open");
    $("#incidentDrawer").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#drawerClose").focus(), 30);
  }

  function closeDrawer() {
    $("#drawerBackdrop").hidden = true;
    $("#incidentDrawer").classList.remove("is-open");
    $("#incidentDrawer").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function analyseReport(formData) {
    const type = formData.get("type");
    const location = formData.get("location").trim();
    const peopleAffected = Number(formData.get("peopleAffected")) || 0;
    const injury = formData.get("injury") === "on" || type === "Injury";
    const blocked = formData.get("blocked") === "on" || type === "Road blocked";
    let score = 22;
    const reasons = [];
    if (type === "Fire") { score += 30; reasons.push("Active fire or smoke reported"); }
    if (injury) { score += 30; reasons.push("Medical help may be needed"); }
    if (blocked) { score += 18; reasons.push("Road access may be blocked"); }
    if (peopleAffected >= 20) { score += 18; reasons.push(`${peopleAffected} people reported affected`); }
    else if (peopleAffected > 0) { score += Math.min(12, 3 + peopleAffected); reasons.push(`${peopleAffected} people reported affected`); }
    const locationWords = location.toLowerCase().split(/\s+/).filter(word => word.length > 4);
    const nearby = activeIncidents().find(item => locationWords.some(word => item.location.toLowerCase().includes(word)));
    if (nearby) { score += 8; reasons.push(`Possible nearby match: ${nearby.id}`); }
    if (!reasons.length) reasons.push("Recent public report");
    score = Math.min(98, score);
    const priority = score >= 80 ? "critical" : score >= 58 ? "high" : score >= 36 ? "medium" : "low";
    return { type, location, peopleAffected, injury, blocked, nearby, score, priority, reasons };
  }

  function submitReport(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const analysis = analyseReport(formData);
    const positions = [[32, 68], [65, 32], [44, 75], [83, 37], [18, 71]];
    const fallbackPosition = positions[(state.nextId - 1051) % positions.length];
    const position = [Number(formData.get("mapX")) || fallbackPosition[0], Number(formData.get("mapY")) || fallbackPosition[1]];
    const id = `RR-${state.nextId++}`;
    const description = formData.get("description").trim() || `${analysis.type} reported by a citizen. Details await verification.`;
    state.incidents.push({ id, type: analysis.type, title: `${analysis.type} reported`, location: analysis.location, description, priority: analysis.priority, score: analysis.score, verification: "unverified", status: "new", updatedMinutes: 0, peopleAffected: analysis.peopleAffected, injury: analysis.injury, blocked: analysis.blocked, resource: null, x: position[0], y: position[1], latitude: formData.get("latitude") || null, longitude: formData.get("longitude") || null, reasons: analysis.reasons, uncertainty: analysis.nearby ? `Possible duplicate of ${analysis.nearby.id}; location and conditions need human review.` : "Single public report; location and conditions need human review.", verificationChecks: { location: false, source: false, freshness: false, duplicate: false }, verificationNote: "", timeline: [{ label: "Citizen report received", detail: "Just now" }, { label: "AI suggestion created", detail: `${label(analysis.priority)} · awaiting human review` }] });
    state.lastCitizenReportId = id;
    saveState();
    event.currentTarget.reset();
    $("#locationStatus").textContent = "Location is used only inside this browser demo.";
    $("#locationPicker").hidden = true;
    renderAll();
    navigate("situation");
    $("#confirmationReference").textContent = id;
    $("#reportConfirmationDialog").showModal();
  }

  function useCurrentLocation() {
    const status = $("#locationStatus");
    if (!navigator.geolocation) { status.textContent = "Location access is unavailable. Type a landmark or choose the demo map."; return; }
    status.textContent = "Requesting your device location…";
    navigator.geolocation.getCurrentPosition(position => {
      const latitude = position.coords.latitude.toFixed(5);
      const longitude = position.coords.longitude.toFixed(5);
      $("#reportLatitude").value = latitude;
      $("#reportLongitude").value = longitude;
      $("#reportLocation").value = `Current location (${latitude}, ${longitude})`;
      status.textContent = "Device location added. It remains inside this browser prototype.";
    }, () => { status.textContent = "Location permission was not available. Type a landmark or choose the demo map."; }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
  }

  function chooseDemoLocation(button) {
    $("#reportLocation").value = button.dataset.demoLocation;
    $("#reportMapX").value = button.dataset.x;
    $("#reportMapY").value = button.dataset.y;
    $("#locationStatus").textContent = `${button.dataset.demoLocation} selected on the illustrative map.`;
    $("#locationPicker").hidden = true;
    $("#reportLocation").focus();
  }

  function renderResponderMap() {
    const target = $("#responderMap");
    const map = $("#publicMap .city-map").cloneNode(true);
    map.removeAttribute("aria-label");
    map.setAttribute("aria-hidden", "true");
    target.innerHTML = "";
    target.append(map);
    const markers = document.createElement("div");
    markers.className = "map-markers";
    markers.innerHTML = activeIncidents().map(markerHTML).join("") + state.resources.filter(item => item.state === "available").map(resourceMarkerHTML).join("");
    target.append(markers);
    const note = document.createElement("p");
    note.className = "map-note";
    note.textContent = "Simulated positions and data";
    target.append(note);
  }

  function renderOverview() {
    renderStats();
    renderResponderMap();
    const top = [...activeIncidents()].sort((a, b) => b.score - a.score)[0];
    $("#aiFocus").innerHTML = `<p class="eyebrow">Top suggested priority</p><h2>${esc(top.title)}</h2><p>${esc(top.location)}</p><div class="focus-score"><span>${badge(top.priority)}</span><strong>${top.score}<small>/100</small></strong></div><div class="ai-reasons">${top.reasons.map(reason => `<span>${esc(reason)}</span>`).join("")}</div><p>${esc(top.uncertainty)}</p><button class="primary-button" data-review-incident="${top.id}">Review human decision →</button>`;
  }

  function renderQueue() {
    const filter = $("#queueFilter").value;
    const queue = [...activeIncidents()].filter(item => filter === "all" || item.priority === filter).sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || b.score - a.score);
    $("#priorityQueue").innerHTML = queue.map(incident => `<button class="priority-item ${selectedIncidentId === incident.id ? "is-selected" : ""}" style="--priority:${priorityColor[incident.priority]}" data-select-incident="${incident.id}"><div><h3>${esc(incident.title)}</h3><p>${esc(incident.location)}</p><div class="priority-reasons">${incident.reasons.slice(0, 3).map(reason => `<span>${esc(reason)}</span>`).join("")}</div></div><div class="priority-meta">${badge(incident.priority)}${badge(incident.verification)}<time>${esc(relativeTime(incident))}</time></div></button>`).join("");
    if (selectedIncidentId && state.incidents.some(item => item.id === selectedIncidentId)) renderDecisionPanel(selectedIncidentId);
  }

  function resourceRecommendations(incident) {
    const needs = incident.type === "Fire" ? ["fire"] : incident.injury || incident.type === "Injury" ? ["ambulance", "medical"] : incident.blocked || ["Waterlogging", "Road blocked"].includes(incident.type) ? ["rescue", "road"] : ["rescue", "medical"];
    return state.resources.map(resource => {
      const kind = resource.kind.toLowerCase();
      const capabilityMatch = needs.some(need => kind.includes(need));
      const distance = Math.max(1, Math.round(Math.hypot(resource.x - incident.x, resource.y - incident.y) * .16));
      const eta = Math.max(4, Math.round(distance * 1.8 + 3));
      const available = resource.state === "available" || resource.name === incident.resource;
      const score = (capabilityMatch ? 60 : 22) + (available ? 25 : 0) + Math.max(0, 15 - distance);
      return { ...resource, capabilityMatch, distance, eta, available, score, fit: capabilityMatch ? "Capability match" : "Supporting option" };
    }).sort((a, b) => b.score - a.score);
  }

  function renderDecisionPanel(id) {
    const incident = state.incidents.find(item => item.id === id);
    if (!incident) return;
    selectedIncidentId = id;
    const checks = incident.verificationChecks || { location: false, source: false, freshness: false, duplicate: false };
    const recommendations = resourceRecommendations(incident);
    $("#decisionPanel").innerHTML = `<div class="decision-top"><div><div class="drawer-badges">${badge(incident.priority)}${badge(incident.verification)}</div><h2>${esc(incident.title)}</h2><p>${esc(incident.location)} · ${esc(relativeTime(incident))}</p></div><div class="score-ring" style="--score:${incident.score}"><strong>${incident.score}</strong></div></div><section class="decision-section"><h3>Observed information</h3><div class="observed-grid"><span><strong>${incident.peopleAffected || "0"}</strong>People reported affected</span><span><strong>${incident.injury ? "Yes" : "Not reported"}</strong>Medical need</span><span><strong>${incident.blocked ? "Blocked" : "Open / unknown"}</strong>Road access</span><span><strong>${label(incident.verification)}</strong>Verification</span></div></section><section class="decision-section"><h3>Why AI suggests ${esc(incident.priority)} priority</h3><div class="reason-list">${incident.reasons.map(reason => `<span>${esc(reason)}</span>`).join("")}</div><p class="uncertainty"><strong>Uncertainty:</strong> ${esc(incident.uncertainty)}</p></section><section class="decision-section"><h3>Verification checklist</h3><div class="verification-checklist"><label><input id="verifyLocation" type="checkbox" ${checks.location ? "checked" : ""}>Location or map pin checked</label><label><input id="verifySource" type="checkbox" ${checks.source ? "checked" : ""}>Supporting source or field report reviewed</label><label><input id="verifyFreshness" type="checkbox" ${checks.freshness ? "checked" : ""}>Freshness and changing conditions checked</label><label><input id="verifyDuplicate" type="checkbox" ${checks.duplicate ? "checked" : ""}>Possible duplicate or conflicting report reviewed</label></div><label class="verification-note">Verification note<textarea id="verificationNote" rows="2" placeholder="Briefly record how the report was checked">${esc(incident.verificationNote || "")}</textarea></label></section><section class="decision-section"><span class="recommendation-tag">Suggested resource match</span><h3>Choose response resource</h3><div class="resource-recommendations">${recommendations.map((resource, index) => `<label class="resource-option ${index === 0 && resource.available ? "is-best" : ""} ${!resource.available ? "is-unavailable" : ""}"><input type="radio" name="decisionResource" value="${esc(resource.name)}" ${(incident.resource === resource.name || (!incident.resource && index === 0 && resource.available)) ? "checked" : ""} ${!resource.available ? "disabled" : ""}><span><strong>${esc(resource.name)}</strong><small>${esc(resource.kind)} · ${resource.distance} km away · ${esc(resource.fit)}</small></span><em>${resource.available ? `${resource.eta} min ETA` : "Assigned"}</em></label>`).join("")}</div></section><section class="decision-section"><h3>Response decision</h3><div class="decision-controls"><label>Response status<select id="decisionStatus"><option value="new" ${incident.status === "new" ? "selected" : ""}>New</option><option value="responding" ${incident.status === "responding" ? "selected" : ""}>Responding</option><option value="monitoring" ${incident.status === "monitoring" ? "selected" : ""}>Monitoring</option><option value="resolved" ${incident.status === "resolved" ? "selected" : ""}>Resolved</option></select></label></div><div class="decision-actions"><button class="secondary-button" id="saveDecisionButton">Save review</button><button class="primary-button" id="verifyDispatchButton">Verify & dispatch</button></div></section><section class="decision-section"><h3>Decision timeline</h3><ol class="timeline">${incident.timeline.slice().reverse().map(event => `<li><strong>${esc(event.label)}</strong>${esc(event.detail)}</li>`).join("")}</ol></section>`;
    $$(".priority-item").forEach(item => item.classList.toggle("is-selected", item.dataset.selectIncident === id));
  }

  function saveDecision(verify) {
    const incident = state.incidents.find(item => item.id === selectedIncidentId);
    if (!incident) return;
    const previousResource = incident.resource;
    const checks = { location: $("#verifyLocation").checked, source: $("#verifySource").checked, freshness: $("#verifyFreshness").checked, duplicate: $("#verifyDuplicate").checked };
    const verificationNote = $("#verificationNote").value.trim();
    const selectedResource = $('input[name="decisionResource"]:checked');
    const resource = selectedResource?.value || null;
    if (verify && (!Object.values(checks).every(Boolean) || !verificationNote)) {
      toast("Verification is incomplete", "Complete all four checks and add a short verification note before dispatching.");
      return;
    }
    if (verify && !resource) {
      toast("Choose a response resource", "Review the suggested match and select an available resource before dispatching.");
      return;
    }
    incident.verificationChecks = checks;
    incident.verificationNote = verificationNote;
    incident.resource = resource;
    incident.status = $("#decisionStatus").value;
    if (verify) { incident.verification = "verified"; if (incident.status === "new" && resource) incident.status = "responding"; }
    incident.updatedMinutes = 0;
    state.resources.forEach(item => {
      if (item.name === previousResource && item.name !== resource) item.state = "available";
      if (item.name === resource) item.state = "assigned";
    });
    incident.timeline.push({ label: verify ? "Coordinator verified response" : "Verification review saved", detail: `${resource ? `${resource} · ` : ""}just now` });
    saveState();
    renderAll();
    renderDecisionPanel(incident.id);
    toast(verify ? "Human decision confirmed" : "Response updated", `${incident.id} · ${resource || "no resource assigned"}`);
  }

  function renderResources() {
    const available = state.resources.filter(resource => resource.state === "available");
    $("#availableResourceCount").textContent = `${available.length} available`;
    $("#resourceList").innerHTML = state.resources.map(resource => `<article class="resource-item"><span class="resource-symbol">${esc(resource.symbol)}</span><div><strong>${esc(resource.name)}</strong><small>${esc(resource.kind)} · ${esc(resource.location)}</small></div><span class="resource-state ${resource.state}">${esc(label(resource.state))}</span></article>`).join("");
    const incidents = activeIncidents();
    $("#broadcastIncident").innerHTML = `<option value="">Select incident</option>${incidents.map(item => `<option value="${item.id}">${esc(item.id)} · ${esc(item.title)}</option>`).join("")}`;
  }

  function prepareBroadcast() {
    const incident = state.incidents.find(item => item.id === $("#broadcastIncident").value);
    broadcastPreviewReady = false;
    $("#publishBroadcastButton").disabled = true;
    $("#broadcastPreview").innerHTML = `<small>Public alert preview</small><p>Select an incident to prepare an update.</p>`;
    if (!incident) { $("#broadcastMessage").value = ""; return; }
    $("#broadcastMessage").value = `${incident.title} near ${incident.location}. ${incident.blocked ? "Avoid the affected road and follow official directions." : "Please keep clear and follow official directions."} Updated ${relativeTime(incident)}.`;
  }

  function previewBroadcast() {
    const message = $("#broadcastMessage").value.trim();
    if (!message) { toast("Choose an incident first", "A clear public update needs an incident and message."); return; }
    $("#broadcastPreview").innerHTML = `<small>Public alert preview · Not sent</small><p>${esc(message)}</p>`;
    broadcastPreviewReady = true;
    $("#publishBroadcastButton").disabled = false;
    toast("Demo alert prepared", "Review the message, then approve it for the simulated citizen feed.");
  }

  function publishBroadcast() {
    const incident = state.incidents.find(item => item.id === $("#broadcastIncident").value);
    const message = $("#broadcastMessage").value.trim();
    if (!broadcastPreviewReady || !incident || !message) { toast("Preview the alert first", "Human review is required before the demo feed can be updated."); return; }
    state.publicAlerts.unshift({ id: `ALERT-${Date.now()}`, incidentId: incident.id, message, updatedMinutes: 0, approvedBy: "RR-DEMO-01" });
    incident.timeline.push({ label: "Public demo alert approved", detail: "Citizen situation feed · just now" });
    saveState();
    renderPublicAlert();
    broadcastPreviewReady = false;
    $("#publishBroadcastButton").disabled = true;
    $("#broadcastPreview").innerHTML = `<small>Published to demo feed</small><p>${esc(message)}</p>`;
    toast("Citizen demo feed updated", "The approved message now appears on the public situation screen. No real alert was sent.");
  }

  function resetDemo() {
    state = defaultState();
    selectedIncidentId = null;
    saveState();
    renderAll();
    renderOverview();
    toast("Demo restored", "The original incident and resource scenario is ready.");
  }

  function toast(title, detail) {
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = `<strong>${esc(title)}</strong><p>${esc(detail)}</p>`;
    $("#toastRegion").append(node);
    setTimeout(() => node.remove(), 5200);
  }

  function renderAll() {
    renderStats();
    renderPublicAlert();
    renderRecentReport();
    renderMap();
    renderIncidentList();
    renderHelpLocations();
    if (role === "responder") { renderQueue(); renderResources(); }
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const nav = event.target.closest("[data-view]");
      const go = event.target.closest("[data-go-view]");
      const opener = event.target.closest("[data-open-incident]");
      const marker = event.target.closest("[data-map-incident]");
      const resource = event.target.closest("[data-resource-id]");
      const selector = event.target.closest("[data-select-incident]");
      const review = event.target.closest("[data-review-incident]");
      const demoLocation = event.target.closest("[data-demo-location]");
      if (nav) navigate(nav.dataset.view);
      if (go) { event.preventDefault(); navigate(go.dataset.goView); }
      if (opener) openIncident(opener.dataset.openIncident);
      if (marker) showMapCallout(marker.dataset.mapIncident);
      if (resource) {
        const item = state.resources.find(entry => entry.id === resource.dataset.resourceId);
        if (item) toast("Available response resource", `${item.name} · ${item.location}`);
      }
      if (selector) renderDecisionPanel(selector.dataset.selectIncident);
      if (review) { navigate("queue"); setTimeout(() => renderDecisionPanel(review.dataset.reviewIncident), 0); }
      if (demoLocation) chooseDemoLocation(demoLocation);
      if (event.target.id === "saveDecisionButton") saveDecision(false);
      if (event.target.id === "verifyDispatchButton") saveDecision(true);
    });
    $$("[data-map-filter]").forEach(button => button.addEventListener("click", () => {
      currentMapFilter = button.dataset.mapFilter;
      $$("[data-map-filter]").forEach(item => item.classList.toggle("is-active", item === button));
      $("#mapCallout").hidden = true;
      renderMap();
    }));
    $("#calloutDetails").addEventListener("click", () => openIncident(selectedIncidentId));
    $(".callout-close").addEventListener("click", () => { $("#mapCallout").hidden = true; });
    $("#drawerClose").addEventListener("click", closeDrawer);
    $("#drawerBackdrop").addEventListener("click", closeDrawer);
    $("#incidentForm").addEventListener("submit", submitReport);
    $("#useLocationButton").addEventListener("click", useCurrentLocation);
    $("#choosePinButton").addEventListener("click", () => { $("#locationPicker").hidden = !$("#locationPicker").hidden; });
    $("#confirmationClose").addEventListener("click", () => $("#reportConfirmationDialog").close());
    $("#trackReportButton").addEventListener("click", () => { $("#reportConfirmationDialog").close(); navigate("situation"); setTimeout(() => $("#recentReportPanel").scrollIntoView({ behavior: "smooth", block: "center" }), 0); });
    $("#responderLoginButton").addEventListener("click", () => $("#loginDialog").showModal());
    $("#loginClose").addEventListener("click", () => $("#loginDialog").close());
    $("#loginDialog").addEventListener("click", event => { if (event.target === $("#loginDialog")) $("#loginDialog").close(); });
    $("#loginForm").addEventListener("submit", event => { event.preventDefault(); $("#loginDialog").close(); setRole("responder"); toast("Responder demo opened", "Actions remain simulated until a secure backend is connected."); });
    $("#signOutButton").addEventListener("click", () => { setRole("citizen"); toast("Signed out", "Public citizen access remains available without an account."); });
    $("#queueFilter").addEventListener("change", renderQueue);
    $("#broadcastIncident").addEventListener("change", prepareBroadcast);
    $("#previewBroadcastButton").addEventListener("click", previewBroadcast);
    $("#publishBroadcastButton").addEventListener("click", publishBroadcast);
    $("#broadcastMessage").addEventListener("input", () => { broadcastPreviewReady = false; $("#publishBroadcastButton").disabled = true; });
    $("#resetDemoButton").addEventListener("click", resetDemo);
    document.addEventListener("keydown", event => { if (event.key === "Escape" && $("#incidentDrawer").classList.contains("is-open")) closeDrawer(); });
  }

  bindEvents();
  renderAll();
})();
