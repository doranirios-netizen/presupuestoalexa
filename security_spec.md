# Security Specification — Mi Presupuesto Mensual

## 1. Data Invariants
1. A `UserProfile` document at `/users/{userId}` can only be read, created, or updated by the authenticated user whose `request.auth.uid == userId`.
2. `UserProfile` documents cannot be listed across accounts (`allow list: if false`) and cannot be deleted from client code (`allow delete: if false`).
3. A `Movement` document at `/users/{userId}/movements/{movementId}` can only be read, listed, created, updated, or deleted when `request.auth.uid == userId`, the parent `/users/{userId}` document exists (`Master Gate`), and `ownerId == request.auth.uid`.
4. All document IDs (`userId`, `movementId`) must match `^[a-zA-Z0-9_\-]+$` with length `<= 128`.
5. `createdAt` and `ownerId` / `uid` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
6. Every string field enforces strict `.size()` bounds; `amount` must be `> 0`; `baseMonthlyBudget` must be `>= 0`.
7. Shadow/ghost fields are blocked on both `create` (`keys().hasAll(...) && keys().hasOnly(...)`) and `update` (`affectedKeys().hasOnly(...)`).

## 2. "Dirty Dozen" Adversarial Payloads
1. Unauthenticated read of `/users/userA`.
2. Unauthenticated write to `/users/userA/movements/mov-1`.
3. Cross-tenant read of `/users/userB` while authenticated as `userA`.
4. Cross-tenant list of `/users/userB/movements` while authenticated as `userA`.
5. Identity spoofing on `UserProfile` create: `uid: "userB"` under `/users/userA`.
6. Identity spoofing on `Movement` create: `ownerId: "userB"` under `/users/userA/movements/mov-1`.
7. Shadow field injection on `UserProfile` create/update (e.g. `isAdmin: true`).
8. Shadow field injection on `Movement` update (e.g. `verifiedOverride: true`).
9. Negative or zero `amount` on `Movement` create/update (`amount: -500` or `0`).
10. Negative `baseMonthlyBudget` (`baseMonthlyBudget: -1000`).
11. Oversized string resource poisoning (`description` length > 160 or `notes` > 500 or `movementId` > 128).
12. Client-forged `createdAt` / `updatedAt` timestamp or mutating `ownerId` / `createdAt` on update.
