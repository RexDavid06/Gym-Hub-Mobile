# Gym Hub Mobile

Expo and TypeScript app for trainers and members. Requires Node.js 20+, npm, and Expo-compatible device or simulator tooling.

```sh
npm install
cp .env.example .env
npx expo start
```

Run checks from `mobile/`:

```sh
npm run lint
npm run typecheck
npm run test:run
```

## Authentication

Login uses phone number and password. Invite redemption sets a password and signs the user in. Tokens are stored with Expo SecureStore and refreshed through the API client. Owners and admins are directed to the web dashboard. There is no super-admin mobile UI.

## Implemented features

### Trainer

- View assigned members, including their branch.
- View the trainer's own branch.
- View, create, edit, and delete workout plans for assigned members.
- Add, edit, and remove exercises in a workout plan.
- Sign out.

### Member

- View the member's own branch.
- View the assigned trainer.
- View workout plans.
- View the current membership card and receipts.
- Sign out.

## Notifications

Phase 8 delivers membership reminders and payment receipts by SMS or WhatsApp outside the app. There is no mobile notification inbox, push notification, or opt-in screen. WhatsApp consent is managed by gym staff on the web dashboard. Mobile screens and tests are unchanged by Phase 8.

## Current limitations

- The API has no invite-preview operation, so the app cannot show an invitee's name before redemption. Redemption still works.
- Mobile tests currently cover branch display; broader screen coverage is still being built.

API types and the typed fetch wrapper come from the shared `@gym-hub/api-client` package, hosted in the backend repository's `api-client/` directory. Do not hand-write endpoint types. `src/api/client.ts` is a thin adapter that supplies `EXPO_PUBLIC_API_BASE_URL` and the SecureStore-backed refresh handler. Build the package before typechecking, testing, or starting the app; CI stages and builds it automatically.
