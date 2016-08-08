    module.exports = windy_moon.main ->

      {digits,boolean,optional_digits,array,timezone,language} = require 'windy_moon/types'

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

      validate_field = switch @validate_type()
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

      @forbid_adding_fields ['updated_by']
      @forbid_removing_fields()
      @validate_fields validate_field, ['updated_by']
      @forbid_modifying_fields ['updated_by']

      # OK, everything is fine!
      return
