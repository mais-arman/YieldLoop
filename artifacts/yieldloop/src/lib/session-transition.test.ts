import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { startSession, endSession, ME_KEY } from './session';
import { roleHome } from './role-home';
import type { Employee } from './auth';

const user: Employee = { id: 999, username: 'isolated-unit-fixture', first_name: '', last_name: '',
  role: 'cutting_operator', is_active: true, must_change_password: false, temporary_password_expired: false };

test('login cancels an anonymous identity request before publishing server identity', async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let resolve!: (v: null) => void;
  let aborted = false;
  const oldRequest = qc.fetchQuery({ queryKey: ME_KEY, queryFn: ({ signal }) => {
    signal.addEventListener('abort', () => { aborted = true; });
    return new Promise<null>((r) => { resolve = r; });
  } }).catch(() => null);
  qc.setQueryData(['jobs'], ['previous-user-data']);
  await startSession(qc, user);
  resolve(null);
  await oldRequest;
  assert.equal(aborted, true);
  assert.deepEqual(qc.getQueryData(ME_KEY), user);
  assert.equal(qc.getQueryData(['jobs']), undefined);
  qc.clear();
});

test('logout removes protected data and publishes anonymous identity', async () => {
  const qc = new QueryClient();
  await startSession(qc, user);
  qc.setQueryData(['inventory'], ['protected']);
  endSession(qc);
  assert.equal(qc.getQueryData(ME_KEY), null);
  assert.equal(qc.getQueryData(['inventory']), undefined);
  qc.clear();
});

test('role landing routes use existing operational and oversight routes', () => {
  assert.equal(roleHome('cutting_operator'), '/jobs');
  assert.equal(roleHome('production_supervisor'), '/dashboard');
  assert.equal(roleHome('manager'), '/dashboard');
});
