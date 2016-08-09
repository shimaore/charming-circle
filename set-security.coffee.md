Set Voicemail Security
======================

    request = (require 'superagent-as-promised') require 'superagent'

    module.exports = set_voicemail_security = (voicemail_db,base,users = []) ->
      return unless typeof voicemail_db is 'string'
      return unless voicemail_db.match ///
        ^ u
        [a-f\d]{8} -
        [a-f\d]{4} -
        [a-f\d]{4} -
        [a-f\d]{4} -
        [a-f\d]{12}
        $ ///

Set the proper security document on voicemail.

      request
        .put "#{base}/#{voicemail_db}/_security"
        .send
          members:
            users: users
            roles: [
              "user_database:#{voicemail_db}"
              'update:user_db:'
            ]
          admins:
            users: []
            roles: [
              '_admin'
            ]
        .catch (error) ->
          debug "Put security for #{voicemail_db} #{error.stack ? error}"
