const test = require('node:test');
const assert = require('node:assert/strict');
const { employeeExists, getEmployeeName } = require('../../server/r2StorageService');

function employeeQuery(result) {
  const calls = [];
  const query = {
    select(column) {
      calls.push(['select', column]);
      return this;
    },
    eq(column, value) {
      calls.push(['eq', column, value]);
      return this;
    },
    async maybeSingle() {
      calls.push(['maybeSingle']);
      return result;
    },
    async single() {
      calls.push(['single']);
      return result;
    }
  };
  return {
    calls,
    supabase: {
      from(table) {
        calls.push(['from', table]);
        return query;
      }
    }
  };
}

test('employeeExists queries the canonical employee_id column', async () => {
  const fixture = employeeQuery({ data: { employee_id: 'EMP-1' }, error: null });

  assert.equal(await employeeExists('EMP-1', fixture.supabase), true);
  assert.deepEqual(fixture.calls, [
    ['from', 'employees'],
    ['select', 'employee_id'],
    ['eq', 'employee_id', 'EMP-1'],
    ['maybeSingle']
  ]);
});

test('getEmployeeName queries employee_id and returns the employee name', async () => {
  const fixture = employeeQuery({ data: { name: 'Ageng' }, error: null });

  assert.equal(await getEmployeeName('EMP-1', fixture.supabase), 'Ageng');
  assert.deepEqual(fixture.calls, [
    ['from', 'employees'],
    ['select', 'name'],
    ['eq', 'employee_id', 'EMP-1'],
    ['single']
  ]);
});
