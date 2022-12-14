const mongoose = require('mongoose')

const profilesSchema = new mongoose.Schema({
    username: String,
    fullName: String,
    account: String
}, { collection: 'profiles' })

module.exports = mongoose.model('profiles', profilesSchema)