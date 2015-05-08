"use strict";

function ARcache (options) {
	if (!(this instanceof ARcache))
		return new ARcache(options);

	if (typeof options === 'number')
		options = {
			'max': options
		};

	if (!options)
		options = {};

	var _interval;

	Object.defineProperties(this, {
		'max': {
			enumerable : true,
			set: function (_max) {
				this._max = parseInt(_max, 10) || Infinity;

				_interval = clearInterval(_interval);

				if (this._max === Infinity && this._maxAge)
					_interval = setInterval(this.__trim.bind(this), 1000*60*60);
				else
					this.purge();
			},
			get: function () {
				return this._max;
			}
		},
		'_storage': {
			writable: true,
			enumerable: false,
			value: Object.create(null)
		},
		'_size': {
			writable: true,
			enumerable: false,
			value: 0
		},
		'_heap': {
			writable: true,
			enumerable: false,
			value: 0
		},
		'_max': {
			writable: true,
			enumerable: false,
			value: Infinity
		},
		'_maxAge': {
			writable: true,
			enumerable: false,
			value: Infinity
		},
		'_length': {
			enumerable: false,
			value: typeof options.length === 'function' ? options.length : function () { return 1; }
		}
	});

	this.max = options.max;
	this.maxAge = options.maxAge;
};

ARcache.prototype = {};

Object.defineProperties(ARcache.prototype, {
	/* public */
	'has': {
		enumerable: true,
		value: function (key) {
			return this.__has(key);
		}
	},
	'get': {
		enumerable: true,
		value: function (key) {
			return this.__get(key);
		}
	},
	'set': {
		enumerable: true,
		value: function (key, val) {
			this.__set(key, val);
		}
	},
	'del': {
		enumerable: true,
		value: function (key) {
			if (this.__has(key))
				this.__del(key);
		}
	},
	'reset': {
		enumerable: true,
		value: function () {
			this._size = 0;
			this._heap = 0;
			this._storage = Object.create(null);
		}
	},
	'forEach': {
		enumerable: true,
		value: function (fn) {
			var self = this,
				keys = self.keys(), // keys --> trim
				i = -1,
				l = keys.length,
				key,
				map = {};

			while (++i < l) {
				key = keys[i];
				map[key] = self._storage[key].v;
			}

			i = -1;

			while (++i < l) {
				key = keys[i];
				fn(map[key], key, map);
			}
		}
	},
	'keys': {
		enumerable: true,
		value: function () {
			this.__trim();
			return Object.keys(this._storage);
		}
	},
	'values': {
		enumerable: true,
		value: function () {
			var self = this,
				keys = self.keys(), // keys --> trim
				i = -1,
				l = keys.length,
				map = Array(l);

			while (++i < l)
				map[i] = self._storage[keys[i]].v;

			return map;
		}
	},
	'purge': {
		enumerable: true,
		value: function () {
			if ( (this._size >= this._max) || (this._heap > this._size*2) ) {
				this.__trim();
				return this._size >= this._max;
			}
		}
	},
	'maxAge': {
		enumerable : true,
		set: function (_maxAge) {
			if (!_maxAge || typeof _maxAge !== "number" || _maxAge <= 0)
				_maxAge = null;

			this._maxAge = _maxAge;
			this.purge();
		},
		get: function () {
			return this._maxAge;
		}
	},
	'length': {
		enumerable : true,
		get: function () {
			var self = this,
				len = 0;

			self.forEach(function (item, key) { // forEach --> keys --> trim
				len += self._length(item);
			});

			return len;
		}
	},
	'itemCount': {
		enumerable : true,
		get: function () {
			this.__trim();
			return this._size;
		}
	},
	/* private */
	'__expair': {
		enumerable: false,
		value: function (t) { return this._maxAge ?  Date.now() > (t + this._maxAge)  : false; }
	},
	'__trim': {
		enumerable: false,
		value: function () {
			var self = this;

			var keys = Object.keys(self._storage)
				.filter(function (key) {
					var hit = self._storage[key];
					return hit && !hit.d && !self.__expair(hit.e);
				});

			if (keys.length > self._max) {
				keys = keys.sort(function (a, b) {
					var _a = self._storage[a],
						_b = self._storage[b];

					if (_a.l !== _b.l)
						return _a.l > _b.l ? -1 : 1;

					return _a.e > _b.e ? -1 : 1;
				})
				.splice(0, self._max);
			}

			self._size = self._heap = keys.length;

			self._storage = keys.reduce(function (memo, item) {
				memo[item] = self._storage[item];
				return memo;
			}, Object.create(null));
		}
	},
	'__has': {
		enumerable: false,
		value: function (key) {
			var hit = this._storage[key];

			if (hit) {
				if (hit.d)
					return false;

				if (this.__expair(hit.e)) {
					this.purge();
					return false;
				}

				return true;
			}

			return false;
		}
	},
	'__set': {
		enumerable: false,
		value: function (key, val) {
			var hit = this._storage[key];

			if (hit) {
				hit.v = val;
				hit.e = Date.now();

				if (hit.d) {
					hit.l = 0;
					hit.d = false;
					++this._size;
				}
			} else {
				hit = this._storage[key] = Object.create(null);

				hit.e = Date.now();
				hit.l = 0;
				hit.d = false;
				hit.v = val;

				++this._size;
				++this._heap;
			}

			this.purge();
		}
	},
	'__get': {
		enumerable: false,
		value: function (key) {
			if (this.__has(key)) {
				var hit = this._storage[key];

				++hit.l;
				hit.e = Date.now();
				return hit.v;
			}
		}
	},
	'__del': {
		enumerable: false,
		value: function (key) {
			var hit = this._storage[key];

			hit.d = true;
			--this._size;

			return hit;
		}
	}
});

module.exports = ARcache;