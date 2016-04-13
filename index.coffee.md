Allow clients access to (some) provisioning features
----------------------------------------------------

There are many possible approaches for this:
- use Socket.IO and make all methods Socket.io methods; in this case we will always use an admin account and there is no need for additional security CouchDB-wise
  - pros: easy to delineate
  - cons: can't use PouchDB client-side, breaks the "CouchDB is the API" design goal;
- use new HTTP methods; same as above;
- use native CouchDB methods -- need validation documents, views, etc. CouchDB-side; validation of access to methods is done here, while data access is done server side. DOES NOT WORK with e.g. native PUT because e.g. PouchDB uses bulk_docs, meaning checks have to be done CouchDB-side.
- use only the user DB; retrieve and push updates manually back to provisioning -- doesn't work because the user DB might be updated by other users with different priviledges.
- use a separate user DB for provisioning; but what of CDRs? CDRs should only be accessible via views and such anyway, because of records+fields filtering.

Different approaches are possible per DB, too. We need access to:
- provisioning (read-only, only to specific records, not necessarily to all fields?)
- cdrs, cdrs-client (read-only; some fields should not be accessible: registrant password, for example)
- voicemail -- current ACLs = members. roles: "update:user_db:" -- meaning no admins!!

For example, voicemail was designed to be user-accessible, but the current ACLs are not appropriate.

So:
- for provisioning, use filtered replication into session/user db, filtered replication out (validate_doc_update will enforce)
- for cdrs, proxy views (not going to replicate, filter, or anything, too costly)
- for voicemail, add missing roles in security doc

    request = (require 'superagent-as-promised') require 'superagent'
    seem = require 'seem'
    PouchDB = require 'pouchdb'

    set_voicemail_security = require './set-voicemail-security'

    seconds = 1000
    minutes = 60*seconds

    read = do ->
      fs = require 'fs'
      path = require 'path'
      (file) -> fs.readFileSync path.join(__dirname,file), 'utf8'

    update = seem (db,doc) ->
      {_rev} = yield db
        .get doc._id
        .catch -> {}
      doc._rev = _rev
      db.put doc

    pkg = require './package'

    id = "#{pkg.name}@#{pkg.version}"

The design document for the user's provisioning database.

    ddoc =
      _id: "_design/#{id}"
      language: 'coffeescript'

      validate_doc_update: read 'validate_user_doc.coffee'

      views:
        lib:
          deepEqual: read 'lib/deepEqual.coffee'
          replicated_ids: read 'lib/replicated_ids.coffee'
      filters:
        to_provisioning: read 'filter-to-provisioning.coffee'

The design document for the shared provisioning database.

    src_ddoc =
      _id: "_design/#{id}"
      language: 'coffeescript'

      views:
        lib:
          deepEqual: read 'lib/deepEqual.coffee'
          replicated_ids: read 'lib/replicated_ids.coffee'
      filters:
        from_provisioning: read 'filter-from-provisioning.coffee'

    @include = ->

Put source filter in master.

      prov_url = "#{@cfg.data.url}/provisioning"
      prov = new PouchDB prov_url
      update prov, src_ddoc

Provisioning User Database
==========================

      @on 'user-provisioning', seem ->
        user = @session.couchdb_username

Create user DB
--------------

        @session.database ?= "u#{uuid.v4()}"

        url = "#{@cfg.data.url}/#{@session.database}"

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

        yield request
          .put "#{url}/_security"
          .send
            members:
              users: [
                user
              ]
              roles: []
            admins:
              users: []
              roles: [
                '_admin'
              ]
            # Non-standard field, shoud still be kept.
            owner: user

Close
-----

        db.emit 'destroyed'
        db = null

Replication
-----------

        rep = prov.sync url,

- Force filtered replication from provisioning (continuous, create-db) -- filter receives roles as query params -- ideally do this when the user roles are modified, not when the user logs in!

          pull:
            live: true
            filter: "#{id}/from_provisioning"

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

CDRs
====

TBD

Allow access to cdrs-client on records that match a given number or domain.
Results come from a view and only show a limited set of fields.

Set Voicemail Security
======================

      @on 'user-voicemail', seem (voicemail_db) ->
        yield set_voicemail_security voicemail_db, @cfg.data.url

Return the db name

        @ack voicemail_db
