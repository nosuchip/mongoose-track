const mongoose = require('mongoose')
const mongooseTrack = require('./index')

mongoose.Promise = Promise;
mongoose.connect('mongodb://localhost/mongooseTrackExample')

mongooseTrack.options = {
    track: {
        N: true,
        E: true
    },
    author: {
        enable: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userModel'
    }
}

/**
 *  User Stuff
 */
let userSchema = new mongoose.Schema({
    name: { type: String },
    age: { type: Number }
})

userSchema.plugin(mongooseTrack.plugin)

let userModel = mongoose.model('userModel', userSchema)

var tempUser = new userModel({
    name: 'Steve',
    age: 56
})

/**
 *  Fruit Stuff
 */
let fruitSchema = new mongoose.Schema({
    name: { type: String },
    color: {
        primary: { type: String },
        secondary: { type: String }
    }
})

fruitSchema.plugin(mongooseTrack.plugin)

let fruitModel = mongoose.model('fruitModel', fruitSchema)

let tempFruit = new fruitModel({
    name: 'Banana',
    color: {
        primary: 'yellow',
        secondary: 'green'
    }
})

var run = function() {

    // Save the user
    tempUser.save()
        .then(function(userDocument) {

            // Save the fruit
            return tempFruit.save()
        })
        .then(function(fruitDocument) {

            // Find the fruit
            return fruitModel.findOne({ _id: tempFruit._id })
        })
        .then(function(fruitDocument) {

            // Modify the fruit
            fruitDocument.color.primary = 'blue'
            fruitDocument.color.secondary = 'red'
            fruitDocument.historyAuthor = tempUser._id
            return fruitDocument.save()
        })
        .then(function(fruitDocument) {

            // Modify the fruit
            fruitDocument.color.primary = 'green'
            fruitDocument.color.secondary = 'pink'
            fruitDocument.historyAuthor = tempUser._id
            return fruitDocument.save()
        })
        .then(function(fruitDocument) {

            // Forget (single) historyEvent, color = { secondary: 'red', primary: 'blue' }
            let forgottenFruitDocument = fruitDocument._forget(fruitDocument.history[1]._id, true)

            // Restore the fruit by historyChangeEvent, color =  { secondary: 'pink' }
            restoredFruitDocument = forgottenFruitDocument._revise(fruitDocument.history[0].changes[1]._id)
            return restoredFruitDocument.save()
        })
        .then(function(fruitDocument) {

            // Find the fruit and populate author
            return fruitModel.findOne({ _id: tempFruit._id })
                .populate({ path: 'history.author' })
        })
        .then(function(fruitDocument) {

            // Log the fruit history
            console.log('Total Events: %s', fruitDocument.history.length)
            console.log('')
            fruitDocument.history.reverse().forEach(function(history, index) {
                console.log('  Event: #%s', index + 1)
                console.log('  Total Changes: %s', history.changes.length)
                history.changes.forEach(function(change, index) {
                    console.log('')
                    console.log('    Change: %s', index + 1)
                    console.log('        Author: %s', history.author ? history.author.name : 'System')
                    console.log('        Type: %s', change.type)
                    console.log('        Path: %s', change.path.join('.') || '*')
                    console.log('        Before: %j', change.before)
                    console.log('        After: %j', change.after)
                })
                console.log('')
            })

            return true
        })
        .then(function() {
            console.log('removed fruitModel documents')
            return fruitModel.remove({})
        })
        .then(function() {
            console.log('removed userModel documents')
            return userModel.remove({})
        })
        .catch(function(error) {
            console.log(error)
            throw error
        })
}

run()