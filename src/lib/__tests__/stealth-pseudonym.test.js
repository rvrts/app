var assert = require('assert')
var proxyquire = require('proxyquire')
var _ = require('lodash')
var Stealth = require('stealth')
var txUtils = require('../../blockchain/txutils')
var fixtures = require('./stealth-pseudonym.fixtures')

/* global describe, it */

var blkqtStub = {
  '@noCallThru': true // for proxyquire
}
var cryptocoin = _.assign({'@noCallThru': true}, require('../../common/cryptocoin'))

describe('stealth-pseudonym', function () {
  describe('createRegistryTx', function () {
    it('should create a pseudonym registery transaction', function (done) {
      var f0 = fixtures.createTx.valid[0]
      var blkqt = _.assign({
        getUnspents: function (address, callback) {
          callback(null, f0.utxos)
        },
        getNewAddress: function (callback) {
          callback(null, f0.standardOutputs[0].address)
        },
        getWif: function (address, callback) {
          callback(null, f0.utxoKeys[0])
        }
      }, blkqtStub)

      var stubs = {
        '../lib/blkqt': blkqt,
        '../common/cryptocoin': cryptocoin,
        '../blockchain/txutils': {
          setCurrentTime: function (tx) {
            tx.timestamp = f0.timestamp
          }
        }
      }

      var stealthPseudonym = proxyquire('../stealth-pseudonym', stubs)
      var stealthKey = Stealth.fromJSON(JSON.stringify(f0.stealth))
      stealthPseudonym.createRegistryTx(f0.pseudonym, stealthKey, function (err, tx) {
        assert.ifError(err)
        var hex = txUtils.serializeToHex(tx)
        assert.strictEqual(f0.txHex, hex)
        done()
      })
    })
  })

  describe('checkTx', function () {
    it('should return the pub keys and pseudonym of a valid tx', function () {
      var f0 = fixtures.createTx.valid[0]
      var stealthPseudonym = require('../stealth-pseudonym')
      var res = stealthPseudonym.checkTx(f0.txHex)

      assert.strictEqual(res.pseudonym, f0.pseudonym)
      assert.strictEqual(res.scanPubKey.toString('hex'), f0.stealth.scanPubKey)
      assert.strictEqual(res.payloadPubKey.toString('hex'), f0.stealth.payloadPubKey)
    })
  })
})
