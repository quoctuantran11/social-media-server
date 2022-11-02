const mongoose = require('mongoose')

const usersSchema = new mongoose.Schema({
    token: String,
    email: { type: String, unique: true },
    hash_password: String,
    created: String
}, { collection: 'users' })

module.exports = mongoose.model('users', usersSchema)