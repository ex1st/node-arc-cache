'use strict';

var assert = require('assert'),
	ARC = require('../lib/arc.js'),
	storage;

describe('ARC', function() {
	it('simple init', function() {
		storage = new ARC();
		assert.equal(storage.max,	Infinity);
		assert.equal(storage.maxAge,	null);
		assert.equal(storage.length,	0);
	});
	it('number init', function() {
		storage = new ARC(3);
		assert.equal(storage.max,	3);
		assert.equal(storage.maxAge,	null);
		assert.equal(storage.length,	0);
	});
	it('options init', function() {
		storage = ARC({max: 10, maxAge: 10000, length: function(n) { return n * 2; }});
		storage.set(1, 1);

		assert.equal(storage.max,	10);
		assert.equal(storage.maxAge,	10000);
		assert.equal(storage.length,	2);
	});
	it('itemCount', function() {
		storage = ARC({max: 3});

		storage.set(1, 3);
		storage.set(1, 2);
		storage.set(1, 1);
		assert.equal(storage.itemCount,	1);

		storage.set(2, 2);
		storage.set(3, 3);
		storage.set(4, 4);

		assert.equal(storage.itemCount,	3);

		storage.set(3, 3);
		assert.equal(storage.itemCount,	3);
	});
	it('set/get', function() {
		storage = ARC();

		storage.set(1, 3);
		storage.set(1, 2);
		storage.set(1, 1);
		assert.equal(storage.get(1), 1);

		storage.set(2, 4);
		storage.set(3, 3);
		storage.set(4, 2);
		assert.equal(storage.get(2), 4);
		assert.equal(storage.get(3), 3);
		assert.equal(storage.get(4), 2);

		storage.set(3, 3);
		assert.equal(storage.itemCount,	4);

		storage.max = 2;
		assert.equal(storage.itemCount,	2);
		assert.equal(storage.has(1), false);
		assert.equal(storage.get(2), undefined);
		assert.equal(storage.get(3), 3);
		assert.equal(storage.get(4), 2);
	});
	it('expair', function(done) {
		storage = new ARC({maxAge: 10});

		var d = new Date();
		storage.set(1, 1);
		assert.equal(storage.get(1), 1);

		setTimeout(function() {
			assert.equal(storage.get(1), 1);
			assert.equal(storage.info(1).created.toDateString(), d.toDateString());
			assert.equal(storage.info(1).expire.toDateString(), new Date(d.valueOf() + 10).toDateString());

			setTimeout(function() {
				assert.equal(storage.get(1), undefined);

				done();
			}, 6);
		}, 5);
	});
	it('expair custom maxAge', function(done) {
		storage = new ARC({maxAge: 10});

		storage.set(1, 1);
		storage.set(2, 2, 15);

		setTimeout(function() {
			assert.equal(storage.get(1), undefined);
			assert.equal(storage.get(2), 2);

			setTimeout(function() {
				assert.equal(storage.get(2), undefined);
				done();
			}, 5);
		}, 11);
	});
	it('delete', function() {
		storage = new ARC({max: 10});

		var i = 10;
		while (--i) {
			storage.set(i);
		}

		i = 10;
		while (--i) {
			storage.del(i);
			assert.equal(storage.get(i), undefined);
		}

		assert.equal(storage.itemCount, 0);
	});
	it('forEach', function(done) {
		storage = ARC({maxAge: 10});

		storage.set(1, 4);
		storage.set(2, 3);
		setTimeout(function() {
			storage.set(3, 2);
			storage.set(4, 1);

			setTimeout(function() {
				var arr = [];

				storage.forEach(function(n) {
					arr.push(n);
				});

				assert.equal(arr.sort().join(','), [1, 2].join(','));

				done();
			}, 5);
		}, 5);
	});
	it('keys', function(done) {
		storage = new ARC({max: 2});

		storage.set(1, 4);
		storage.set(2, 3);
		storage.set(3, 2);
		storage.set(4, 1);

		assert.equal(storage.keys().sort().join(','), [1, 2].join(','));
		storage.max = 4;

		storage.set(3, 2);
		storage.set(4, 1);

		assert.equal(storage.keys().sort().join(','), [1, 2, 3, 4].join(','));

		storage.get(1);
		storage.get(2); storage.get(2);
		storage.get(3); storage.get(3);
		storage.get(4);

		storage.max = 2;
		assert.equal(storage.keys().sort().join(','), [2, 3].join(','));

		done();
	});
	it('values', function(done) {
		storage = new ARC({max: 2});

		storage.set(1, 4);
		storage.set(2, 3);
		storage.set(3, 2);
		storage.set(4, 1);

		assert.equal(storage.values().sort().join(','), [3, 4].join(','));
		storage.max = 4;

		storage.set(3, 2);
		storage.set(4, 1);

		assert.equal(storage.values().sort().join(','), [1, 2, 3, 4].join(','));

		storage.get(1); storage.get(1);
		storage.get(2);
		storage.get(3);
		storage.get(4); storage.get(4);

		storage.max = 2;
		assert.equal(storage.values().sort().join(','), [1, 4].join(','));

		done();
	});
	it('reset', function() {
		var i = 1000000,
			s = i / 100,
			e = 0;

		storage = new ARC({max: s});

		while (i) {
			storage.get(i % 2);
			storage.set(--i, ++e);
			storage.has(i % 2);
			storage.set(i % 2, e);
		}

		assert.equal(storage.itemCount, s);
		storage.reset();
		assert.equal(storage.itemCount,	0);
	});
});
