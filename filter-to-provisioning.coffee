replicated_ids = require 'lib/replicated_ids'
(doc,req) ->
  # Only replicate local numbers, endpoints, or number_domains.
  return doc._id.match replicated_ids
