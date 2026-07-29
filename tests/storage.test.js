import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Storage, KEYS } from '../js/storage.js';

// Node'da localStorage yok, dolayısıyla bu testler modülün bellek yedeği yolunu çalıştırıyor —
// yani tarayıcıda depolama engellendiğinde/kota dolduğunda devreye giren yolu. Asıl garanti
// şu: bu koşullarda hiçbir çağrı exception atmamalı, oyun turu ortasında patlamamalı.

test('depolama kullanılamadığında Storage sessizce bellek yedeğine düşer', () => {
    assert.equal(Storage.isPersistent(), false, 'Node ortamında kalıcı depolama beklenmiyor');
    assert.doesNotThrow(() => Storage.set('bomblok_test_key', 'x'));
    assert.equal(Storage.get('bomblok_test_key'), 'x');
});

test('set/get aynı oturumda değeri korur ve her zaman string döner', () => {
    Storage.set(KEYS.jokers, 7);
    assert.equal(Storage.get(KEYS.jokers), '7');
});

test('get bilinmeyen anahtar için verilen varsayılanı döner', () => {
    assert.equal(Storage.get('bomblok_yok_boyle_bir_anahtar', 'varsayilan'), 'varsayilan');
    assert.equal(Storage.get('bomblok_yok_boyle_bir_anahtar'), null);
});

test('remove değeri siler', () => {
    Storage.set('bomblok_silinecek', '1');
    Storage.remove('bomblok_silinecek');
    assert.equal(Storage.get('bomblok_silinecek', 'yok'), 'yok');
});

test('getInt sayıya çevirir, sayı olmayanda varsayılana düşer', () => {
    Storage.set(KEYS.level, '12');
    assert.equal(Storage.getInt(KEYS.level, 1), 12);

    Storage.set(KEYS.xp, 'bozuk');
    assert.equal(Storage.getInt(KEYS.xp, 0), 0, 'parse edilemeyen değer varsayılana düşmeli');

    assert.equal(Storage.getInt('bomblok_hic_yazilmadi', 5), 5);
});

test('getInt 0 değerini varsayılanla karıştırmaz', () => {
    Storage.set(KEYS.jokers, 0);
    assert.equal(Storage.getInt(KEYS.jokers, 99), 0);
});

test('setJSON/getJSON nesneyi gidip gelirken korur', () => {
    const stats = { bombs: 3, maxCombo: 5, ice: 0 };
    Storage.setJSON(KEYS.lifetimeStats, stats);
    assert.deepEqual(Storage.getJSON(KEYS.lifetimeStats, null), stats);
});

test('getJSON bozuk veride varsayılanı döner, hata atmaz', () => {
    // Elle kurcalanmış veya yarım yazılmış kayıt açılışta oyunu kilitlememeli.
    Storage.set(KEYS.achievements, '[{bozuk json');
    assert.deepEqual(Storage.getJSON(KEYS.achievements, []), []);
});

test('getJSON hiç yazılmamış anahtarda varsayılanı döner', () => {
    assert.deepEqual(Storage.getJSON('bomblok_hic_yok', { a: 1 }), { a: 1 });
});
