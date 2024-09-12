'use strict'

require('dotenv').config()
const express = require("express")
const app = express()
const bodyParser = require('body-parser')
const path = require('path')
const nodemailer = require('nodemailer')
const request = require('request')
const geoip = require('geoip-lite')
const requestIp = require('request-ip')
const { rateLimit } = require('express-rate-limit')

const langEE = require('../language/ee.json')  
const langEN = require('../language/en.json')

app.use(bodyParser.json({limit: '5kb'}))
app.use(bodyParser.urlencoded({limit: '5kb', extended: true}))
app.set("views", path.join(__dirname, "../views")) // ejs stuff
app.set('view engine', 'ejs') // ejs stuff
app.use('/en', express.static('../public')) // dir - /en/
app.use('/en', express.static('../js-frontEnd')) // dir - /en/
app.use('/en', express.static('../public/img')) // dir - /en/
app.use(express.static(path.join(__dirname, '../public'))) // dir - /
app.use(express.static(path.join(__dirname, '../js-frontEnd')))// dir - /
app.use(express.static('../public/img'))

const limiter = rateLimit({
	windowMs: 60 * 1000 * 5, // 5 minutes
	limit: 1000, // Limit each IP to x requests per `window` (here, per 5 minutes)
	standardHeaders: 'draft-7', 
	legacyHeaders: false,
    handler: (req, res, next) => {
        const ip = requestIp.getClientIp(req)
        const geo = geoip.lookup(ip)
        console.log(ip, geo)
        res.status(429).send('Too Many Requests, Try Again Later!')
    }
})

app.use(limiter)

// nodemailer
function emailBot(name, email, message) {
    const transporter = nodemailer.createTransport({
        service: process.env.SERVICE_TYPE,
        secure: true,
        auth: {
            user: process.env.AUTH_USER,
            pass: process.env.AUTH_PASS
        }
    })

    const mailConfig = {
        from: process.env.BOT_EMAIL,
        to: process.env.BOT_EMAIL,
        subject: 'New email from yourWebisteName!',
        html: `
        <div style="align-content: center; background-color: #edebeb; border-radius: 6px; padding: 10px;">
        <p style="font-size: 1.5em; font-weight: 700">Someone just submitted your form:<p>
        <p style="font-size: 1.1em;">Name: ${name}</p>
        <p style="font-size: 1.1em;">Email: ${email}</p>
        <p style="font-size: 1.1em;">Message: ${message}</p>
        </div>
        `
    }

    transporter.sendMail(mailConfig, (err, res) => {
        if (err) { console.log(Error(err)) }
    })
}

// render root page (ee)
app.get('/', (req, res) => {
    res.render('index.ejs', { lang: langEE })
})

// render aboutUs page (ee)
app.get('/aboutus', (req, res) => {
    res.render('aboutUs.ejs', { lang: langEE })
})

// render portfolio page (ee)
app.get('/portfolio', (req, res) => {
    res.render('portfolio.ejs', { lang: langEE })
})

// render feedback page (ee)
app.get('/feedback', (req, res) => {
    res.render('feedback.ejs', { lang: langEE })
})

// render contact page (ee)
app.get('/contact', (req, res) => {
    res.render('contact.ejs', { lang: langEE })
})

// render root page (en)
app.get("/:lang/", (req, res) => {
    // const lang = req.lang
    res.render('index.ejs', { lang: langEN })
})

// render any page, that is not the root page (en)
app.get("/:lang/:page", (req, res) => {
    const page = req.params.page
    res.render(`${page}.ejs`, { lang: langEN })
})

async function verify(secret, token) {
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
    
    return new Promise((resolve, reject) => {
        request.post(url, (error, response) => {
            if (error) {
                reject(error)
            } else {
                const result = JSON.parse(response.body)
                resolve(result)
            }
        })
    })
}

function sendEmail(name, email, message) {
    try {
        if (name && email && message) {
            emailBot(name, email, message)
        }
    } catch(err) {
        console.log(err)
    }
}

app.post('/contact', async (req, res) => {
    const { token, name, email, message } = req.body
    const secret = process.env.RECAPTCHA_SECRET

    try {
        const verificationResult = await verify(secret, token)
        const answer = verificationResult.success
        if (answer) {
            sendEmail(name, email, message)
            res.json({ 'recaptchaSuccess': true })
        } else if (!answer) {
            res.json({ 'recaptchaSuccess': false })
        }
    } catch(err) {
        console.log(err)
    }
})

module.exports = app