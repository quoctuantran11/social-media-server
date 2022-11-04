const mongoose = require('mongoose')

const profilesSchema = new mongoose.Schema({
    username: String,
    fullName: String
}, { collection: 'profiles' })

module.exports = mongoose.model('profiles', profilesSchema)