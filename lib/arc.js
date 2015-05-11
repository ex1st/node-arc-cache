'use strict';

function ARcache(options) {
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
			enumerable: true,
			set: function(_max) {
				this._max = parseInt(_max, 10) || Infinity;

				_interval = clearInterval(_interval);

				if (this._max === Infinity && this._maxAge)
					_interval = setInterval(this.__trim.bind(this), 1000 * 60 * 60);
				else
					this.purge();
			},
			get: function() {
				return this._max;
			}
		},
		'_storage': {
			writable: true,
			enumerable: false,
			value: Object.create(null)
		},
		'_recently': {
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
		'_miss': {
			writable: true,
			enumerable: false,
			value: 0
		},
		'_length': {
			enumerable: false,
			value: typeof options.length === 'function' ? options.length : function() { return 1; }
		}
	});

	this.max = options.max;
	this.maxAge = options.maxAge;
}

ARcache.prototype = {};

Object.defineProperties(ARcache.prototype, {
	/* public */
	'has': {
		enumerable: true,
		value: function(key) {
			return this.__has(key);
		}
	},
	'get': {
		enumerable: true,
		value: function(key) {
			return this.__get(key);
		}
	},
	'set': {
		enumerable: true,
		value: function(key, val) {
			this.__set(key, val);
		}
	},
	'del': {
		enumerable: true,
		value: function(key) {
			if (this.__has(key))
				return this.__del(key);
		}
	},
	'reset': {
		enumerable: true,
		value: function() {
			this._size = 0;
			this._heap = 0;
			this._miss = 0;
			this._storage = Object.create(null);
			this._recently = Object.create(null);
		}
	},
	'forEach': {
		enumerable: true,
		value: function(fn) {
			var self = this,
				keys = self.keys(),
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
		value: function() {
			return this.__trim();
		}
	},
	'values': {
		enumerable: true,
		value: function() {
			var self = this,
				keys = self.keys(),
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
		value: function() {
			if ((this._size >= this._max) || (this._heap > this._size * 2) || (this._max !== Infinity && this._miss > this._max)) {
				this.__trim();
				return this._size >= this._max;
			}
		}
	},
	'maxAge': {
		enumerable: true,
		set: function(_maxAge) {
			if (!_maxAge || typeof _maxAge !== 'number' || _maxAge <= 0)
				_maxAge = null;

			this._maxAge = _maxAge;
			this.purge();
		},
		get: function() {
			return this._maxAge;
		}
	},
	'length': {
		enumerable: true,
		get: function() {
			var foo = this._length,
				len = 0;

			this.forEach(function(item, key) {
				len += foo(item);
			});

			return len;
		}
	},
	'itemCount': {
		enumerable: true,
		get: function() {
			return this.__trim().length;
		}
	},
	/* private */
	'__expair': {
		enumerable: false,
		value: function(hit, key) {
			if (hit.d)
				return true;

			var exp = this._maxAge ? Date.now() > (hit.e + this._maxAge) : false;

			if (exp)
				this.__del(key);

			return exp;
		}
	},
	'__trim': {
		enumerable: false,
		value: function() {
			var self = this;
			self._miss = 0;

			var keys = Object.keys(self._storage)
				.filter(function(key) {
					return !self.__expair(self._storage[key], key);
				});

			if ((self._size <= self._max) && (self._heap < self._size * 2))
				return keys;

			keys = keys.sort(function(a, b) {
				if (self._recently[a] === self._recently[b])
					return self._storage[a].e > self._storage[b].e ? -1 : 1;

				return self._recently[a] > self._recently[b] ? -1 : 1;
			})
			.splice(0, self._max);

			self._size = self._heap = keys.length;

			self._storage = keys.reduce(function(memo, item) {
				memo[item] = self._storage[item];
				return memo;
			}, Object.create(null));

			return keys;
		}
	},
	'__has': {
		enumerable: false,
		value: function(key) {
			var hit = this._storage[key];

			if (hit) {
				if (hit.d)
					return false;

				if (this.__expair(hit, key)) {
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
		value: function(key, val) {
			this._recently[key] = this._recently[key] || 0;

			var hit = this._storage[key];

			if (hit) {
				hit.v = val;
				hit.e = Date.now();

				if (hit.d) {
					hit.d = false;
					++this._size;

					this.purge();
				}
			} else if (this._size < this._max) {
				hit = this._storage[key] = Object.create(null);

				hit.d = false;
				hit.v = val;
				hit.e = Date.now();

				++this._size;
				++this._heap;
			} else if (this._max !== Infinity && ++this._miss > this._max * 2)
				this.purge();
		}
	},
	'__get': {
		enumerable: false,
		value: function(key) {
			this._recently[key] = this._recently[key] || 0;
			++this._recently[key];

			if (this.__has(key))
				return this._storage[key].v;
		}
	},
	'__del': {
		enumerable: false,
		value: function(key) {
			var hit = this._storage[key];

			hit.d = true;
			--this._size;

			return hit;
		}
	}
});

module.exports = ARcache;
