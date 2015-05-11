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
				_max = parseInt(_max);

				if (!_max || _max <= 0)
					_max = Infinity;

				this._max = _max;

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
		'_last': {
			writable: true,
			enumerable: false,
			value: undefined
		},
		'_length': {
			enumerable: false,
			value: typeof options.length === 'function' ? options.length : function() {
				return 1;
			}
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
		value: function(key, val, maxAge) {
			this.__set(key, val, maxAge);
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
			this._miss = 0;
			this._last = undefined;
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
			if ((this._size >= this._max) || (this._max !== Infinity && this._miss > this._max)) {
				this.__trim();
				return this._size >= this._max;
			}
		}
	},
	'maxAge': {
		enumerable: true,
		set: function(_maxAge) {
			_maxAge = parseInt(_maxAge);

			if (!_maxAge || _maxAge <= 0)
				_maxAge = null;

			this._maxAge = _maxAge;
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
			var exp = hit.e && Date.now() > hit.e;

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
					return self._storage[key] && !self.__expair(self._storage[key], key);
				});

			if (self._size > self._max) {
				self._storage = keys.sort(function(a, b) {
						if (self._recently[a] === self._recently[b])
							return self._storage[a].e > self._storage[b].e ? -1 : 1;

						return self._recently[a] > self._recently[b] ? -1 : 1;
					})
					.splice(0, self._max)
					.reduce(function(memo, item) {
						memo[item] = self._storage[item];
						return memo;
					}, Object.create(null));

				self._size = keys.length;
			}

			self._last = keys[keys.length - 1];

			return keys;
		}
	},
	'__has': {
		enumerable: false,
		value: function(key) {
			var hit = this._storage[key];

			if (hit) {
				if (this.__expair(hit, key)) {
					return false;
				}

				return true;
			}

			return false;
		}
	},
	'__set': {
		enumerable: false,
		value: function(key, val, maxAge) {
			if (maxAge)
				maxAge = parseInt(maxAge);

			if (!maxAge || maxAge <= 0)
				maxAge = this._maxAge;

			this._recently[key] = this._recently[key] || 0;
			this._last = this._last || key;

			var hit = this._storage[key];

			if (hit) {
				hit.v = val;
				hit.e = maxAge ? Date.now() + maxAge : undefined;

				return;
			}

			var need_p = false;

			if (this._size >= this._max && this._recently[key] > this._recently[this._last]) {
				this.__del(this._last);
				need_p = true;
			}

			if (this._size < this._max) {
				hit = this._storage[key] = {
					v: val,
					e: maxAge ? Date.now() + maxAge : undefined
				}

				++this._size;
			} else if (this._max !== Infinity && ++this._miss > this._max) {
				need_p = true;
			}

			if (need_p)
				this.purge();
		}
	},
	'__get': {
		enumerable: false,
		value: function(key) {
			this._recently[key] = this._recently[key] || 0;
			++this._recently[key];

			if (this.__has(key)) {
				this._last = this._last || key;

				if (this._recently[this._last] > this._recently[key])
					this._last = key;

				return this._storage[key].v;
			}
		}
	},
	'__del': {
		enumerable: false,
		value: function(key) {
			var hit = this._storage[key];

			delete this._storage[key];
			--this._size;

			if (this._last === key)
				this._last = undefined;

			return hit.v;
		}
	}
});

module.exports = ARcache;
