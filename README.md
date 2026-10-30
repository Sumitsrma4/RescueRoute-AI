# RescueRoute AI

A focused frontend prototype for Ideathon 2026. RescueRoute turns scattered disaster reports into a shared operational picture and a human-reviewed response workflow.

## Live prototype

**[Open RescueRoute AI](https://rescueroute-ai-prototype.sumit158845.chatgpt.site)**

All incidents, AI suggestions, resources, updates and response actions are simulated. The prototype does not contact emergency services, perform dispatch or guarantee route safety.

## Core workflow

**Report → Analyse → Verify → Dispatch → Update**

1. A citizen opens the public site without signing in.
2. They see reported incidents, road blocks and available resources on one map.
3. A compact report asks only what happened, where it happened and how many people are affected, with optional device location or an illustrative map pin.
4. Transparent frontend rules suggest a priority and show the reasons and uncertainty.
5. The citizen receives a reference number and can track the report without creating an account.
6. An authorised responder signs into a separate demo portal, completes a verification checklist, reviews a resource recommendation and dispatches a resource.
7. A human-approved demo alert and the reviewed incident status return to the public situation view.

## Essential features

### Citizen access

- Immediate access with no citizen login or role-selection gate
- Simple pill navigation: Situation, Report and Get help
- Less text-heavy situation screen with a prominent public alert
- Illustrative live incident map with critical, high, unverified, response-resource and blocked-road layers
- Compact three-question incident report
- Optional device location or illustrative map pin
- Report acknowledgement, reference number and four-stage status tracking
- Official emergency call links for 112 and 108
- Verified Bengaluru hospital locations with Google Maps links
- Clear freshness, verification and simulation labels

### Responder access

- Separate demo sign-in for authorised response users
- Disaster situation overview with map-linked AI priority snapshot
- Smart response queue with explainable ranking and uncertainty
- Required human verification checklist and verification note
- Ranked resource recommendations with simulated distance, ETA and capability fit
- Human verification, resource assignment and status update controls
- Response resource dashboard
- Public-alert preview and human-approved publication to the simulated citizen feed
- Decision timeline for accountability

## Why this scope

| Problem | Prototype response |
| --- | --- |
| Information is scattered | A shared incident map and structured public reporting |
| Conditions change quickly | Freshness labels, road-block layers and response status |
| Reports may be incomplete or conflicting | Unverified states, duplicate hints, uncertainty and human review |
| Responders must decide where help is most urgent | Explainable priority suggestions linked to people, danger and access |
| Coordination requires shared updates | Resource assignment, status tracking and public-alert preview |

The scope deliberately excludes citizen accounts, a large shelter catalogue, duplicated dashboards and automatic AI dispatch. Temporary shelters should appear only after confirmation by the responsible authority.

## Demo responder access

- Responder ID: `RR-DEMO-01`
- Password: `demo`

This is a frontend demonstration, not secure production authentication.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Browser `localStorage` for demo continuity

There is no framework, build step, backend or real AI service.

## Run locally

From the repository root:

```powershell
python -m http.server 4173 --directory dist
```

Open `http://127.0.0.1:4173`.

## Suggested walkthrough

1. Open the public situation view and show the map layers.
2. Submit a three-question incident report.
3. Show that it appears as unverified with a simulated priority suggestion.
4. Use **Responder sign in** and open the response queue.
5. Review the reasons and uncertainty, then verify and assign a resource.
6. Return to the public view to show the updated incident status.

## Project structure

```text
RescueRoute-AI-Prototype/
├── dist/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── README.md
```

## Production requirements

A real deployment would require secure identity and role management, a shared backend and database, audited AI services, verified live-data integrations, official map and routing services, alert delivery infrastructure, privacy and security controls, and authority-managed shelter data.
