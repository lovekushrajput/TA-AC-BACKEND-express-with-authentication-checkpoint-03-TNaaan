let mongoose = require('mongoose')
let Schema = mongoose.Schema


let otpSchema = new Schema({
    email: { type: String, require: true },
    code: { type: Number, require: true },
    expireIn: { type: Number, require: true }
})

module.exports = mongoose.model('Otp', otpSchema)