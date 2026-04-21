<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Curator React/Vite frontend. PostHog is initialized in `src/main.jsx` using the `posthog-js` browser SDK with exception autocapture enabled. Event tracking was added across three key files covering the full user journey: from landing page CTA clicks, through search submission and completion, to video engagement and navigation.

| Event | Description | File |
|---|---|---|
| `search_submitted` | User submits a video search with topic, level, language, and duration filters | `src/App.jsx` |
| `search_completed` | Search API returns results successfully; includes result count | `src/App.jsx` |
| `search_failed` | Search API call throws an error; includes error message | `src/App.jsx` |
| `video_watch_opened` | User opens the in-app watch dialog for a video result | `src/pages/ResultsPage.jsx` |
| `video_opened_in_youtube` | User clicks 'Open in YouTube' to view a video externally | `src/pages/ResultsPage.jsx` |
| `new_search_clicked` | User navigates back from results to start a new search | `src/pages/ResultsPage.jsx` |
| `cta_clicked` | User clicks a hero or section CTA button to scroll to the search form | `src/pages/HomePage.jsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/166303/dashboard/1475013
- **Search → Complete → Watch funnel**: https://us.posthog.com/project/166303/insights/o6BFMHUn
- **Daily search volume**: https://us.posthog.com/project/166303/insights/V3lsqeDv
- **Top search topics**: https://us.posthog.com/project/166303/insights/zwNsOCTJ
- **Video engagement: Watch vs Open in YouTube**: https://us.posthog.com/project/166303/insights/iQIEe32s
- **Search failures over time**: https://us.posthog.com/project/166303/insights/k0dgrgD6

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
