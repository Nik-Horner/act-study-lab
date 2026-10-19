# Contributing to ACT Study Lab

Want to study? [Open the hosted app](https://act-study-lab.nikhorner.chatgpt.site). No installation is needed.

This guide is for people changing the code. Bug reports and focused pull requests are welcome. Describe the problem, the affected screen, and how to reproduce it. Use synthetic data in reports and screenshots.

## Run locally

Use **Node.js 22** and npm, plus a Supabase project for authentication and saved progress.

```bash
git clone https://github.com/Nik-Horner/act-study-lab.git
cd act-study-lab
npm ci
```

Create `.env.local` in the project root:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

For a **new Supabase project**, run the SQL files in [`supabase/migrations`](supabase/migrations) in filename order. They create the profile, progress, and exam tables with owner-only row-level security. Enable email/password authentication and allow `http://localhost:3000/auth/callback` in the Auth redirect URLs. If email confirmation is enabled, confirm your email before signing in.

Use the public anon key here; never put a service-role key in a `NEXT_PUBLIC_` variable. `.env.local` is ignored by Git. Existing installations should retain their database and apply only migrations they have not run.

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000), create an account, and choose your study goals.

## Development

```bash
npm run lint              # ESLint
npm run validate:content  # Content and curriculum checks
npm test                  # Unit and regression tests
npm run build:next        # Native Next.js production build
npm run check             # Lint, content checks, tests, and Worker build
```

The default `npm run build` targets the Vinext/Cloudflare Worker deployment and requires both public Supabase variables at build time. For native Next.js, use `npm run build:next`, then `npm start`. Vercel selects the native build through `vercel.json`.

Live-account integration tests are separate from the default suite. See the [engineering notes](docs/engineering-notes.md) before running them.

```text
src/app/          Pages and API routes
src/components/   Lessons, study runners, diagrams, and shared UI
src/content/      Authored lessons, questions, activities, and exams
src/lib/          Planning, grading, progress, and Supabase clients
supabase/         Database migrations and access policies
tests/            Unit, regression, and explicit integration tests
docs/             Review notes and screenshots
```

## Before opening a pull request

Run `npm run check`. For UI changes, include desktop and phone screenshots. Keep existing question IDs, answer history, lesson checkpoints, and account ownership intact. Never commit credentials or student records. Live-account tests are explicit opt-in checks; do not run them against a real student's account.

The app uses original practice material. Do not copy official ACT questions into the question bank. See [engineering notes](docs/engineering-notes.md) and the review records in [docs](docs).

Contributions are licensed under the repository's [MIT license](LICENSE).
