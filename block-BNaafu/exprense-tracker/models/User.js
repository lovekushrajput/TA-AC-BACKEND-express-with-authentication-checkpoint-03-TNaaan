let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let bcrypt = require('bcrypt')

let userSchema = new Schema({
    name: String,
    email: { type: String, unique: true, require: true },
    isVerified: { type: Boolean, default: false },
    password: { type: String, minlength: 4, require: true },
    age: Number,
    phone: { type: Number, require: true },
    country: String,
    emailToken: String,
    incomeID: [{ type: Schema.Types.ObjectId, ref: 'Income' }],
    expenseID: [{ type: Schema.Types.ObjectId, ref: 'Expense' }]
})


userSchema.pre('save', function (next) {
    console.log(this.password)
    //hashing the password
    if (this.password && this.isModified('password')) {
        bcrypt.hash(this.password, 10, (err, hashed) => {
            if (err) return next(err)
            this.password = hashed
            return next();
        })
    } else {
        next()
    }

})


//varify the password
userSchema.methods.varifyPassword = function (password, cb) {

    bcrypt.compare(password, this.password, (err, result) => {

        return cb(err, result)
    })
}


module.exports = mongoose.model('User', userSchema)