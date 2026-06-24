Deploying and scheduling the `poll-auth` Supabase Function

1. Prerequisites

- Install `supabase` CLI and authenticate: https://supabase.com/docs/guides/cli
- Ensure your project has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in Function's environment (Project > Settings > API / Environment variables or via CLI secrets).

2. Deploy function
   From repo root:

```bash
cd supabase/functions/poll-auth
supabase functions deploy poll-auth --project-ref <project-ref>
```

3. Add environment variables for the function
   In the Supabase dashboard: Project > Settings > API > Environment variables (Functions)

- NEXT_PUBLIC_SUPABASE_URL = https://...supabase.co
- SUPABASE_SERVICE_ROLE_KEY = <service role key>
- (optional) POLL_LOOKBACK_MS, POLL_LIMIT

4. Schedule the function

- In Supabase dashboard go to "Edge Functions" > select `poll-auth` > "Create schedule".
- Configure frequency (e.g., every 1–5 minutes) and save.

5. Testing

- Use "Run" in the Edge Functions UI or call via `supabase functions invoke poll-auth`.

Security note

- `SUPABASE_SERVICE_ROLE_KEY` is sensitive; set only in Functions environment and do not expose to client-side code.

If you want I can also add a GitHub Action that invokes the function as a fallback scheduler — want that?
