# Loop — Production scrap log

A mobile-first, dependency-free web app for logging production scrap and prioritizing improvements. All sample data is fictional.

## Run

Open [index.html](./index.html) in a modern browser, or serve this folder:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Visit http://127.0.0.1:8080. No build or package installation is required. Fonts use Google Fonts with system fallbacks; the app otherwise works without external services.

## Features

- Date, production line (L1–L3), defect type, whole-piece quantity, and optional note.
- Twelve sample entries initialized once, dated across the seven days ending on the first visit.
- Local-device persistence using browser localStorage. No data is sent to a server. Keep using the same browser and origin to retain entries; use CSV export for backups. Storage failures are reported without claiming an entry was saved.
- Line and period filters apply to all metrics, Pareto analysis, history, and CSV exports.
- Descending defect bars and a cumulative percentage line, with an accessible textual chart description. Ties follow the defect selector order.
- Plastic impact: 0.12 kg/piece. Machine energy: 0.35 kWh/piece.
- The unfiltered sample totals are **352 pieces**, **42.24 kg**, and **123.2 kWh**. **Scratch** is the first priority: **140 pieces (39.8%)**.

The default rolling window includes today and the previous six local calendar days. Sample data is not regenerated on reload or as it ages out of that window; choose **All time** to see older data. Future dates, fractional quantities, and quantities above 1,000,000 are not accepted.

## Validate

With Node.js installed:

```sh
node --test app.test.js
node --check app.js
```
