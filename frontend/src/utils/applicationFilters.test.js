import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesApplicationFilter } from './applicationFilters.js';

test('response list excludes pending applications', () => {
    for (const status of ['interview', 'technical_test', 'offer', 'accepted', 'rejected']) {
        assert.equal(matchesApplicationFilter({ status }, 'responded'), true);
    }
    for (const status of ['to_apply', 'applied']) {
        assert.equal(matchesApplicationFilter({ status }, 'responded'), false);
    }
});

test('weekly list uses real dates and includes the seven-day boundary', () => {
    const now = Date.parse('2026-09-28T12:00:00Z');
    for (const [applied_at, expected] of [
        ['2026-09-28T12:00:00Z', true], ['2026-09-21T12:00:00Z', true],
        ['2026-09-21T11:59:59Z', false], ['2026-09-29T12:00:00Z', false],
        [null, false], ['invalid', false]
    ]) assert.equal(matchesApplicationFilter({ applied_at }, 'week', now), expected);
});

test('follow-up list requires an old application awaiting a response', () => {
    assert.equal(matchesApplicationFilter({ status: 'applied', applied_at: '2020-01-01' }, 'follow-up'), true);
    assert.equal(matchesApplicationFilter({ status: 'accepted', applied_at: '2020-01-01' }, 'follow-up'), false);
    assert.equal(matchesApplicationFilter({ status: 'applied' }, 'follow-up'), false);
});
