let passport = require('passport');
let LocalStrategy = require('passport-local').Strategy;
let GitHubStrategy = require('passport-github').Strategy;
var GoogleStrategy = require('passport-google-oauth2').Strategy;
require('dotenv').config()
let User = require('../models/User');
let nodemailer = require('nodemailer');
const { nl } = require('date-fns/locale');


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
        if (user.isVerified) {
            //varify password
            user.varifyPassword(password, (err, result) => {
                if (err) return done(err)

                //no result
                if (!result) {
                    return done(null, false, { message: 'Password wrong' })
                }
                done(null, user)
            })
        } else {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.PASSWORD
                }
            })

            let mailOptions = {
                from: process.env.EMAIL,
                to: user.email,
                subject: 'Varify your email',
                text: `
                Hello thanks for registration on our site.
                http://localhost:3000/users/varify-email?token=${user.emailToken}
                `,
                html: `
                <h1>Hello </h>
                <p> Thanks for registration on our site.</p>
                <p> Please click the link below to varify your account</p>
                <a href="http://localhost:3000/users/varify-email?token=${user.emailToken}">Varify your account</a>
                `
            }

            try {
                transporter.sendMail(mailOptions, function (err, info) {
                    if (err) {
                        return done(null, false, { message: 'something went wrong' })
                    }
                    return done(null, user, { message: 'please check your email to varify account' })
                })

            } catch (error) {
                console.log(error)
                return done(null, false, { message: 'something went wrong' })
            }
        }
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