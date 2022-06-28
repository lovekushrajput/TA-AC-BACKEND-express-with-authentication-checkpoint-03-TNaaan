let mongoose = require('mongoose')
let Schema = mongoose.Schema


let expenseSchema = new Schema({
    category: { type: String },
    amount: Number,
    date: String,
    user_ID: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })


module.exports = mongoose.model('Expense', expenseSchema)