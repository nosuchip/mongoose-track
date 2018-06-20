[![NPM](https://nodei.co/npm/mongoose-track.png)](https://nodei.co/npm/mongoose-track/)

# Mongoose Track

Mongoose Track allows you to track and manage document changes (deeply) with author references.

## Install

```shell
npm i mongoose-track --save
```

## Getting Started

```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')
mongooseTrack.options = { ... }

let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

fruitSchema.plugin(mongooseTrack.plugin, { ... })

let fruitModel = mongoose.model('fruitModel', fruitSchema)

```
All changes to `fruitModel` documents will now be written to the document at `document.history`.

## Options

You can set options globaly or per schema by passing a second argument to the plugin, schema specific options override global options.

To set **Global Options**:
```js
const mongooseTrack = require('mongoose-track')
mongooseTrack.options = { /*options*/ }
```
To set **Schema Specific Options**:
```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')
let mySchema = new mongoose.Schema({ ... })
mySchema.plugin(mongooseTrack.plugin, { /*options*/ }
```
- `historyIgnore` indicates whether field history should be tracked
  - `true` Changes to this property will not be added to the `historyEvent`
  - `false` Changes to this property will be added to the `historyEvent`
    ```js
    let fruitSchema = new mongoose.Schema({
        name: { type: String },
        color: { type: String, historyIgnore: true }
    })
    ```

- `options.track.N`, type: `Boolean`, default: `true`. Indicates whether history for newly **created** fields should be tracked.
- `options.track.E`, type: `Boolean`, default: `true`. Indicates whether history for **edited** (i.e. previously defined and changed) created fields should be tracked.
- `options.track.D`, type: `Boolean`, default: `true`. Indicates whether history for **deleted** (i.e. previously defined and removed) fields should be tracked.
- `options.track.A`, type: `Boolean`, default: `true`. Indicates whether history for **array** fields should be tracked.
- `options.author.enabled`, type: `Boolean`, default: `false`. Indicated whether `document.historyAuthor` will be addred to history.
- `options.author.type`, type: `Mixed`, default: `mongoose.Schema.Types.String`. This should be set to the `_id` type of the author document, typically you'll use `mongoose.Schema.Types.ObjectId`.
- `options.author.ref`, type: `String`, default: `undefined`. This should be set to the **model name** of the author document, such as `"userModel"`

## History Event `historyEvent`

A `historyEvent` is created when you save a document, if there are (tracked) property changes to that document they will be appended to the `historyEvent` and the `historyEvent` will be placed at the top of the `document.history` Array, otherwise no `historyEvent` will be saved.

```js
history: [{
    _id: ObjectId,
    date: Date,
    author: Mixed,
    changes: [{ ... }]
}]
```

- `[historyEvent]`, type: `Array`. This array contains all `historyEvent`'s for the document
- `historyEvent.date`, type: `Date`, default: `new Date()`. This value is set just before `static.save()` is fired
- `historyEvent.author`, type: `Mixed`. This value is set from `document.historyAuthor`, assuming `options.author.enabled === true`

## History Change Event `historyChangeEvent`

A `historyChangeEvent` is a (singular) change to a document property that occurred within `document.history[].changes`.

```js
[{
    _id: ObjectId,
    path: [String],
    before: Mixed,
    after: Mixed
}]
```
- `[historyChangeEvent]`, type: `Array`
 * This array contains all `historyChangeEvent`'s made within the current `historyEvent`

- `historyChangeEvent.path`, type: `[String]`
 * This array denotes a reference to the changed key, for example: `{ color: { primary: "blue" } } === [ 'color', 'primary' ]`

- `historyChangeEvent.before`, type: `Mixed`
 * This value is taken from the property (located at `historyChangeEvent.path`) **before** being saved

- `historyChangeEvent.after`, type: `Mixed`
 * This value is taken from the property (located at `historyChangeEvent.path`) **after** being saved

## Methods

- `method.historyRevise(query, deepRevision)`, query: `Mixed`, deepRevision: `Boolean`.
  - If the `query` value is an `ObjectId` value from a `historyEvent` or `historyChangeEvent` this will return a document with values matching the `historyEvent._id || historyChangeEvent._id`
  - If the `query` value is a `Date` value it will find the latest `historyEvent` that occurred prior to the `Date` value.
  - If `deepRevision` is set to `true` a deep revision will occur, this will revise the document to **exactly** how it was when the matching `historyEvent` was created by recursivly setting all prior values from oldest to latest, stopping at the matching **`storyEvent`.
  - If `deepRevision` is set to `false` only the changes within the matching `historyEvent` or `historyChangeEvent` will be revised.
  - Currently `deepRevision` does not support a `query` value of a `historyChangeEvent` `ObjectId`.

- `method.historyForget(historyEventId, single)`, query: `ObjectId`, deepRevision: `Boolean`.
This method accepts an `_id` from a `historyEvent` and will remove all `document.history` prior to and including the matching `historyEvent`.
If `single` is set to `true` only the matching `historyEvent` will be removed.

## Statics

- `static.historyind(query)`, query: `mongoose.Query`. This static allows you to pass additional query operators to `static.find()`.
Passing `$revision` to the query with a `Date` value will return matching documents revised to that date, uses `method._revise()`.
Additionally you can define `$deepRevision` to return documents with a deep revision, same as `method._revise()`.

- `static.historyFindOne(query)`, query: `mongoose.Query`. This static allows you to pass additional query operators to `static.findOne()`
Passing `$revision` to the query with a `Date` value will return a matching document revised to that date, same as `method._revise()`
Additionally you can define `$deepRevision` to return documents with a deep revision, same as `method._revise()`

## Questions

> What properties are excluded from a `historyEvent` by default?

Changes to the following: `['_id', '__v', 'history', 'historyAuthor']` will not be recorded, along with any schema properties that have `historyIgnore === true`.

> If a `historyEvent` occurs but no `historyChangeEvent`'s are logged, is it recorded?

No. If the `history.changes` Array is empty, the `historyEvent` will not be saved.

> Can I pick where the history is stored? (other than `document.history`)

Not yet, in the future you'll be able to set _most_ if not _all_ of the Mongoose Track keys, methods and statics.


## Example

### Usage
Clone this repository and run `example.js`
```
git clone https://github.com/brod/mongoose-track.git
cd mongoose-track
node example.js
```
You should see the output of all **`storyEvent`'s and `historyChangeEvent`'s to a document including _manual changes_, _authored changes_, _forget changes_ and a _revision_.

_This will connect to `mongodb://localhost/mongooseTrackExample`_

### Minimum Example
_The example below uses the minimum setup._

```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')

let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

fruitSchema.plugin(mongooseTrack.plugin)

let fruitModel = mongoose.model('fruitModel', fruitSchema)

```

### Option Example
_The example below does not track `N` events._

```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')
mongooseTrack.options = {
  track: {
    N: false
  }
}

let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

fruitSchema.plugin(mongooseTrack.plugin)

let fruitModel = mongoose.model('fruitModel', fruitSchema)

```

#### Author Example
_The example below appends an author to events._

```js
const mongoose = require('mongoose')
const mongooseTrack = require('mongoose-track')
mongooseTrack.options = {
  author: {
    enable: true,
    ref: 'userModel'
}

let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

fruitSchema.plugin(mongooseTrack.plugin)

let fruitModel = mongoose.model('fruitModel', fruitSchema)

let userSchema = new mongoose.Schema({
    name: { type: String },
    color: { type: String }
})

userSchema.plugin(mongooseTrack.plugin)

let userModel = mongoose.model('userModel', userSchema)

```

To pass the author reference, set `document.historyAuthor` before you save the document.

```js
  var fruit = new fruitModel({
    name: 'Banana',
    color: 'Yellow',
    historyAuthor: '507f191e810c19729de860ea'
  })

  fruit.save()

  /* Document
  {
    name: 'Banana',
    color: 'Yellow',
    history: [{
      date: ...
      author: '507f191e810c19729de860ea',
      changes: [{
        type: 'N',
        path: [],
        after: {
          name: 'Banana'
          color: 'Yellow'
        }
    }]
  }
  */
```

## Contribute
Feel free to send pull requests and submit issues 😉
