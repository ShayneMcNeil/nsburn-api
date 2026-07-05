# Nova Scotia Burn Restrictions API (`nsburn-api`)

A lightweight API proxy and scraper that tracks daily open fires and burn restrictions for all counties in Nova Scotia.

The project scrapes data daily from the [Nova Scotia BurnSafe map](https://novascotia.ca/burnsafe/) and exposes it as a clean JSON endpoint deployed on **Render**.

> [!IMPORTANT]
> **Scraping Disclaimer**: This project is configured to query the official government website on a controlled, daily schedule via GitHub Actions. Please do not modify the code to run scraping processes on every API request. Over-scraping public government resources is unnecessary, wastes public bandwidth, and risks getting your server's IP address blacklisted. The existing workflow handles scraping requirements safely and efficiently.
> 
> *Note: If the scrape stops working due to a change in the structure of the government's site or how they serve their webpage, please open an issue or contact me so I can update the source code.*

---

## How It Works

```mermaid
graph TD
    A[NS BurnSafe Website] -->|Scraped daily| B[GitHub Actions]
    B -->|Commits fresh data| C[(GitHub repo: data.json)]
    D[Render Server] -->|Fetches latest Commit SHA| E[GitHub info/refs]
    D -->|Requests JSON via Commit SHA| C
    F[User / Client] -->|GET /api/restrictions| D
```

1. **Daily Scrape**: An external scheduler (e.g., cron-job.org) triggers the GitHub Actions workflow twice every day (from March 15 to October 15) at **8:15 AM Atlantic Time** and **2:15 PM Atlantic Time** to execute [scraper.js](scraper.js). This schedule runs slightly after the government's updates to allow for any publishing delays on their end. It parses the Nova Scotia BurnSafe table and updates [data.json](data.json) in this repository.
2. **Dynamic Serving**: The API is hosted on Render ([server.js](server.js)). When someone calls the API, the server:
   - Resolves the latest commit SHA from GitHub.
   - Fetches the file contents dynamically using the unique commit SHA URL to bypass GitHub's aggressive 5-minute CDN caching.
3. **No Downtime/Overhead**: Render is configured to ignore `.github` and `data.json` paths so it doesn't rebuild the server on every daily update.

---

## API Endpoints

### `GET /`
Returns a responsive dashboard showing the operational state, the last scraped date/time, and basic information on how the API works, including a link to the GitHub repository.

### `GET /api/restrictions`
Fetches the current cached burn restrictions for all counties in Nova Scotia (updated daily).

### `GET /api/restrictions/latest`
Triggers an on-demand, live scrape of the government website outside the daily scheduled run and returns the fresh data immediately.
* **Rate Limiting**: To prevent abuse and protect the government website, this endpoint is rate-limited to **2 requests per hour per user (IP)**. If the limit is exceeded, it returns a `429 Too Many Requests` status code.
* **Server-Side Cache**: To protect the government's server from excessive load, the server caches the scraped data in memory for **30 minutes**. If another request comes in within 30 minutes of a successful scrape, they will receive the cached result instantly without hitting the government's website.

**Example Response:**
```json
{
  "dateTimeScrapedUTC": "2026-07-04T02:53:34.347Z",
  "data": [
    {
      "county": "Annapolis County",
      "color-status": "Yellow",
      "restriction-level": "Burning is only allowed between 7:00 pm and 8:00 am (burning is not allowed before 7:00 pm)"
    },
    ...
  ]
}
```

---

## Getting Started (Local Development)

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/ShayneMcNeil/nsburn-api.git
   cd nsburn-api
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the API Server
Start the local Express server:
```bash
node server.js
```
The server will be running on `http://localhost:3000`. You can test it by going to `http://localhost:3000/` in your browser.

### Database Setup (Optional)
By default, the server uses a built-in **in-memory rate limiter** for `/api/restrictions/latest`. However, if you want rate limits to persist across server restarts and spin-downs (like on Render's Free tier), you can connect a PostgreSQL database (e.g. from Supabase or Render):

1. Set the `DATABASE_URL` environment variable on your server (e.g., `postgres://user:password@host:port/dbname`).
2. When the server starts, it will **automatically detect the database, create the `rate_limits` table, set up index lookups, and switch to database rate limiting**.
3. If the database goes down or is not provided, the server automatically falls back to the in-memory rate limiter safely without crashing.

#### Database Pruning Logic
To keep database storage at virtually zero and prevent database bloating, the server automatically **deletes all request records older than 1 hour** every time a new live scrape request is received. Therefore, the database table will only contain logs of requests made in the last 60 minutes.

#### How to Inspect Records Visually (TablePlus)
If you are hosting your own database and want to view the logged rate limits:
1. Download and install [TablePlus](https://tableplus.com/).
2. Copy the **External Connection String** from your database provider (Render, Supabase, etc.).
3. Open TablePlus, click **Create a new connection**, select **Import from URL**, paste the connection string, and connect.
4. Click on the `rate_limits` table. You will see a list of IP addresses and timestamps representing active rate-limit buckets from the last hour.

#### Deployed Server Limits (Render Free Tier)
If you host this API on Render's Free Tier:
* **750 Free Hours**: Render gives free accounts 750 free instance hours per month, shared across all free services. A single web service running 24/7 uses ~744 hours, fitting completely inside this limit.
* **Inactivity Spin-down**: Free services spin down (go to sleep) after 15 minutes of inactivity. When asleep, it uses 0 instance hours. A request wakes it up, taking ~50 seconds.
* **Keeping it awake**: You can keep the server awake 24/7 (avoiding the 50-second wake-up lag) by setting up an external pinging service (like cron-job.org) to ping your server's root URL `/` every 14 minutes.
* **Important**: If you run *multiple* free web services on the same Render account and keep them all awake 24/7, they will quickly consume the 750-hour limit and get suspended. Keep only one service permanently awake.

---

## CLI Tool

A simple CLI utility ([cli.js](cli.js)) is included to display the current burn restrictions directly in your terminal in a clean table format.

### Run against the local server (default):
```bash
npm run cli
```

### Run against your deployed Render endpoint:
Pass your deployed API URL as an argument to the CLI:
```bash
node cli.js https://your-render-app.onrender.com/api/restrictions
```

---

## Testing

An integration test suite ([test.js](test.js)) is included to verify that the scraper and API endpoint function correctly.

### Run tests locally:
```bash
npm test
```
This command will start the local server in the background, fetch the restrictions endpoint, read the local `data.json`, and assert that the structure is valid.

### Run tests against your deployed Render endpoint:
You can pass a `RENDER_URL` environment variable to test the live deployed API:
* **PowerShell**:
  ```powershell
  $env:RENDER_URL="https://your-render-app.onrender.com"; npm test
  ```
* **Bash**:
  ```bash
  RENDER_URL="https://your-render-app.onrender.com" npm test
  ```

### CI/CD Workflow
The project runs a GitHub Actions workflow (`CI Test Suite` inside [.github/workflows/test.yml](.github/workflows/test.yml)) on every push to `main` (excluding data-only updates). This CI/CD suite automatically:
1. Waits for 1 minute to allow the Render server to finish deploying the new server code.
2. Triggers a new scrape run by invoking the `scrape.yml` workflow via GitHub CLI and watches it until it completes successfully.
3. Pulls down the newly committed `data.json` from the repository.
4. Executes the integration tests using the `RENDER_URL` secret/variable to call `/api/restrictions` on the deployed Render instance, asserting that the served API response matches the freshly committed `data.json` exactly.
