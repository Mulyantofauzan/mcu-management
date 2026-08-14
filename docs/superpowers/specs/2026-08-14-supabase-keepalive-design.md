# Supabase Keep-Alive Worker Design

Date: 2026-08-14
Status: Approved

## Goal

Reduce the chance that the MADIS Supabase Free project is automatically paused during periods of low user activity by issuing a small, read-only database request several times each day.

This is a best-effort safeguard. Supabase only guarantees that paid projects will not be paused.

## Constraints

- The solution must remain completely free.
- It must not change or manufacture medical data.
- It must not weaken Supabase Row Level Security.
- Secrets must not be committed to Git or exposed to the browser.
- It must not add another Vercel Function because MADIS is close to the Vercel Hobby function limit.
- The existing root `wrangler.toml` must remain untouched because it describes a separate legacy deployment.

## Architecture

Create a dedicated Cloudflare Worker under `workers/supabase-keepalive/` with its own Wrangler configuration.

The Worker exposes only a `scheduled()` handler. It does not expose a public `fetch()` endpoint.

Every scheduled invocation sends one read-only request to Supabase PostgREST:

```sql
SELECT setting_key FROM public.app_settings LIMIT 1;
```

The equivalent REST request selects only `setting_key` and limits the result to one row. The response data is discarded.

`app_settings` is intentionally inaccessible to `anon` and `authenticated`, so the Worker uses the existing service-role access model. The service-role key is stored only as an encrypted Cloudflare Worker secret.

## Schedule

Use the UTC cron expression:

```text
17 */6 * * *
```

This runs four times daily at approximately:

- 02:17 WITA
- 08:17 WITA
- 14:17 WITA
- 20:17 WITA

The non-zero minute avoids concentrating work at the top of the hour. Cloudflare Cron Triggers use UTC, and exact execution time can vary slightly.

## Configuration

Non-secret Worker variable:

- `SUPABASE_URL`: `https://xqyuktsfjvdqfhulobai.supabase.co`

Encrypted Worker secret:

- `SUPABASE_SERVICE_ROLE_KEY`

The key must be configured using Wrangler secret management or the Cloudflare dashboard. It must never appear in source code, Wrangler variables, test fixtures, logs, or error messages.

## Request Behavior

1. Build the PostgREST URL from `SUPABASE_URL`.
2. Send `GET /rest/v1/app_settings?select=setting_key&limit=1`.
3. Include the service-role key in the `apikey` and bearer authorization headers.
4. Apply a finite request timeout.
5. Treat only an HTTP 2xx response as success.
6. Discard the response body.

The Worker performs no inserts, updates, deletes, RPC calls, or access to employee and MCU tables.

## Retry And Logging

- On a timeout, network error, or non-2xx response, wait briefly and retry once.
- Disable Cloudflare's whole-event retry so the one internal retry remains the only retry.
- Log one structured success event after a successful request.
- Log one structured error event only after both attempts fail.
- Logs may include timestamp, attempt count, duration, and HTTP status.
- Logs must not include request headers, secrets, response bodies, database rows, or medical data.
- Throw after the final failure so Cloudflare records the Cron Trigger execution as failed.

No additional notification service is added. Cloudflare logs provide operational history, and Supabase remains responsible for its project-pause warning emails.

## Repository Layout

```text
workers/supabase-keepalive/
  src/index.js
  test/index.test.js
  package.json
  wrangler.jsonc
```

The Worker uses platform `fetch` and the native test runner or existing lightweight test tooling. It does not add the Supabase SDK because a single REST request is sufficient.

## Verification

1. Unit-test the exact method, URL, selected column, row limit, and headers using a fake fetch implementation.
2. Verify successful 2xx handling.
3. Verify one retry after network and non-2xx failures.
4. Verify the Worker throws after the second failure.
5. Verify logged payloads never contain the configured service-role key.
6. Validate the Wrangler configuration and run a deployment dry-run.
7. Configure the Cloudflare secret outside Git.
8. Deploy the Worker and verify that the Cron Trigger is registered.
9. Trigger one scheduled execution and confirm a successful query in Cloudflare logs.

## Data And Cost Impact

- Database schema changes: none.
- Database writes: none.
- Existing medical records changed: none.
- Expected Cloudflare invocations: 4 per day.
- Expected Supabase reads: normally 4 per day, up to 8 if every first attempt fails.
- Expected monetary cost within current free-plan limits: zero.

## Failure Modes

- Missing configuration: fail immediately with a sanitized configuration error.
- Invalid or rotated service key: both attempts fail with the HTTP status logged, but no response body.
- Supabase already paused: the request fails and cannot resume the project automatically; the owner must resume it in Supabase Studio.
- Cloudflare execution delay: later scheduled invocations continue independently.
- Worker deployment removed: the Cron Trigger disappears with the deployment configuration and Supabase warning email remains the final fallback.

## Non-Goals

- Guaranteeing that Supabase never pauses a Free project.
- Automatically resuming a paused project.
- Writing heartbeat rows or timestamps to the database.
- Monitoring application uptime or sending WhatsApp/email alerts.
- Replacing normal user activity, backups, or a paid production SLA.
