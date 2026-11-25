/**
 * Dirty Dozen adversarial payload test matrix corresponding to security_spec.md
 * and firestore.rules invariants.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  actorUid: string | null;
  targetPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated read of user profile',
    actorUid: null,
    targetPath: '/users/userA',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unauthenticated write of movement',
    actorUid: null,
    targetPath: '/users/userA/movements/mov-1',
    operation: 'create',
    payload: { id: 'mov-1', ownerId: 'userA', amount: 15000 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-tenant read of another user profile',
    actorUid: 'userA',
    targetPath: '/users/userB',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-tenant list of another user movements',
    actorUid: 'userA',
    targetPath: '/users/userB/movements',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity spoofing on UserProfile create',
    actorUid: 'userA',
    targetPath: '/users/userA',
    operation: 'create',
    payload: { uid: 'userB', displayName: 'Spoof', baseMonthlyBudget: 1000000, hasConfiguredBudget: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Identity spoofing on Movement create',
    actorUid: 'userA',
    targetPath: '/users/userA/movements/mov-1',
    operation: 'create',
    payload: { id: 'mov-1', ownerId: 'userB', amount: 25000 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Shadow field injection on UserProfile update',
    actorUid: 'userA',
    targetPath: '/users/userA',
    operation: 'update',
    payload: { baseMonthlyBudget: 2500000, isAdmin: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Shadow field injection on Movement update',
    actorUid: 'userA',
    targetPath: '/users/userA/movements/mov-1',
    operation: 'update',
    payload: { amount: 25000, ghostField: 'exploit' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Zero or negative amount on Movement',
    actorUid: 'userA',
    targetPath: '/users/userA/movements/mov-1',
    operation: 'create',
    payload: { id: 'mov-1', ownerId: 'userA', amount: -500 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Negative baseMonthlyBudget on UserProfile',
    actorUid: 'userA',
    targetPath: '/users/userA',
    operation: 'update',
    payload: { baseMonthlyBudget: -1000, hasConfiguredBudget: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Oversized description string (> 160 chars)',
    actorUid: 'userA',
    targetPath: '/users/userA/movements/mov-1',
    operation: 'create',
    payload: { id: 'mov-1', ownerId: 'userA', description: 'x'.repeat(161), amount: 1000 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Immutable ownerId or createdAt mutation on Movement update',
    actorUid: 'userA',
    targetPath: '/users/userA/movements/mov-1',
    operation: 'update',
    payload: { ownerId: 'userC', createdAt: '1999-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
