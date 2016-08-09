    module.exports = (doc, {query:{roles}}) ->
      roles = JSON.parse roles
      filter doc, roles
      replicated_ids = require './lib/replicated_ids'
      may = (role) -> role in roles

    module.exports.filter = filter = (doc,roles) ->

      # Do not replicate if the document is flagged for no user replication.
      return false if doc.user_access is false

      # Only replicate those types, regardless of what roles may contain.
      # Local-numbers, global-numbers, endpoints, and number-domain.
      return false unless doc._id.match replicated_ids

      return true if may doc._id

      if m = doc._id.match /^(?:number|endpoint):\d+@(\S+)$/
        domain = m[1]
        return true if may "number_domain:#{domain}"

      return false
