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
      it 'provisioning', ->
        f = require '../provisioning.js'
        f.should.be.a 'function'
        f.should.have.property 'filter'
        f.should.have.property 'map'
      it 'validate-user-doc', ->
        f = require '../validate-user-doc.js'
        f.should.be.a 'function'

    describe 'provisioning filter', ->
      {filter} = require '../provisioning'

      it 'should filter documents properly', ->
        req = ['number:0123456@example.com','bear:large']
        filter(_id:'number:0123456@example.com',req).should.be.true
        filter(_id:'endpoint:0123456@example.com',req).should.be.false
        filter(_id:'bear:large',req).should.be.false

        req = ['number_domain:example.com']
        filter(_id:'number:0123456@example.com',req).should.be.true

    describe 'filter-provisioning (as query)', ->
        f = require '../provisioning'

        req = query: roles: JSON.stringify ['number:0123456@example.com','bear:large']
        f(_id:'number:0123456@example.com',req).should.be.true
        f(_id:'endpoint:0123456@example.com',req).should.be.false
        f(_id:'bear:large',req).should.be.false

        req = query: roles: JSON.stringify ['number_domain:example.com']
        f(_id:'number:0123456@example.com',req).should.be.true

    describe 'validate-user-doc', ->

      f = require '../validate-user-doc'

      userCtx =
        name: 'jane'
        roles: [ 'juggler', 'number:23@ex1' ]
      secObj =
        members:
          names: ['jane']

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
          inv_timer: 14
          updated_by: 'jane'

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
          updated_by: 'joe'

        should.Throw -> f newDoc,oldDoc,userCtx,secObj

    describe 'Zappa', ->
      Z = require 'zappajs'
      it 'should run the include', ->
        Z ->
          @cfg =
            data:
              url: 'http://127.0.0.1:3000/foo'
          @auth = []
          @include '../'
