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

