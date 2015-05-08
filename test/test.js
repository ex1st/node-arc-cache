"use strict";

var assert = require('assert'),
	ARC = require('../lib/arc.js'),
	storage;

describe("ARC",function () {
	it("simple init", function () {
		storage = new ARC();
		assert.equal(storage.max,		Infinity);
		assert.equal(storage.maxAge,	null);
		assert.equal(storage.length,	0);
	})
	it("number init", function () {
		storage = new ARC(3);
		assert.equal(storage.max,		3);
		assert.equal(storage.maxAge,	null);
		assert.equal(storage.length,	0);
	})
	it("options init", function () {
		storage = ARC({max: 10, maxAge: 10000, length: function () {return 2;}});
		storage.set(1, 1);

		assert.equal(storage.max,		10);
		assert.equal(storage.maxAge,	10000);
		assert.equal(storage.length,	2);
	})
	it("itemCount", function () {
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
	})
	it("set/get", function () {
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
	})
	it("expair", function (done) {
		storage = new ARC({maxAge: 10});

		storage.set(1, 1);
		assert.equal(storage.get(1), 1);

		setTimeout(function () {
			assert.equal(storage.get(1), 1);

			setTimeout(function () {
				assert.equal(storage.get(1), undefined);

				done();
			}, 11)
		}, 5);
	})
	it("forEach", function (done) {
		storage = ARC({maxAge: 10});

		storage.set(1, 4);
		storage.set(2, 3);
		setTimeout(function () {
			storage.set(3, 2);
			storage.set(4, 1);

			setTimeout(function () {
				var arr = [];

				storage.forEach(function (n) {
					arr.push(n);
				});

				assert.equal(arr.sort().join(","), [1,2].join(","));

				done();
			}, 5);
		}, 5);
	})
	it("keys", function (done) {
		storage = new ARC({max: 2});

		storage.set(1, 4);
		storage.set(2, 3);
		storage.set(3, 2);
		storage.set(4, 1);

		assert.equal(storage.keys().sort().join(","), [3,4].join(","));
		storage.max = 4;

		storage.set(1, 4);
		storage.set(2, 3);

		assert.equal(storage.keys().sort().join(","), [1,2,3,4].join(","));

		storage.get(1);
		storage.get(2); storage.get(2);
		storage.get(3); storage.get(3);
		storage.get(4);

		storage.max = 2;
		assert.equal(storage.keys().sort().join(","), [2,3].join(","));

		done();
	})
	it("values", function (done) {
		storage = new ARC({max: 2});

		storage.set(1, 4);
		storage.set(2, 3);
		storage.set(3, 2);
		storage.set(4, 1);

		assert.equal(storage.values().sort().join(","), [1,2].join(","));
		storage.max = 4;

		storage.set(1, 4);
		storage.set(2, 3);

		assert.equal(storage.values().sort().join(","), [1,2,3,4].join(","));

		storage.get(1); storage.get(1);
		storage.get(2);
		storage.get(3);
		storage.get(4); storage.get(4);

		storage.max = 2;
		assert.equal(storage.values().sort().join(","), [1,4].join(","));

		done();
	})
	it("reset", function () {
		var i = 100001,
			e = 0;

		storage = new ARC({max: i});

		while (i) {
			storage.set(--i, ++e);
		}

		assert.equal(storage.itemCount,	e);
		storage.reset();
		assert.equal(storage.itemCount,	0);
	})
})