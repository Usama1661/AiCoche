# Supabase Backend

This folder contains the AI Career Coach backend: Auth-backed Edge Functions, Postgres schema, private CV storage, RLS policies, and AI helpers.

## Folder Structure

```text
supabase/
  config.toml
  migrations/
    20250504000000_interview_sessions.sql
    20260504123000_career_coach_backend.sql
  functions/
    _shared/
      ai.ts
      cors.ts
      files.ts
      openai.ts
      profile.ts
      supabase.ts
    upload-cv/
    analyze-cv/
    auto-fill-profile/
    get-profile/
    update-profile/
    save-interview-session/
    generate-quiz/
    save-quiz-result/
    create-subscription/
    start-interview/
    continue-interview/
```

## Database Schema

The schema SQL is in `supabase/migrations/20260504123000_career_coach_backend.sql`.

It creates:

- `profiles`
- `cv_documents`
- `cv_analysis_results`
- `work_experiences`
- `educations`
- `skills`
- `certifications`
- `projects`
- `interview_sessions`
- `quiz_sessions`
- `subscriptions`

All user-owned tables have RLS enabled. Policies restrict authenticated users to their own rows via `auth.uid()`.

## Storage Bucket

The migration creates a private Storage bucket:

- Bucket: `cv-documents`
- Public: `false`
- Max file size: `10 MB`
- Allowed MIME types: PDF, DOC, DOCX
- Object path convention: `<auth-user-id>/<uuid>-<safe-file-name>`

Storage policies allow authenticated users to read/write/delete only files inside their own user-id folder. Use signed URLs from server code when a temporary download link is needed.

## Auth And Security

`supabase/config.toml` enables JWT verification for Edge Functions:

```toml
[functions]
verify_jwt = true
```

The mobile app must use Supabase Auth (`supabase.auth.signUp`, `signInWithPassword`, etc.). Function calls made through `supabase.functions.invoke(...)` automatically include the user session JWT.

`supabase/migrations/20260504131500_auth_profile_trigger.sql` creates a trigger on `auth.users` so every signup automatically gets a `public.profiles` row. It also backfills profile rows for users that already exist.

Never expose server secrets in the mobile app. Store these as Supabase Edge Function secrets:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini

# Optional external text extraction service for PDF/DOC/DOCX:
supabase secrets set CV_TEXT_EXTRACTOR_URL=https://your-extractor.example.com/extract
supabase secrets set CV_TEXT_EXTRACTOR_KEY=...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase for deployed Edge Functions.

## Edge Functions

### `upload-cv`

Uploads a PDF/DOC/DOCX file to private Storage, creates a `cv_documents` row, and stores extracted text when `CV_TEXT_EXTRACTOR_URL` is configured.

Request: multipart form data with `file`.

Response:

```json
{
  "cvDocument": {
    "id": "uuid",
    "file_name": "resume.pdf",
    "storage_path": "user-id/uuid-resume.pdf",
    "status": "processing"
  },
  "extractedText": "Resume text...",
  "nextStep": "Call analyze-cv with cvDocumentId."
}
```

### `analyze-cv`

Reads `cv_documents.extracted_text` or accepts direct `cvText`, sends it to AI, saves `cv_analysis_results`, and auto-fills profile tables.

Request:

```json
{
  "cvDocumentId": "uuid",
  "targetRole": "React Native Developer"
}
```

Response includes:

```json
{
  "fullName": "Alex Developer",
  "email": "alex@example.com",
  "phone": "+1 555 0100",
  "currentRole": "React Native Developer",
  "summary": "Mobile engineer...",
  "experiences": [],
  "education": [],
  "skills": [],
  "certifications": [],
  "projects": [],
  "cvScore": 82,
  "strengths": ["Clear role focus"],
  "weaknesses": ["Needs more metrics"],
  "improvementSuggestions": ["Quantify each achievement"],
  "recommendedSkills": ["Testing", "CI/CD"],
  "jobRoleFit": { "React Native Developer": "Strong" },
  "cvDocumentId": "uuid",
  "analysisResultId": "uuid"
}
```

### `auto-fill-profile`

Runs the same AI extraction and profile persistence flow when you want profile data without displaying full CV analysis first.

Request:

```json
{
  "cvDocumentId": "uuid",
  "targetRole": "Frontend Engineer"
}
```

### `get-profile`

Returns the full profile aggregate: profile row, work experience, education, skills, certifications, projects, and subscription.

### `update-profile`

Updates manual profile edits. Body can include any of:

```json
{
  "profile": {
    "fullName": "Alex Developer",
    "headline": "Senior Mobile Engineer",
    "currentRole": "React Native Lead",
    "currentCompany": "Acme",
    "employmentStatus": "employed",
    "summary": "I build mobile products..."
  },
  "workExperiences": [],
  "educations": [],
  "skills": [],
  "certifications": [],
  "projects": []
}
```

### `save-interview-session`

Saves or updates an interview transcript owned by the authenticated user.

### `generate-quiz`

Generates AI quiz questions and creates a `quiz_sessions` row.

Request:

```json
{
  "topic": "React Native",
  "difficulty": "intermediate",
  "skills": ["TypeScript", "Navigation"],
  "count": 5
}
```

### `save-quiz-result`

Scores a generated quiz based on stored answers.

### `create-subscription`

Creates a subscription record. It currently returns `checkoutUrl: null` and is ready for Stripe, RevenueCat, or another provider integration.

## React Native Examples

Supabase client:

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

Auth:

```ts
await supabase.auth.signUp({ email, password });
await supabase.auth.signInWithPassword({ email, password });
```

Upload CV:

```ts
const form = new FormData();
form.append('file', {
  uri: file.uri,
  name: file.name,
  type: file.mimeType ?? 'application/pdf',
} as unknown as Blob);

const { data, error } = await supabase.functions.invoke('upload-cv', {
  body: form,
});
if (error) throw error;
```

Analyze CV:

```ts
const { data, error } = await supabase.functions.invoke('analyze-cv', {
  body: {
    cvDocumentId: uploadResult.cvDocument.id,
    targetRole: 'React Native Developer',
  },
});
if (error) throw error;
```

Get profile:

```ts
const { data, error } = await supabase.functions.invoke('get-profile');
if (error) throw error;
```

Manual profile update:

```ts
const { data, error } = await supabase.functions.invoke('update-profile', {
  body: {
    profile: {
      fullName: 'Alex Developer',
      headline: 'Mobile Engineer',
      summary: 'I build React Native apps.',
    },
    skills: [
      { name: 'React Native', category: 'technical' },
      { name: 'Communication', category: 'soft' },
    ],
  },
});
if (error) throw error;
```

Generate and save quiz:

```ts
const quiz = await supabase.functions.invoke('generate-quiz', {
  body: { topic: 'React Native', difficulty: 'intermediate', count: 5 },
});

await supabase.functions.invoke('save-quiz-result', {
  body: {
    quizSessionId: quiz.data.quizSessionId,
    answers: [{ questionId: quiz.data.questions[0].id, selectedIndex: 1 }],
  },
});
```

## Setup And Deployment

Install and link:

```bash
npm install -g supabase
supabase login
supabase link --project-ref eerkpyzynezulwnsshxj
```

Set mobile env:

```env
EXPO_PUBLIC_SUPABASE_URL=https://eerkpyzynezulwnsshxj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Apply database and Storage setup:

```bash
supabase db push
```

Set function secrets:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini
supabase secrets set CV_TEXT_EXTRACTOR_URL=https://your-extractor.example.com/extract
supabase secrets set CV_TEXT_EXTRACTOR_KEY=...
```

Deploy functions:

```bash
supabase functions deploy upload-cv
supabase functions deploy analyze-cv
supabase functions deploy auto-fill-profile
supabase functions deploy get-profile
supabase functions deploy update-profile
supabase functions deploy save-interview-session
supabase functions deploy generate-quiz
supabase functions deploy save-quiz-result
supabase functions deploy create-subscription
supabase functions deploy start-interview
supabase functions deploy continue-interview
```

Local development:

```bash
supabase start
supabase functions serve --env-file supabase/.env.local
```

## Notes

- PDF/DOC/DOCX binary text extraction is delegated to `CV_TEXT_EXTRACTOR_URL`. Without it, `upload-cv` still stores files privately and creates metadata, but extracted text will be empty until an extractor is configured.
- `create-subscription` is a backend placeholder for a payment provider. Do not use it for real payments until Stripe, RevenueCat, or your provider webhook flow is wired.
