# Gym Hub Mobile

Expo and TypeScript app for trainer and member sign-in. Requires Node.js 20+, npm,
and Expo-compatible device or simulator tooling.

```sh
npm install
cp .env.example .env
npm run gen:api
npx expo start
```

Run checks with `npm run lint` and `npx tsc --noEmit`. API types are generated from
the committed `schema.yml`; do not hand-write endpoint types. Tokens are stored
with Expo SecureStore. The redeem and `/api/me/` responses currently omit the
invitee's name and the API has no invite preview operation, so the app cannot
show that name before redemption. After sign-in, trainers see their assigned
members and members see their assigned trainer.
