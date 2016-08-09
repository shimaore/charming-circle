    module.exports = filter = (doc) ->
      replicated_ids = require './lib/replicated_ids'
      # Only replicate local numbers, endpoints, or number_domains.
      return doc._id.match replicated_ids

    module.exports.filter = filter
