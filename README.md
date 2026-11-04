# Gym Hub Mobile

Expo and TypeScript app for trainers and members. Requires Node.js 20+, npm, and Expo-compatible device or simulator tooling.

```sh
npm install
cp .env.example .env
npm run gen:api
npx expo start
```

Run checks from `mobile/`:

```sh
npm run lint
npx tsc --noEmit
```

## Authentication

Login uses phone number and password. Invite redemption sets a password and signs the user in. Tokens are stored with Expo SecureStore and refreshed through the API client. Owners and admins are directed to the web dashboard. There is no super-admin mobile UI.

## Implemented features

### Trainer

- View assigned members.
- View, create, edit, and delete workout plans for assigned members.
- Add, edit, and remove exercises in a workout plan.
- Sign out.

### Member

- View the assigned trainer.
- View workout plans.
- View the current membership card and receipts.
- Sign out.

## Current limitations

- The API has no invite-preview operation, so the app cannot show an invitee's name before redemption. Redemption still works.
- No automated mobile tests yet; lint and typecheck are the current checks.
- The shared `packages/api-client` package is not used; the app keeps its own generated schema and typed fetch wrapper.

API types are generated from the committed `schema.yml`; do not hand-write endpoint types.
