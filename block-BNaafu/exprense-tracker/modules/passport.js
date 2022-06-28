let passport = require('passport');
let LocalStrategy = require('passport-local').Strategy;
let GitHubStrategy = require('passport-github').Strategy;
var GoogleStrategy = require('passport-google-oauth2').Strategy;
let User = require('../models/User');


//local storage
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, (email, password, done) => {
    User.findOne({ email: email }, (err, user) => {
        if (err) return done(err)
        //no user
        if (!user) {
            return done(null, false, { message: 'Invalid Email' })
        }

        //varify password
        user.varifyPassword(password, (err, result) => {
            if (err) return done(err)

            //no result
            if (!result) {
                return done(null, false, { message: 'Password wrong' })
            }
            done(null, user)

        })
    })
}))

//google login
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, (accessToken, refreshTOken, profile, done) => {

    User.findOne({ email: profile._json.email }, (err, user) => {
        if (err) return done(err)
        //no user
        //no user
        if (!user) {
            return done(null, false, { message: 'Invalid Email' })
        }
        done(null, user)
    })

}))

//github login
passport.use(new GitHubStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: '/auth/github/callback'
}, (accessToken, refreshTOken, profile, done) => {
    User.findOne({ email: profile._json.email }, (err, user) => {
        if (err) return done(err)
        //no user
        if (!user) {
            return done(null, false, { message: 'Invalid Email' })
        }
        done(null, user)
    })

}))



passport.serializeUser((user, done) => {
    return done(null, user.id)
})

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(null, user)
    })
})