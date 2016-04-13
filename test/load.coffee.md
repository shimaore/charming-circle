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
      it 'set-voicemail-security', ->
        f = require '../set-voicemail-security'
        f.should.be.a 'function'
      it 'lib/deepEqual', ->
        f = require '../lib/deepEqual'
        f.should.be.a 'function'
      it 'lib/replicated_ids', ->
        f = require '../lib/replicated_ids'
        f.should.be.a 'RegExp'

    describe 'Loading', ->
      read = (file) -> (require 'fs').readFileSync file, 'utf8'
      cc = (m) ->
        eval m.replace /// 'lib/([^']+)' ///, "'../lib/$1.js'"
      it 'filter-from-provisioning', ->
        f = cc read './filter-from-provisioning.js'
        f.should.be.a 'function'
      it 'filter-to-provisioning', ->
        f = cc read './filter-to-provisioning.js'
        f.should.be.a 'function'
      it 'validate_user_doc', ->
        f = cc read './validate_user_doc.js'
        f.should.be.a 'function'

        oldDoc =
          _id: 'number:23@ex1'
          type: 'number'
          number: '23@ex1'
          cfa_number: '42'
        newDoc =
          _id: 'number:23@ex1'
          type: 'number'
          number: '23@ex1'
          cfa_number: '54'
          updated_by: 'foo'
        userCtx =
          name: 'foo'
          roles: [ 'juggler', 'number:23@ex1' ]
        secObj =
          owner: 'foo'

        should.not.Throw -> f newDoc,oldDoc,userCtx,secObj

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
