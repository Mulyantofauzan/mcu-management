const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadActiveUser,
  authorizeAction
} = require('../../server/workflow/authorization');
const { WORKFLOW_ERROR_CODES } = require('../../server/workflow/constants');

function createUserQuery(result) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => result
        })
      })
    })
  };
}

test('active database role replaces stale JWT role', async () => {
  const supabase = createUserQuery({
    data: {
      user_id: 'USR-1',
      username: 'doctor',
      display_name: 'Doctor',
      role: 'Dokter',
      active: true
    },
    error: null
  });

  const user = await loadActiveUser({ app_user_id: 'USR-1', app_role: 'Admin' }, supabase);
  assert.equal(user.role, 'Dokter');
  assert.throws(
    () => authorizeAction('joining-decision', user),
    error => error.code === WORKFLOW_ERROR_CODES.FORBIDDEN
  );
});

test('inactive database user is rejected despite valid claims', async () => {
  const supabase = createUserQuery({
    data: { user_id: 'USR-2', role: 'Admin', active: false },
    error: null
  });

  await assert.rejects(
    loadActiveUser({ app_user_id: 'USR-2', app_role: 'Admin' }, supabase),
    error => error.code === WORKFLOW_ERROR_CODES.USER_INACTIVE
  );
});

test('unknown action is rejected before service execution', () => {
  assert.throws(
    () => authorizeAction('delete-everything', { role: 'Admin' }),
    error => error.code === WORKFLOW_ERROR_CODES.ACTION_NOT_FOUND
  );
});

test('Admin inherits Petugas operations but not Doctor decisions', () => {
  const admin = { role: 'Admin' };

  ['petugas-queue', 'submit-review', 'submit-followup'].forEach(action => {
    assert.doesNotThrow(() => authorizeAction(action, admin), action);
  });
  assert.throws(
    () => authorizeAction('doctor-decision', admin),
    error => error.code === WORKFLOW_ERROR_CODES.FORBIDDEN
  );
});

test('Petugas can regenerate missing referral documents', () => {
  assert.doesNotThrow(() => authorizeAction('regenerate-referral', { role: 'Petugas' }));
});
