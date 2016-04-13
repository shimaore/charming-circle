Based on https://github.com/substack/node-deep-equal/blob/master/index.js
except that
doc content is supposed to be JSON, so do not account for
Date, Buffer, arguments, etc.

    module.exports = deepEqual = (a,b) ->
      # Identical values: null, string, numbers, booleans
      return true if a is b
      return false if typeof a isnt typeof b
      # Otherwise should be object
      return false unless typeof a is 'object'

      return false unless a.prototype is b.prototype
      ka = Object.keys a
      kb = Object.keys b
      return false unless ka.length is kb.length
      ka.sort()
      kb.sort()
      for v,i in ka
        return false unless v is kb[i]
      for v in ka
        return false unless deepEqual a[v], b[v]
      typeof a is typeof b
