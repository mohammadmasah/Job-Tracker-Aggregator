import test from 'node:test';
import assert from 'node:assert/strict';
import { companyContacts } from './companyContacts.js';

const app = { id: 1, company: 'Havas Paris' };
const applications = [app, { id: 2, company: ' HAVAS   PARIS ' }, { id: 3, company: 'Havas' }, { id: 4, company: '' }];
const contacts = [
    { id: 10, name: 'Alice', application_ids: [2] },
    { id: 11, name: 'Zoé', application_ids: [1, 2] },
    { id: 12, name: 'Havas Paris', application_ids: [] },
    { id: 13, name: 'Marc', application_ids: [3] },
];
test('includes direct and same-company contacts once, direct relationships first', () => {
    assert.deepEqual(companyContacts([...contacts, contacts[1]], app, applications).map(c => c.id), [11, 10]);
});
test('does not infer company membership from contact names or partial company names', () => {
    assert.deepEqual(companyContacts(contacts, applications[2], applications).map(c => c.id), [13]);
});
test('unnamed companies do not match each other; direct links remain visible', () => {
    const items = [{ id: 1, name: 'A', application_ids: [4] }, { id: 2, name: 'B', application_ids: [5] }];
    assert.deepEqual(companyContacts(items, applications[3], [...applications, { id: 5, company: '' }]).map(c => c.id), [1]);
});
test('handles absent application and contacts without links', () => {
    assert.deepEqual(companyContacts(contacts, null, applications), []);
    assert.deepEqual(companyContacts([{ id: 20, name: 'A' }], app, applications), []);
});
