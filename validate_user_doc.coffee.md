    module.exports = (doc, oldDoc, userCtx, secObj) ->

      # validate_user_doc.coffee
      deepEqual = require 'lib/deepEqual'

      digits = (v) -> typeof v is 'string' and v.match /^\d+$/
      boolean = (v) -> v is true or v is false
      optional_digits = (v) -> not v? or digits v
      array = (v) -> typeof v is 'object' and v?.length?
      timezone = (v) -> typeof v is 'string'
      language = (v) -> typeof v is 'string'

      do ->
        assert = (t,m) ->
          if not t
            throw error: m ? 'assertion failed'
        assert ( digits '12345'             ) , 'digits'
        assert ( not digits '123f5'         ) , 'not digits'
        assert ( not digits null            ) , 'not digits'
        assert ( boolean true               ) , 'boolean'
        assert ( boolean false              ) , 'boolean'
        assert ( not boolean 3              ) , 'not boolean'
        assert ( not boolean null           ) , 'not boolean'
        assert ( optional_digits null       ) , 'optional digits'
        assert ( optional_digits '42'       ) , 'optional digits'
        assert ( not optional_digits true   ) , 'not optional digits'
        assert ( array []                   ) , 'array'
        assert ( array [12,34,56]           ) , 'array'
        assert ( not array true             ) , 'not array'
        assert ( not array null             ) , 'not array'
        assert ( not array {}               ) , 'not array'
        assert ( not array 'foo'            ) , 'not array'
        assert ( timezone 'UTC'             ) , 'timezone'
        assert ( timezone 'Europe/Paris'    ) , 'timezone'
        assert ( not timezone null          ) , 'not timezone'
        assert ( language 'fr'              ) , 'language'
        assert ( language 'en'              ) , 'language'
        assert ( not language null          ) , 'not language'

      Validate =
        local_number:
          cfa_enabled: boolean
          cfa_number: optional_digits
          cfa_voicemail: boolean
          cfb_enabled: boolean
          cfb_number: optional_digits
          cfb_voicemail: boolean
          cfda_enabled: boolean
          cfda_number: optional_digits
          cfda_voicemail: boolean
          cfnr_enabled: boolean
          cfnr_number: optional_digits
          cfnr_voicemail: boolean
          inv_timer: digits
          list_to_voicemail: boolean
          ornaments: array
          privacy: boolean
          reject_anonymous: boolean
          reject_anonymous_to_voicemail: boolean
          ring_ready: boolean
          timezone: timezone
          use_blacklist: boolean
          use_whitelist: boolean

        global_number:
          language: language
          local_number: (v) -> may "number:#{v}"

        endpoint: {}

        number_domain:
          fifos: array

      {name,roles} = userCtx
      {owner} = secObj

      may = (role) -> role in roles
      has = (field) -> field of doc
      had = (field) -> field of oldDoc
      forbidden = (reason) -> throw forbidden: reason
      required = (field) ->
        forbidden "Missing `#{field}` field." unless has field

      # Only validate content that might be replicated.
      unless m = doc._id.match /^(number|endpoint|number_domain):(.+)$/
        return

      type = m[1]
      key = m[2]

      # Authorize based on roles

      if '_admin' in roles
        return

      unless name?
        throw unauthorized: 'Not logged in.'

      unless name is owner
        throw unauthorized: 'Not owner.'

      unless has 'updated_by'
        forbidden 'Field `updated_by` is required.'

      unless doc.updated_by is name
        forbidden "Field `updated_by` must contain `#{name}`."

      if doc.user_access is false
        forbidden 'You may not set `user_access` to false.'

      might = ->
        return true if may doc._id
        if m = doc._id.match /^(?:number|endpoint):\d+@(\S+)$/
          domain = m[1]
          return true if may "number_domain:#{domain}"
        return false

      unless might()
        forbidden 'Not permitted to modify this record.'

      # Authorize based on content / changes

      if doc._deleted
        forbidden "You may not delete `#{type}` documents."

      unless oldDoc?
        forbidden "You may not create `#{type}` documents."

      unless doc.type is type
        forbidden 'Missing or invalid `type` field.'

      unless doc[type] is key
        forbidden "Field `#{type}` must contain `#{key}`."

      validate_field = switch
        when type is 'number' and '@' in key # local-number
          Validate.local_number

        when type is 'number' and '@' not in key # global-number
          Validate.global_number

        when type is 'endpoint'
          Validate.endpoint

        when type is 'number_domain'
          Validate.number_domain

        else
          forbidden "Internal error on `#{type}`."

      for own k of doc when k isnt 'updated_by'
        unless had k
          forbidden "Field `#{k}` was added."
      for own k of oldDoc
        unless has k
          forbidden "Field `#{k}` was removed."
      for own k,v of doc when k isnt 'updated_by'
        unless validate_field[k]?(v) or deepEqual oldDoc[k], doc[k]
          forbidden "Field `#{k}` was modified"

      # OK, everything is fine!
      return
