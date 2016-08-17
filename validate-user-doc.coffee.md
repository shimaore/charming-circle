    windy_moon = require 'windy-moon'
    {optional,digits,boolean,array,timezone,language} = require 'windy-moon/types'
    module.exports = windy_moon.main ->

      cf = (name) ->
        (v,doc) ->
          if doc["cf#{name}_enabled"] and not doc["cf#{name}_voicemail"]
            digits v
          else
            optional digits v

      Validate =
        local_number:
          cfa_enabled: optional boolean
          cfa_number: cf 'a'
          cfa_voicemail: optional boolean
          cfb_enabled: optional boolean
          cfb_number: cf 'b'
          cfb_voicemail: optional boolean
          cfda_enabled: optional boolean
          cfda_number: cf 'da'
          cfda_voicemail: optional boolean
          cfnr_enabled: optional boolean
          cfnr_number: cf 'nr'
          cfnr_voicemail: optional boolean
          inv_timer: optional (v) -> typeof v is 'number'
          list_to_voicemail: optional boolean
          ornaments: optional array
          privacy: optional boolean
          reject_anonymous: optional boolean
          reject_anonymous_to_voicemail: optional boolean
          ring_ready: optional boolean
          timezone: optional timezone
          use_blacklist: optional boolean
          use_whitelist: optional boolean

        global_number:
          language: language
          local_number: (v) -> may "number:#{v}"

        endpoint: {}

        number_domain:
          fifos: array

      # Only validate content that might be replicated.
      unless @type? and @key?
        return

      # Authorize based on roles

      if @is_admin()
        return

      @enforce_logged_in()
      @enforce_ownership()
      @enforce_updated_by()

      if @doc.user_access is false
        @forbidden 'You may not set `user_access` to false.'

      @enforce_might()

      # Authorize based on content / changes

      @forbid_deletion()
      @forbid_creation()

      validators = switch @validate_type()
        when 'local-number'
          Validate.local_number

        when 'global-number'
          Validate.global_number

        when 'endpoint'
          Validate.endpoint

        when 'number_domain'
          Validate.number_domain

        else
          @forbidden "Internal error on `#{@type}`."

      modifiable_fields = Object.keys validators

      @restrict_adding_fields ['updated_by',modifiable_fields...]
      @restrict_removing_fields()
      @validate_fields validators
      @restrict_modifying_fields ['updated_by',modifiable_fields...]

      # OK, everything is fine!
      return
