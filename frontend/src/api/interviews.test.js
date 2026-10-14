import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { searchInterviewSources, practiceInterview, configureInterview, interviewError } from './interviews.js';

test('interview requests keep same-origin auth, revision and retry identifiers', async () => {
    const original = axios.defaults.adapter;
    const requests = [];
    axios.defaults.adapter = async config => { requests.push(config); return { data: {}, status: 200, statusText: 'OK', headers: {}, config }; };
    try {
        const controller = new AbortController();
        await searchInterviewSources({ q: 'Havas', offset: 30 }, controller.signal);
        const action = { action: 'answer', answer: 'Mon exemple', revision: 2, request_id: 'fixed-retry-id-1234' };
        await practiceInterview(7, action);
        await configureInterview(7, { profile: 'Mon parcours', revision: 1 });
        assert.equal(requests[0].params.q, 'Havas');
        assert.equal(requests[0].signal, controller.signal);
        assert.deepEqual(JSON.parse(requests[1].data), action);
        assert.equal(requests[1].timeout, 160000);
        assert.equal(requests[2].method, 'patch');
        assert.ok(requests.every(request => request.withCredentials && request.url.startsWith('/api/interviews')));
    } finally { axios.defaults.adapter = original; }
});

test('unexpected server payloads produce a readable retry message', () => {
    assert.match(interviewError({ response: { data: { detail: [{ type: 'validation' }] } } }), /Recharge/);
    assert.equal(interviewError({ response: { data: { detail: 'Quota atteint' } } }), 'Quota atteint');
});
