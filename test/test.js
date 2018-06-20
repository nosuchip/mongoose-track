'use strict';

const expect = require('chai').expect;
const mongooseTrack = require('../');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost/mongoose-track-test';

const mongoose = require('mongoose');

function checkHistory(instance, type, after, before, path) {
  expect(instance.history[0]).to.have.property('_id');
  expect(instance.history[0]).to.have.property('date');
  expect(instance.history[0]).to.have.property('changes').lengthOf(1);

  expect(instance.history[0].changes[0]).to.have.deep.property('type', type);
  if (typeof after !== 'undefined') {
    expect(instance.history[0].changes[0]).to.have.deep.property('after', after);
  }

  if (typeof before !== 'undefined') {
    expect(instance.history[0].changes[0]).to.have.deep.property('before', before);
  }

  expect(instance.history[0].changes[0]).to.have.deep.property('path', path);
}

describe('Trackable model', () => {
  let connection;
  let Model;

  before(function(done) {
    const schema = new mongoose.Schema({
      str: {type: String, default: undefined},
      num: {type: Number, default: undefined},
      arr: {type: Array, default: undefined},
      obj: {type: mongoose.Schema.Types.Mixed, default: undefined}
    }).plugin(mongooseTrack.plugin);
    Model = mongoose.model('Model', schema, 'models');

    mongoose.Promise = Promise;
    mongoose.connect(mongoUri);
    connection = mongoose.connection;

    connection.on('error', done);
    connection.once('open', done);
  });

  beforeEach(function(done) {
    connection.db.collection('models').remove(function(err, result) {
      if (err) return done(err);
      done();
    });
  });

  after(function(done) {
    if (connection) connection.close();
    done();
  });

  it('should track changes in string field', async function () {
    const testValue1 = 'Hello, world!';
    const testValue2 = 'Goodbye, cruel world!';

    const instance = new Model({str: testValue1});
    await instance.save();

    expect(instance.history).to.have.lengthOf(1);
    checkHistory(instance, 'N', testValue1, undefined, ['str']);

    instance.str = testValue2;
    await instance.save();

    expect(instance.history).to.have.lengthOf(2);
    checkHistory(instance, 'E', testValue2, undefined, ['str']);

    instance.str = undefined;
    await instance.save();

    expect(instance.history).to.have.lengthOf(3);
    checkHistory(instance, 'D', undefined, testValue2, ['str']);
  });

  it('should track changes in number field', async function () {
    const testValue1 = 123456789;
    const testValue2 = 987654321;

    const instance = new Model({num: testValue1});
    await instance.save();

    expect(instance.history).to.have.lengthOf(1);
    checkHistory(instance, 'N', testValue1, undefined, ['num']);

    instance.num = testValue2;
    await instance.save();

    expect(instance.history).to.have.lengthOf(2);
    checkHistory(instance, 'E', testValue2, undefined, ['num']);

    instance.num = undefined;
    await instance.save();

    expect(instance.history).to.have.lengthOf(3);
    checkHistory(instance, 'D', undefined, testValue2, ['num']);
  });

  it('should track changes in array field', async function () {
    const testValue1 = 'something';
    const testValue2 = 'very-very';
    const testValue3 = 'awful';

    const instance = new Model({arr: []});
    await instance.save();

    expect(instance.history).to.have.lengthOf(1);
    checkHistory(instance, 'N', [], undefined, ['arr']);

    instance.arr.push(testValue1);
    await instance.save();

    expect(instance.history).to.have.lengthOf(2);
    checkHistory(instance, 'A', undefined, undefined, ['arr']);
    expect(instance.history[0].changes[0]).to.have.property('_id');
    expect(instance.history[0].changes[0]).to.have.property('item');
    expect(instance.history[0].changes[0]).to.have.deep.property('type', 'A');
    // expect(instance.history[0].changes[0].item).to.have.deep.property('kind', 'N');
    // expect(instance.history[0].changes[0].item).to.have.deep.property('rhs', testValue1);

    instance.arr.push(testValue2);
    await instance.save();

    console.log('>>', JSON.stringify(instance.history[0].changes));

    // expect(instance.history).to.have.lengthOf(3);
    // checkHistory(instance, 'A', undefined, undefined, ['arr']);
    // expect(instance.history[0].changes[0]).to.have.property('_id');
    // expect(instance.history[0].changes[0]).to.have.property('item');
    // expect(instance.history[0].changes[0]).to.have.deep.property('type', 'A');
    // expect(instance.history[0].changes[0].item).to.have.deep.property('kind', 'N');
    // expect(instance.history[0].changes[0].item).to.have.deep.property('rhs', testValue2);

    instance.arr.unshift(testValue3);
    instance.arr.push('AAA');
    instance.arr.push('BBB');
    instance.arr.shift('CCC');
    instance.arr.splice(2, 0, 'QQQ');
    await instance.save();

    console.log('>>', JSON.stringify(instance.history[0].changes));

    instance.arr.shift();
    await instance.save();

    console.log('>>', JSON.stringify(instance.history[0].changes));

    // checkHistory(instance, 'A', undefined, undefined, ['arr']);
    // expect(instance.history[0].changes[0]).to.have.property('_id');
    // expect(instance.history[0].changes[0]).to.have.property('item');
    // expect(instance.history[0].changes[0]).to.have.deep.property('type', 'A');
    // expect(instance.history[0].changes[0].item).to.have.deep.property('kind', 'N');
    // expect(instance.history[0].changes[0].item).to.have.deep.property('rhs', testValue2);
  });


/*
  it('should track changes in object field', async function () {
    const testKey1 = 'a';
    const testValue1 = 1;
    const testKey2 = 'b';
    const testValue2 = 2;

    const instance = new Model({obj: {}});
    await instance.save();

    expect(instance.history).to.have.lengthOf(1);
    expect(instance.history[0]).to.have.property('_id');
    expect(instance.history[0]).to.have.property('changes').lengthOf(0);

    instance.obj[testKey1] = testValue1;
    await instance.save();

    expect(instance.history).to.have.lengthOf(2);
    checkHistory(instance, 'N', {[t undefined,estKey1]: testValue1}, ['obj']);

    instance.obj[testKey2] = testValue2;
    await instance.save();

    expect(instance.history).to.have.lengthOf(3);
    checkHistory(instance, 'N', {[t undefined,estKey1]: testValue1, [testKey2]: testValue2}, ['obj']);

    delete instance.obj[testKey2];
    await instance.save();

    expect(instance.history).to.have.lengthOf(4);
    checkHistory(instance, 'N', {[t undefined,estKey1]: testValue1}, ['obj']);

    // instance.arr.push(testValue1);
    // await instance.save();

    // expect(instance.history).to.have.lengthOf(2);
    // checkHistory(instance, 'N', [testValue1] undefined,, ['arr']);

    // instance.arr.push(testValue2);
    // await instance.save();

    // expect(instance.history).to.have.lengthOf(3);
    // checkHistory(instance, 'N', [testValue1, undefined, testValue2], ['arr']);

    // instance.arr.shift();
    // await instance.save();

    // expect(instance.history).to.have.lengthOf(4);
    // checkHistory(instance, 'N', [testValue2] undefined,, ['arr']);
  });
  */
});
