Allow clients access to (some) provisioning features
----------------------------------------------------

    request = (require 'superagent-as-promised') require 'superagent'
    seem = require 'seem'
    PouchDB = require 'pouchdb'
    fs = require 'fs'
    path = require 'path'

    set_security = require './set-security'

    seconds = 1000
    minutes = 60*seconds

    update = seem (db,doc) ->
      {_rev} = yield db
        .get doc._id
        .catch -> {}
      doc._rev = _rev
      db.put doc

    pkg = require './package'

    id = "#{pkg.name}@#{pkg.version}"

### Encapsulate the function for CouchDB

CouchDB is finicky and requires parentheses around functions (not in all cases, but it's better to be safe).

    fun = (t) ->
      """ (function(){
        #{t}.apply(this,arguments);
      })
      """

    lib_main = fs.readFileSync path.join(__dirname,'main.bundle.js'), 'utf-8'

The design document for the user's provisioning database.

    ddoc =
      _id: "_design/#{id}"
      language: 'javascript'

      lib:
        main: lib_main

      validate_doc_update: fun '''
        require('lib/main').validate_user_doc
      '''

      filters:
        to_provisioning: fun '''
          require('lib/main').to_provisioning
        '''

The design document for the shared provisioning database.

    src_ddoc =
      _id: "_design/#{id}"
      language: 'javascript'

      lib:
        main: lib_main
      views:
        roles:
          map: fun '''
            require('lib/main').from_provisioning.map
          '''
      filters:
        from_provisioning: fun '''
          require('lib/main').from_provisioning
        '''

    @include = ->

Put source filter in master.

* cfg.data.url (URL with auth) points to the spicy-action services.

      prov_url = "#{ @cfg.data.url }/provisioning"
      prov = new PouchDB prov_url
      update prov, src_ddoc

Provisioning User Database
==========================

See `spicy-action-user` for `@save_user`.

      @helper user_db: seem ->
        @session.database ?= "u#{uuid.v4()}"
        yield @save_user?()
        "#{ @cfg.data.url }/#{@session.database}"

      @on 'user-provisioning', seem ->
        return unless @session.couchdb_token
        user = @session.couchdb_username

Create user DB
--------------

        url = yield @user_db()

        db = new PouchDB url
        yield db.info()

Set `validate_doc_update`
-------------------------

It must enforce the presence of "updated_by" in all docs and the username must match the userCtx name.

        yield update db, ddoc

Set security document on user DB
--------------------------------

- The user is a reader/writer.
- The user is not an admin on their own DB.

        yield set_security @session.database, @cfg.data.url, [user]

Close
-----

        yield db.close()
        db = null

Replication
-----------

        rep = prov.sync url,

- Force filtered replication from provisioning (continuous, create-db) -- filter receives roles as query params -- ideally do this when the user roles are modified, not when the user logs in!

          pull:
            live: true
            filter: "#{id}/from_provisioning"
            query_params:
              roles: JSON.stringify @session.couchdb_roles

- Force filtered replication back to provisioning (continuous)

          push:
            live: true
            filter: "#{id}/to_provisioning"

Cancel the replication and close the database after a while.

        cancel = =>
          rep.cancel()
          rep = null
          @emit 'replication:canceled'

        setTimeout cancel, @cfg.replication_timeout ? 30*minutes

        rep
          .on 'paused', => @emit 'replication:paused'
          .on 'active', => @emit 'replication:active'
          .on 'denied', => @emit 'replication:denied'
          .on 'complete', => @emit 'replication:complete'
          .on 'error', => @emit 'replication:error'

Return db name (it is up to the application to do a first run, then monitor changes)

        @ack @session.database
        rep.on 'complete', =>
          @emit 'user-provisioning:content-ready', @session.database

        @emit 'user-provisioning:database-ready', @session.database
        return

CDRs
====

TBD

Allow access to cdrs-client on records that match a given number or domain.
Results come from a view and only show a limited set of fields.

Set Voicemail Security
======================

      @on 'user-voicemail', seem (voicemail_db) ->
        return unless @session.couchdb_token
        yield set_security voicemail_db, @cfg.data.url

Return the db name

        @ack voicemail_db
        @emit 'user-voicemail:ready', voicemail_db
