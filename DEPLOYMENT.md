# Deployment

- **Platform:** OpenAI Sites static hosting
- **Production URL:** https://rescueroute-ai-prototype.sumit158845.chatgpt.site
- **Published source:** `dist/`
- **Current release:** Sites version 1

## Release check

1. Confirm `dist/index.html`, `dist/styles.css` and `dist/app.js` are present.
2. Run `node --check dist/app.js`.
3. Open the production URL and confirm the Situation view loads with four simulated incidents.
4. Submit a test report, verify it in Coordination, and reset the demo data.

## Health signal

The production URL should load the page title **RescueRoute AI Prototype** and the Situation, Report incident and Coordination navigation items. A failed Sites deployment or missing static asset is a release failure.

## Rollback

Redeploy the previous saved Sites version if a future release fails its browser checks. The GitHub `main` branch remains the source of truth for application code.
