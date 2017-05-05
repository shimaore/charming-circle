Additionally, if the spicy-action server does `@include require 'charming-circle'`,
we will get access to per-user provisioning database.
Obtain access to the user's database.

    debug = (require 'debug') 'charming-circle:mixin'

    exports.include = ({ev}) ->

      timer = null

      @on 'ready', ->
        debug 'received ready ← server'

        user_prov = =>
          debug 'emit user-provisioning → server'
          @emit 'user-provisioning'

        clearInterval timer if timer?
        timer = setInterval user_prov, 30*1000
        user_prov()

      ev.on 'user-provisioning', =>
        debug 'emit user-provisioning → server'
        @emit 'user-provisioning'

      @on 'user-provisioning:content-ready', (db) ->
        debug 'received content-ready ← server', db

      @on 'user-provisioning:database-ready', (db) ->
        debug 'received database-ready ← server', db
        ev.trigger 'database-ready', db
