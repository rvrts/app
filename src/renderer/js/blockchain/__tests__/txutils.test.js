jest.autoMockOff()

var assert = require.requireActual('assert')
var CoinKey = require.requireActual('coinkey')
var cointx = require.requireActual('cointx')
var Transaction = cointx.Transaction
var txUtils = require.requireActual('../txutils')
var fixtures = require.requireActual('./txutils.fixtures')

describe('txutils', function() {
  describe('serializeToHex()', function() {
    var txData0 = fixtures.valid[0]
    var key = CoinKey.fromWif(txData0.sender.wif)

    it('should properly serialize the first transaction', function() {
      var tx = new Transaction()
      tx.time = txData0.time

      var walletBalance = txData0.utxos.reduce(function(amount, unspent) { 
        return unspent.value + amount
      }, 0)

      txData0.utxos.forEach(function(unspent) {
        tx.addInput(unspent.txId, unspent.vout)
      })

      var recvrPubKeyHashScript = txUtils.addressToOutputScript(txData0.receiver.address)
      tx.addOutput(recvrPubKeyHashScript, txData0.amount)

      // change output
      var senderPubKeyHashScript = txUtils.addressToOutputScript(txData0.sender.address) 
      var change = walletBalance - txData0.amount - txData0.fee
      assert.equal(change, txData0.change)
      tx.addOutput(senderPubKeyHashScript, walletBalance - txData0.amount - txData0.fee)

      tx.ins.forEach(function(input, index) {
        txUtils.sign(tx, index, key)
      })

      assert.equal(txUtils.serializeToHex(tx), txData0.hex)

    })
  })

  describe('parseFromHex()', function() {
    var txData0 = fixtures.valid[0]

    it('should properly parse the first transaction', function() {
      var tx = txUtils.parseFromHex(txData0.hex)
      assert.equal(tx.time, txData0.time)
      assert.equal(tx.locktime, 0)
      assert.equal(tx.ins.length, 1)
      assert.equal(tx.outs.length, 2)

      // want hash, not txId, need little-endian
      var txInHash = [].reverse.call(new Buffer(txData0.utxos[0].txId, 'hex'))
      assert.equal(tx.ins[0].hash.toString('hex'), txInHash.toString('hex'))
      assert.equal(tx.ins[0].index, txData0.utxos[0].vout)

      // compare receiver
      var recvrPubKeyHashScript = txUtils.addressToOutputScript(txData0.receiver.address)
      assert.equal(tx.outs[0].script.toHex(), recvrPubKeyHashScript.toHex())
      assert.equal(tx.outs[0].value, txData0.amount)

      // compare change address
      var senderPubKeyHashScript = txUtils.addressToOutputScript(txData0.sender.address) 
      assert.equal(tx.outs[1].script.toHex(), senderPubKeyHashScript.toHex())
      assert.equal(tx.outs[1].value, txData0.change)

      // fee
      assert.equal(txData0.utxos[0].value - tx.outs[0].value - tx.outs[1].value,  txData0.fee)      
    })
  })

  describe('> serialize / parse', function() {
    var txData0 = fixtures.valid[0]
    
    it('should return itself after serialize and then parse', function() {
      assert.equal(txUtils.serializeToHex(txUtils.parseFromHex(txData0.hex)), txData0.hex)
    })
  })
})