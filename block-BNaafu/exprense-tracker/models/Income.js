let mongoose = require('mongoose')
let Schema = mongoose.Schema


let incomeSchema = new Schema({
    source: { type: String },
    amount: Number,
    date: String,
    user_ID: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })


module.exports = mongoose.model('Income', incomeSchema)

