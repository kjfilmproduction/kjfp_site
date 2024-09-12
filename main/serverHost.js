const http = require('http')
const app = require('./server')
const crypto = require('crypto')
const feedbackModule = require('./feedbackBackend.js')

const encrypt = value => {
    return new Promise((resolve, reject) => {
        try {
            const bufferMsg = Buffer.from(value, 'utf8')
            const encrypt = crypto.publicEncrypt(process.env.KEY, bufferMsg)
            resolve(encrypt.toString('base64'))
        } catch(err) {
            reject(err)
        }
    })
}

app.post('/feedback', (req, res) => {
    const { feedbackName, feedbackMessage, rating } = req.body
    const lengthParameter = feedbackName.length <= 255 && feedbackMessage.length <= 255 ? true : false 

    feedbackModule.getConnection(async (err, con) => {
        if (err) { 
            console.log(Error(err)) 
            con.release()
        }
        if (lengthParameter) {
            const encName = await encrypt(feedbackName)
            const encMessage = await encrypt(feedbackMessage)
            const encRating = await encrypt(String(rating))

            const sql = 'INSERT INTO ratingTest (name, message, rating) VALUES (?, ?, ?)'
            const values = [encName, encMessage, encRating]
            con.query(sql, values, (err, result) => {
                if (err) { console.log(err) }
                res.json({ 'feedbackResponse': true }) // success
                con.release()
            })
        } else if (!lengthParameter) {
            res.json({ 'feedbackResponse': false }) // error
            con.release()
        }
    })
})

// custom 404
app.use((req, res, next) => {
    res.status(404).send("Not Found!")
})
  
// custom error handler
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send('Error!')
})

const server = http.createServer(app)

server.listen(process.env.PORT_HOST, () => {
    console.log(`Server running`)
})