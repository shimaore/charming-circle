    chai = require 'chai'
    should = chai.should()

    describe 'Loading', ->
      it 'index', ->
        f = require '../index'
        f.should.have.a.property 'include'
        f.include.should.be.a 'function'
      it 'package', ->
        f = require '../package'
        f.should.be.an 'Object'
      it 'set-security', ->
        f = require '../set-security'
        f.should.be.a 'function'
      it 'lib/replicated_ids', ->
        f = require '../lib/replicated_ids'
        f.should.be.a 'RegExp'

    describe 'Loading', ->
      it 'filter-from-provisioning', ->
        f = require '../filter-from-provisioning.js'
        f.should.be.a 'function'
      it 'filter-to-provisioning', ->
        f = require '../filter-to-provisioning.js'
        f.should.be.a 'function'
      it 'validate_user_doc', ->
        f = require '../validate_user_doc.js'
        f.should.be.a 'function'

    describe 'validate_user_doc', ->

      f = require '../validate_user_doc'

      userCtx =
        name: 'foo'
        roles: [ 'juggler', 'number:23@ex1' ]
      secObj =
        owner: 'foo'
        members:
          names: []
          roles: []
        admins:
          names: []
          roles: []

      oldDoc =
        _id: 'number:23@ex1'
        type: 'number'
        number: '23@ex1'
        cfa_number: '42'

      it 'should accept valid changes', ->

        newDoc =
          _id: 'number:23@ex1'
          type: 'number'
          number: '23@ex1'
          cfa_number: '54'
          cfa_enabled: true
          updated_by: 'foo'

        try
          f newDoc,oldDoc,userCtx,secObj
        catch error
          console.dir error

        should.not.Throw -> f newDoc,oldDoc,userCtx,secObj

      it 'should reject invalid changes', ->

        newDoc =
          _id: 'number:23@ex1'
          type: 'number'
          number: '23@ex1'
          cfa_number: '54'
          account: 'mememe'
          updated_by: 'foo'

        should.Throw -> f newDoc,oldDoc,userCtx,secObj

    describe 'Zappa', ->
      Z = require 'zappajs'
      it 'should run the include', ->
        Z ->
          @cfg =
            data:
              url: 'foo'
          @include '../'
