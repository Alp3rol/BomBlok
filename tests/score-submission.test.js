import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSubmissionId, isDuplicateSubmissionError } from '../js/score-submission.js';

test('tarayıcı UUID sağlayıcısı varsa onu kullanır', () => {
    const expected = '12345678-1234-1234-1234-123456789012';
    assert.equal(createSubmissionId({ randomUUID: () => expected }), expected);
});

test('UUID desteği yoksa yeterince uzun ve her çağrıda farklı kimlik üretir', () => {
    const first = createSubmissionId(null);
    const second = createSubmissionId(null);
    assert.ok(first.length >= 16);
    assert.ok(second.length >= 16);
    assert.notEqual(first, second);
});

test('PostgreSQL unique ihlalini çift gönderim olarak tanır', () => {
    assert.equal(isDuplicateSubmissionError({ code: '23505' }), true);
    assert.equal(isDuplicateSubmissionError({ code: '42501' }), false);
    assert.equal(isDuplicateSubmissionError(null), false);
});
