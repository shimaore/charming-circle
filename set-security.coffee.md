Set Security
============

    request = (require 'superagent-as-promised') require 'superagent'

    module.exports = set_security = (db,base,users = []) ->
      return unless typeof db is 'string'
      return unless db.match ///
        ^ u
        [a-f\d]{8} -
        [a-f\d]{4} -
        [a-f\d]{4} -
        [a-f\d]{4} -
        [a-f\d]{12}
        $ ///

Set the proper security document.

      request
        .put "#{base}/#{db}/_security"
        .send
          members:
            names: users
            roles: [
              "user_database:#{db}"
              'update:user_db:'
            ]
          admins:
            names: []
            roles: [
              '_admin'
            ]
        .catch (error) ->
          debug "Put security for #{db} #{error.stack ? error}"
