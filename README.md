# RescueRoute AI

An early working frontend prototype for Ideathon 2026 that demonstrates how scattered disaster reports can become a clearer operational picture and a coordinated, human-reviewed response.

The initial use case is Bengaluru, but the workflow is designed to support waterlogging, fallen trees, fires, lightning injuries, road accidents and other large-scale emergencies.

## Live prototype

**[Open the hosted RescueRoute AI prototype](https://rescueroute-ai-prototype.sumit158845.chatgpt.site)**

The hosted version is public and uses simulated data. It does not connect to emergency services or provide real route-safety guarantees.

## Prime-question workflow

The prototype focuses on one connected decision loop:

**Collect → Verify → Prioritise → Coordinate → Update**

1. Citizens or field sources submit structured incident reports.
2. The system checks report completeness, possible duplicates, conflicts and freshness.
3. It suggests an urgency level and shows the factors behind that suggestion.
4. A human coordinator verifies the information, assigns a response resource and updates the incident.
5. The reviewed status returns to the shared operational picture.

## Problems addressed

| Disaster-management problem | Prototype response |
| --- | --- |
| Information is scattered across citizens, responders and authorities | Unified situation map, incident list and structured reporting |
| Road and affected-area information changes quickly | Freshness timestamps, verification states and route-risk warnings |
| Reports can be incomplete, duplicated or contradictory | Transparent duplicate, uncertainty and missing-information indicators |
| Responders need to understand where help is most urgent | Explainable priority queue based on danger, medical need, people affected and access disruption |
| Communication infrastructure may be unreliable | Browser-local offline queue with simulated synchronisation after reconnection |

## Main features

- Illustrative Bengaluru incident map with priority and verification markers
- Searchable and filterable live incident list
- Mobile-friendly citizen and field reporting form
- Simulated report analysis using transparent JavaScript rules
- Explainable critical, high, medium and low priority suggestions
- Verification, freshness and uncertainty indicators
- Human-reviewed coordinator queue
- Resource assignment and response-status controls
- Incident history and accountability timeline
- Route-risk warning and alternative-route demonstration
- Offline report queue and reconnection simulation
- Built-in five-minute demonstration guide
- Responsive desktop and mobile interface

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Browser `localStorage`

No framework, build step, backend or database is required for this early prototype.

## Run locally

### Quick option

Open `dist/index.html` in a modern browser.

### Local server option

From the repository root, run:

```powershell
python -m http.server 4173 --directory dist
```

Then open `http://127.0.0.1:4173`.

The prototype stores reports and coordinator updates in browser `localStorage`. Use **Reset demo data** in the Coordination view to restore the original scenario.

## Recommended team walkthrough

1. Start on **Situation** and explain the unified operational picture.
2. Open an incident and show verification, freshness and priority reasons.
3. Submit a waterlogging report with access disruption selected.
4. Review the generated suggestion in **Coordination**.
5. Verify the report, assign a resource and update its response status.
6. Return to **Situation** and demonstrate the route-risk warning.
7. Toggle **Offline**, submit another report and reconnect to show synchronisation.

## Project structure

```text
RescueRoute-AI-Prototype/
├── dist/
│   ├── index.html   # Application structure and accessible interface
│   ├── styles.css   # Responsive visual design
│   └── app.js       # Demo data, analysis rules and interactions
└── README.md
```

## Safety and prototype limitations

- All incident, resource, route and analysis data is simulated.
- The map is illustrative and is not a live geographic service.
- The early "AI-assisted" behaviour is represented by transparent JavaScript rules.
- Unusual reports are never automatically labelled fake.
- A route recommendation does not guarantee that a route is safe.
- The prototype does not contact emergency services or perform real dispatch.
- A production version would require a backend, authentication, shared storage, live data integrations, real routing and audited AI services.
