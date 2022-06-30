let User = require('../models/User')

module.exports = {
    loggedInUser: (req, res, next) => {

        if (req.session && req.session.passport) {
            return next()
        } else {
            req.flash('error', 'Login required')
            res.redirect('/users/login')
        }

    },
    userInfo: (req, res, next) => {
        if (req.session && req.session.passport) {
            User.findById(req.session.passport.user, 'name email age phone isVerified', (err, user) => {
                if (err) return next(err)
                req.user = user
                res.locals.user = user
                next()
            })
        } else {
            req.user = null
            res.locals.user = null
            next()
        }
    }
}