# Waterwise

A mobile-first fictional water meter log built with HTML, CSS, and JavaScript. No build step or JavaScript dependencies.

## Run

```sh
npm start
```

Open http://127.0.0.1:8000. Requires Python 3. Run the calculation tests with `npm test` (Node.js 18+).

## Behavior

- Starts at **10,520 m³** before day 1 (Monday) and preloads daily use of **40, 42, 38, 41, 44, 10, 9, 41, 95, 43, 39, 42, 11, 8 m³**.
- Day 14 ends at **11,023 m³**: **503 m³** total, **35.9 m³/day**, and **RM 1,493.91** at the teaching rate of **RM 2.97/m³**. Not an actual billing estimate or tariff.
- From day 8, flags daily use strictly greater than 1.5 times the average of the preceding seven days, excluding the current day. Day 9 is flagged in the starter data.
- Add cumulative readings, not daily consumption. Equal readings are allowed (zero use); decreases are rejected. Readings accept two decimal places.
- Each added reading advances one fictional day, rather than using calendar dates. This keeps the Monday-based teaching dataset consistent and permits simulating multiple days.
- Readings are stored in this browser's local storage. Storage failures show a warning and allow use for the current visit. Clearing the site's storage restores the starter data.
- The chart's accessible description and reading history provide the numeric data without relying on color alone.

Google Fonts are an optional visual enhancement; system sans-serif fonts are used if unavailable.
