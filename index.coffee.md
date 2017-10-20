Allow clients access to (some) provisioning features
----------------------------------------------------

    seem = require 'seem'
    PouchDB = require 'pouchdb-core'
      .plugin require 'pouchdb-adapter-http'
    jsonBody = (require 'body-parser').json {}
    fs = require 'fs'
    path = require 'path'
    uuid = require 'uuid'

    set_security = require './set-security'

    pkg = require './package'
    @name = pkg.name
    debug = (require 'debug') @name

    seconds = 1000
    minutes = 60*seconds

    update_version = require 'marked-summer/update-version'
    sleep = require 'marked-summer/sleep'

    pkg = require './package'

    id = "#{pkg.name}"

### Encapsulate the function for CouchDB

CouchDB is finicky and requires parentheses around functions (not in all cases, but it's better to be safe).

    fun = (t) ->
      """ (function(){
        return #{t}.apply(this,arguments);
      })
      """

    lib_main = fs.readFileSync path.join(__dirname,'main.bundle.js'), 'utf-8'
    main = require './main'

The design document for the user's provisioning database.

    ddoc =
      _id: "_design/#{id}"
      language: 'javascript'
      version: pkg.version

      views:
        lib:
          main: lib_main

      validate_doc_update: fun '''
        require('views/lib/main').validate_user_doc
      '''

      filters:
        provisioning: fun '''
          require('views/lib/main').provisioning
        '''

The design document for the shared provisioning database.

    src_ddoc =
      _id: "_design/#{id}"
      language: 'javascript'
      version: pkg.version

      views:
        lib:
          main: lib_main
        roles:
          map: fun '''
            require('views/lib/main').provisioning.map
          '''

    @include = (plugins) ->
      load_user = @wrap (require 'spicy-action-user').middleware

Put source design document in master.

* cfg.data.url (URL with auth) points to the spicy-action services.

      prov_url = "#{ @cfg.data.url }/provisioning"
      prov = new PouchDB prov_url
      update_version prov, src_ddoc

Provisioning without User Database
==================================

      @get '/user-prov/_all_docs', @auth, ->

        roles = @session.couchdb_roles ? []

        {rows} = yield prov
          .query "#{id}/roles",
            reduce: false
            include_docs: true
            keys: roles

        @json rows.map (row) -> row.doc

      @get '/user-prov/:id', @auth, ->

        doc_id = @params.id
        unless doc_id?
          @res.status 400
          @json error:'No ID'
          return

        doc = yield prov
          .get doc_id
          .catch -> null

        unless doc?
          @res.status 404
          @json error:'Missing'
          return

        roles = @session.couchdb_roles ? []

        unless main.provisioning.filter doc, roles
          @res.status 404
          @json error:'Missing'
          return

        @json doc
        return

      @put '/user-prov/:id', @auth, jsonBody, ->

        doc_id = @params.id
        unless doc_id?
          @res.status 400
          @json error:'No ID'
          return

        doc = @body
        unless doc?
          @res.status 400
          @json error:'Missing JSON document'
          return

        unless doc._id? and doc._id is doc_id
          @res.status 400
          @json error:'ID does not match'
          return

        oldDoc = yield prov
          .get doc_id
          .catch -> null

        user = @session.couchdb_username

        roles = @session.couchdb_roles ? []

        userCtx =
          db: 'user-prov'
          name: user
          roles: roles

        secObj =
          members:
            names: [user]
            roles: []
          admins:
            names: []
            roles: []

        try
          main.validate_user_doc doc, oldDoc, userCtx, secObj
        catch error
          @res.status 400
          @json {error}
          return

        unless main.provisioning.filter doc, roles
          @res.status 400
          @json error 'Forbidden'
          return

        response = yield prov
          .put doc
          .catch (error) ->
            @res.status 400
            {error}

        @json response
        return

Provisioning User Database
==========================

See `spicy-action-user` for `@save_user`.

      @helper user_db: seem ->
        debug 'user_db'
        unless @session.database?
          @session.database = "u#{uuid.v4()}"
          yield @save_user?()
        "#{ @cfg.data.url }/#{@session.database}"

      @on 'user-provisioning', load_user, seem ->
        return unless @session?.couchdb_token?
        user = @session.couchdb_username

Create user DB
--------------

        url = yield @user_db()

        debug 'user_db', url

        db = new PouchDB url
        yield db.info()

Set `validate_doc_update`
-------------------------

It must enforce the presence of "updated_by" in all docs and the username must match the userCtx name.

        yield update_version db, ddoc

        if plugins?
          for plugin in plugins
            yield plugin.call this, db

Set security document on user DB
--------------------------------

- The user is a reader/writer.
- The user is not an admin on their own DB.

        debug 'user_db: updating security'
        yield set_security @session.database, @cfg.data.url, [user]

Close
-----

        debug 'user_db: close'
        yield db
          .close()
          .catch (error) ->
            debug "close user_db: #{error.stack ? error}"
            null
        db = null

Replication
-----------

        debug 'user_db: retrieving document IDs'

        roles = @session.couchdb_roles ? []

        {rows} = yield prov
          .query "#{id}/roles",
            reduce: false
            keys: roles

        doc_ids = rows.map (row) -> row.id

        debug 'user-provisioning: going to replicate', doc_ids

        rep = null

        start = =>
          debug 'user_db: start replication'
          rep = prov.sync url,

- Force replication from provisioning (continuous)

            push:
              doc_ids: doc_ids

- Force replication back to provisioning (continuous)

            pull:
              filter: "#{id}/provisioning"
              query_params:
                roles: JSON.stringify roles

Cancel the replication and close the database after a while.

          cancel = =>
            debug 'user_db: cancel replication'
            rep.cancel()
            rep = null
            debug 'replication:canceled'
            @emit 'replication:canceled', @session.database

          setTimeout cancel, @cfg.replication_timeout ? 30*minutes

          rep
            .on 'paused', =>
              debug 'replication:paused'
              @emit 'replication:paused', @session.database
            .on 'active', =>
              debug 'replication:active'
              @emit 'replication:active', @session.database
            .on 'denied', =>
              debug 'replication:denied'
              @emit 'replication:denied', @session.database
            .on 'complete', =>
              debug 'replication:complete'
              @emit 'replication:complete', @session.database
              @emit 'user-provisioning:content-ready', @session.database
            .on 'error', (error) =>
              debug 'replication:error', error
              @emit 'replication:error', @session.database

        start()

Return db name (it is up to the application to do a first run, then monitor changes)

        @ack @session.database
        @emit 'user-provisioning:database-ready', @session.database
        return

CDRs
====

TBD

Allow access to cdrs-client on records that match a given number or domain.
Results come from a view and only show a limited set of fields.

Set Voicemail Security
======================

      @get '/user-voicemail/:voicemail_db', seem ->
        voicemail_db = @params.voicemail_db
        if @session?.couchdb_token?
          yield set_security voicemail_db, @cfg.data.url
        @json ok:true

      @on 'user-voicemail', load_user, seem (voicemail_db) ->
        return unless @session?.couchdb_token?
        yield set_security voicemail_db, @cfg.data.url

Return the db name

        @ack voicemail_db
        @emit 'user-voicemail:ready', voicemail_db
