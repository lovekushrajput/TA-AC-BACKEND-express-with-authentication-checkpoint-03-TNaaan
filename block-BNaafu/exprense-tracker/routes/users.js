var express = require('express');
var passport = require('passport');
var User = require('../models/User');
var router = express.Router();
var Income = require('../models/Income');
var Expense = require('../models/Expense');
require('dotenv').config();
var Otp = require('../models/Otp');
let nodemailer = require('nodemailer');
let Str = require('@supercharge/strings');
let auth = require('../middlewares/auth');



/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});


//registration form
router.get('/register', (req, res) => {
  let err = req.flash('error')[0]
  res.render('register', { err })
})

//capture the data
router.post('/', async (req, res, next) => {
  req.body.emailToken = Str.random(25)
  User.create(req.body, (err, user) => {
    if (err) {
      if (err.name === 'MongoServerError') {
        req.flash('error', 'This email is already exist')
        return res.redirect('/users/register')
      }

      if (err.name === 'ValidationError') {
        req.flash('error', err.message)
        return res.redirect('/users/register')
      }
    }

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
          req.flash('error', 'something went wrong')
          return res.redirect('/')
        }
        req.flash('error', 'please check your email to varify account')
        return res.redirect('/')
      })

    } catch (error) {
      console.log(error)
    }

  })
})

//email varification
router.get('/varify-email', async (req, res, next) => {

  try {
    let user = await User.findOne({ emailToken: req.query.token })

    //no user
    if (!user) {
      req.flash('error', 'Token is invalid. please contact us for assist')
      return res.redirect('/')
    }
    user.emailToken = null,
      user.isVerified = true
    await user.save()
    req.flash('error', 'Varification success')
    return res.redirect('/users/login')

  } catch (error) {
    console.log(error)
    req.flash('error', 'Token is invalid. please contact us for assistance')
    return res.redirect('/')
  }
})

//login form
router.get('/login', (req, res, next) => {
  let err = req.flash('error')[0]
  res.render('login', { err })
})

//capture the credentials
router.post('/login', passport.authenticate('local', {
  failureRedirect: '/users/login',
  successRedirect: '/users/onboarding',
  failureFlash: true
}))


//forgot pass form
router.get('/forgot', (req, res, next) => {
  let err = req.flash('error')[0]
  res.render('recover', { err })
})

// capture the data
router.post('/forgot', (req, res, next) => {

  //delete the old credentials from OTP
  Otp.deleteMany({}, (err, code) => {
    if (err) return next(err)
  })

  //checking the email 
  User.findOne(req.body, (err, user) => {
    if (err) return next(err)

    if (!user) {
      req.flash('error', "Invalid Email")
      return res.redirect('/users/forgot')
    }

    //save email in OTP model
    req.body.code = Math.floor(1000 + Math.random() * 9000);
    req.body.expireIn = new Date().getTime() + 300 * 1000
    Otp.create(req.body, (err, code) => {
      if (err) return next(err)
      res.redirect('/users/email/' + code.email)
    })
  })


})



router.get('/email/:email', async (req, res, next) => {
  let email = req.params.email
  let otpData = await Otp.findOne({ email: email })

  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
    }
  })

  let mailOptions = {
    from: process.env.EMAIL,
    to: otpData.email,
    subject: 'One Time Password (OTP) for Password recovery process on Expense Tracker',
    text: String(otpData.code)
  }

  transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
      req.flash('error', 'Unable send email')
      return res.redirect('/users/forgot')
    } else {
      //varigy otp
      res.redirect('/users/varifyOtp')
    }

  })

})

//varify OTP form
router.get('/varifyOtp', (req, res, next) => {
  res.render('otp')
})


router.post('/varifyOtp', async (req, res, next) => {
  let data = await Otp.findOne({ code: req.body.code })
  if (data) {
    let currentTime = new Date().getTime()

    let difference = data.expireIn - currentTime

    if (difference > 0) {
      let user = await User.findOne({ email: data.email });
      user.password = req.body.password;
      await user.save();
      if (user) {
        req.flash('error', 'password changed successfully')
        res.redirect('/users/login')
      } else {
        req.flash('error', 'OTP Timeout')
        res.redirect('/users/forgot')
      }
    } else {
      req.flash('error', 'OTP Timeout')
      res.redirect('/users/forgot')
    }
  }
})


router.use(auth.loggedInUser)

router.get('/logout', (req, res) => {
  res.clearCookie('connect.sid')
  req.session.destroy()
  res.redirect('/users/login')
})



router.get('/onboarding', async (req, res) => {
  let mixedArr = []
  let expenseArr = []
  let incomeArr = []
  let totalSaving

  await User.findById(req.user._id).populate('incomeID').populate('expenseID').exec((err, user) => {
    let { month, category, source, start_date, end_date } = req.query

    //INCOME
    user.incomeID.forEach((elm) => {
      mixedArr.push(elm)
      //check month include in incomes
      if (elm.date.includes(month)) {
        incomeArr.push(elm.amount)
      } else

        //showing current month saving
        if (month == undefined) {
          var date = new Date()
          let currentMonth = date.getMonth() + 1
          if (elm.date.includes(currentMonth)) {
            incomeArr.push(elm.amount)
          }
        }
    })

    //EXPENSE
    user.expenseID.forEach((elm) => {
      mixedArr.push(elm)
      //check month include in expense
      if (elm.date.includes(month)) {
        expenseArr.push(elm.amount)
      } else

        //showing current month saving
        if (month == undefined) {
          var date = new Date()
          let currentMonth = date.getMonth() + 1
          if (elm.date.includes(currentMonth)) {
            expenseArr.push(elm.amount)
          }
        }
    })

    //total Income
    let totalIncome = incomeArr.reduce((acc, cv) => acc + cv, 0)

    //total expense
    let totalExpense = expenseArr.reduce((acc, cv) => acc + cv, 0)

    //total saving
    totalSaving = totalIncome - totalExpense




    Income.distinct('source', (err, incomes) => {
      if (err) return next

      Expense.distinct('category', (err, expenses) => {
        if (err) return next(err)


        //filter by source
        if (source) {
          let data = mixedArr.filter((elm) => elm.source === source)
          return res.render('onboarding', { data, incomes, expenses, totalExpense, totalIncome, totalSaving })
        }

        //filter the category using date
        if (category && start_date && end_date) {

          //filtering the category
          let epn = mixedArr.filter((elm) => elm.category === category)

          //checking the in b/w date
          let data = epn.filter((elm) => elm.date >= start_date && elm.date <= end_date)
            .sort((a, b) => a.createdAt - b.createdAt)

          return res.render('onboarding', { data, incomes, expenses, totalExpense, totalIncome, totalSaving })
        } else if (category) {
          let data = mixedArr.filter((elm) => elm.category === category).sort((a, b) => a.createdAt - b.createdAt)
          return res.render('onboarding', { data, incomes, expenses, totalExpense, totalIncome, totalSaving })
        }


        //To get the mixed income and expense
        if (month) {
          let data = mixedArr.filter((elm) => elm.date.includes(month)).sort((a, b) => a.createdAt - b.createdAt)
          res.render('onboarding', { data, incomes, expenses, totalExpense, totalIncome, totalSaving })
        } else {
          let data = mixedArr.sort((a, b) => a.createdAt - b.createdAt)
          res.render('onboarding', { data, incomes, expenses, totalExpense, totalIncome, totalSaving })
        }

      })
    })
  })
})


//adding income
router.get('/income', (req, res) => {
  res.render('income')
})

//capture the data
router.post('/income', (req, res, next) => {
  if (req.body === '') {
    return res.redirect('/users/income')
  }
  req.body.user_ID = req.user._id
  Income.create(req.body, (err, income) => {
    if (err) return next(err)
    User.findByIdAndUpdate(req.user._id, { $push: { incomeID: income._id } }, (err, user) => {
      if (err) return next(err)
      res.redirect('/users/onboarding')
    })

  })
})



//adding expense
router.get('/expense', (req, res) => {
  res.render('expense')
})

//capture the data
router.post('/expense', (req, res, next) => {
  if (req.body === '') {
    return res.redirect('/users/expense')
  }
  req.body.user_ID = req.user._id
  Expense.create(req.body, (err, expense) => {
    if (err) return next(err)
    User.findByIdAndUpdate(req.user._id, { $push: { expenseID: expense._id } }, (err, user) => {
      if (err) return next(err)
      res.redirect('/users/onboarding')
    })

  })
})


module.exports = router;
