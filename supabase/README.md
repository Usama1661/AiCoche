# Supabase backend (Edge Functions)

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project

## Database

Apply migrations (includes `interview_sessions` for mock interviews):

```bash
supabase db push
# or link remote and push per Supabase docs
```

## Secrets (hosted functions)

Set your OpenAI key (optional but recommended for real AI output):

```bash
supabase secrets set OPENAI_API_KEY=sk-...
# optional:
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in Edge Functions.

## Deploy functions

From the repo root:

```bash
supabase functions deploy analyze-cv --no-verify-jwt
supabase functions deploy start-interview --no-verify-jwt
supabase functions deploy continue-interview --no-verify-jwt
```

If you use `config.toml` with `verify_jwt = false`, `--no-verify-jwt` matches the app calling functions with the anon key only.

## Mobile app env

Set in `.env` (Expo):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

The client invokes:

- `analyze-cv` — body: `{ cvText, userProfile }`
- `start-interview` — body: `{ profile }`
- `continue-interview` — body: `{ sessionId, answer }`
