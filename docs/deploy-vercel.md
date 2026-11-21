# Deploy the wedding invitation

Use Vercel for the React app and API, and Supabase for the invitation/RSVP database. Choose GitHub for automatic deployments on push, or the CLI to deploy this folder directly.

## GitHub deployment route

1. Complete the Supabase database setup below.
2. Push the application source to your existing GitHub repository. If the repository already has commits (for example a README), clone it and merge the application files into that checkout before committing. Do not force-push over its history.
3. In Vercel, choose **Add New → Project → Import Git Repository** and select the GitHub repository. If it is not listed, grant the Vercel GitHub App access to that repository.
4. Use the Vite framework preset, root directory `./`, build command `npm run build`, and output directory `dist`. The root `api/` directory must remain in the repository for live RSVP.
5. Add the three Production environment variables from step 3 below, then deploy. If this project is already deployed on Vercel, use its **Settings → Git** page to connect the repository.
6. Test a live guest reply as described below. Pushes to the configured Production Branch (usually `main`) trigger production deployments. Other branches can receive preview deployments.

The `.gitignore` excludes secrets, dependencies, generated output, local agent/hosting metadata and original reference media. Commit the optimized photos/fonts/artwork under `public/`, along with `src/`, `api/`, `lib/`, `supabase/`, configuration files and `package-lock.json`. Supabase/Vercel secrets belong in Vercel environment variables. `.env.example` is a template and is safe to commit.

Official guide: https://vercel.com/docs/git/vercel-for-github

The remaining steps describe the alternative CLI route in detail.

## 1. Create the database

Create a Supabase project at https://supabase.com/dashboard. In the project's SQL Editor, create a query, paste the complete contents of `supabase/schema.sql`, and run it. The script creates the invitations table, restricts public access and grants the server role the required permissions.

Copy the project URL and a backend secret API key (`sb_secret_...`) from the project's Connect/API Keys screens. The secret belongs in server environment variables, never in a browser variable or a commit. The code also supports the older service-role JWT through `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Link the local folder to Vercel

Create/sign into a Vercel account. From a normal terminal:

```sh
cd /Users/anhdq18/vanh-wedding-invitation
npx vercel login
npx vercel link
```

Select your personal account, create a new project, use `vanh-wedding-invitation` as its name, and use `./` as the project directory. The repository's `vercel.json` specifies Vite, `npm run build`, and output directory `dist`. Vercel deploys the root `api/invitations.js` as a server function.

## 3. Add server environment variables

Open the linked project in the Vercel dashboard, then Settings → Environment Variables. Add these for **Production**:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Your project's `https://…supabase.co` URL |
| `SUPABASE_SECRET_KEY` | The backend secret key beginning `sb_secret_` |
| `HOST_PASSWORD` | A long random password used to enter the host dashboard |

Do not use the publishable/anon key for this app's privileged server operations. Do not prefix secrets with `VITE_`. To use Preview deployments with the database, separately add values for the Preview environment.

## 4. Deploy

```sh
npx vercel --prod
```

Use the stable Production domain printed by Vercel for invitations. The CLI deploys the project root, including the API; uploading only `dist/` would omit live RSVP. Original JPEG/video reference files are excluded through `.vercelignore`; optimized files in `public/` are included.

For later code changes, run the same command. Environment-variable changes also require a new deployment.

## 5. Verify a live reply

Open `/api/invitations?action=status` on the Production domain. It should return:

```json
{"configured":true}
```

This only confirms configuration is present. Test the actual database next:

1. Open `/?host=1` and enter `HOST_PASSWORD`.
2. Create a test household with a guest name, theme and party limit.
3. Open its generated invitation on your phone or in an incognito window without a Vercel login.
4. Confirm the guest name and host-selected theme appear, and guest theme pickers are hidden.
5. Submit a test RSVP, then refresh the host list and confirm it appears.
6. Create and share real invitation links after the test passes.

If the guest gets a Vercel sign-in prompt, check the project's deployment protection settings for Production. The app's own host dashboard remains password-protected. A guest RSVP link is private by possession: anyone with the link can answer for that household.

If status is false, the `missing` array names exactly which values the function cannot see, for example `{"configured":false,"missing":["HOST_PASSWORD"]}`. Check those variable names in this Vercel project, ensure Production is selected, save, and redeploy. The endpoint never returns credential values. If host login succeeds but database access fails, confirm the SQL script ran and the project URL and secret key belong to the same active project. No public Supabase table policy is needed for this server-backed app.

## Free-tier availability

Vercel Hobby is intended for personal, non-commercial projects and has included usage limits. Supabase Free can pause after a week of inactivity; check the project's status before sending invitations and before the event. These are service plan limits, independent of this app.

Sources checked 21 November 2026:

- https://vercel.com/docs/deployments
- https://vercel.com/docs/cli/link
- https://vercel.com/docs/frameworks/frontend/vite
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/pricing

Local verification: production build and 12 tests pass. A simulated browser check verifies that a live guest receives the name/theme from the stored record, URL overrides are ignored, and both theme pickers are hidden. An actual hosted database and production deployment still need the account setup above.


## Diagnosing a guest-list failure after configuration succeeds

`configured: true` confirms that values exist; it does not test the Supabase connection. The API now returns a safe `code` alongside failed operations:

| Code | Check |
| --- | --- |
| `SUPABASE_URL_INVALID` | Set the project root URL, `https://<project-ref>.supabase.co`, using Project URL in Supabase Connect/API. |
| `SUPABASE_UNREACHABLE` | Confirm the project URL exists and the Supabase project is active. |
| `SUPABASE_TIMEOUT` | Check project availability and retry. |
| `SUPABASE_KEY_INVALID` / `SUPABASE_KEY_REJECTED` | Use a backend secret key from the same project. |
| `INVITATIONS_TABLE_MISSING` | Run `supabase/schema.sql` in the correct project's SQL Editor. |
| `SUPABASE_PERMISSION_DENIED` | Verify the backend key and the schema script's service-role grant. |
| `SUPABASE_INVALID_RESPONSE` | Confirm the URL points to the project Data API root rather than a dashboard page. |
| `INTERNAL_ERROR` | Inspect Vercel runtime logs for `RSVP_API_ERROR`. |

Runtime logs record classifications and upstream HTTP status only. Raw exceptions and credential values are deliberately not logged or returned. Review logs in the project's Logs panel: https://vercel.com/docs/logs/runtime.
