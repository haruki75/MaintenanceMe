# MaintenanceMe

Web app to schedule software maintenance tasks with:
- monthly calendar;
- `weekday`, `weekend`, and `holiday` distinction (Italian national holidays);
- technicians management and assignment to tasks;
- third-party office tickets (`SAAS`, `DSO`, `DEV`);
- downtime type (`Backend only` or `Total`);
- task templates (including `Oracle DB SAAS`);
- Jira support links per selected third-party office ticket;
- task extraction filters (`from/to`, `day type`, and `quarter`).

## Run locally

Since this is a static web app, you can open `index.html` directly in your browser.

For local development with a server:

```bash
python3 -m http.server 8080
```

then open `http://localhost:8080`.

## Deploy to GitHub Pages

1. Push files to the `main` branch.
2. In GitHub: `Settings` -> `Pages`.
3. In `Build and deployment`, select:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main` and folder `/ (root)`
4. Save: GitHub will publish the site with a Pages URL.

## MVP notes

- Data is stored in browser `localStorage`.
- Saved data is tied to the same browser/profile and site origin (for example `localhost` and GitHub Pages do not share data).
- Movable holidays included: Easter and Easter Monday.
- Tasks can still be scheduled on holidays and weekends.
