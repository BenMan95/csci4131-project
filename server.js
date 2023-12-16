const express = require('express')
const session = require('express-session')
const bcrypt = require('bcrypt')
const jwt = require('jwt-simple')
const data = require('./data.js')
const app = express()
const port = 4131

const secret = 'asmoranomardicadaistinaculdacar'

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

// Set up Pug engine
app.set('views', 'templates')
app.set('view engine', 'pug')

// Middleware for parsing data
app.use(express.urlencoded({extended: true}))
app.use(express.json())

// Middleware for static content
app.use('/', express.static('resources'))

// Middleware for session management
app.use(session({secret}))

app.get('/', (req, res) => res.render('home'))

// app.get('/user/:username', (req, res) => {
//     req.session.username = req.params.username
//     res.render('home')
// })

app.post('/register', async (req, res) => {
    let username = req.body.username
    let password = req.body.password
    if (!username || !password) {
        res.status(400)
        return res.render('message', {
            title: 'Registration',
            header: 'Registration Failed',
            message: 'There was an error with your request'
        })
    }

    let hash = bcrypt.hashSync(password, 10)
    if (await data.newUser(username, hash)) {
        res.status(201)
        res.render('message', {
            title: 'Registration',
            header: 'Registration Successful',
            message: `Successfully registered as ${username}`
        })
    } else {
        res.status(400)
        res.render('message', {
            title: 'Registration',
            header: 'Registration Failed',
            message: 'This account already exists'
        })
    }
})

app.post('/login', async (req, res) => {
    let username = req.body.username
    let password = req.body.password
    if (!username || !password) {
        res.status(400)
        return res.render('message', {
            title: 'Login',
            header: 'Login Failed',
            message: 'There was an error with your request'
        })
    }

    let user = await data.getUser(username)
    if (!user) {
        res.status(404)
        return res.render('message', {
            title: 'Login',
            header: 'Login Failed',
            message: 'User does not exist'
        })
    }

    if (bcrypt.compareSync(password, user.pw_hash)) {
        req.session.token = jwt.encode({username}, secret)
        res.status(200)
        res.render('message', {
            title: 'Login',
            header: 'Login Successful',
            message: `Successfully logged in as ${username}`
        })
    } else {
        res.status(403)
        res.render('message', {
            title: 'Login',
            header: 'Login Failed',
            message: 'Invalid credentials'
        })
    }
})

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.render('home')
    })
})

// // Handle most GET requests
// app.get(['/', '/main'], (req, res) => res.render('mainpage'))
// app.get('/testimonies', (req, res) => res.render('testimonies'))
// app.get('/contact',     (req, res) => res.render('contactform'))

// app.get('/admin/contactlog', authFunc, async (req, res) => {
//     let contacts = await data.getContacts()
//     res.render('contactlog', {contacts})
// })
// app.get('/admin/salelog', authFunc, async (req, res) => {
//     let out = []
//     let sales = await data.getRecentSales()
//     for (let sale of sales) {
//         out.push({
//             message: sale.sale_text,
//             active: sale_time_past(sale.time_end) ? 0 : 1
//         })
//     }
//     res.send(out)
// })

// app.post('/contact', async (req, res) => {
//     if (paramsValid(req.body)) {
//         await data.addContact(req.body)
//         res.status(201)
//         res.render('formmessage', {message: "Your appointment has been scheduled."})
//     } else {
//         res.status(400)
//         res.render('formmessage', {message: "There was an error with your request."})
//     }
// })

// Gets a user's token
app.get('/api/auth', async (req, res) => {
    let username = req.body.username
    let password = req.body.password
    if (!username || !password) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    let user = await data.getUser(username)
    if (!user) {
        res.status(404)
        return res.send({msg: 'User does not exist'})
    }

    if (bcrypt.compareSync(password, user.pw_hash)) {
        let token = jwt.encode({username}, secret)
        res.status(200)
        res.send({token})
    } else {
        res.status(403)
        res.send({msg: 'Invalid credentials'})
    }
})

// Creates a post
app.post('/api/post', async (req, res) => {
    let token = req.body.token ?? req.session.token
    let content = req.body.content
    if (!token || !content) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    if (content.length > 300) {
        res.status(403)
        return res.send({msg: 'Content is over 300 characters'})
    }

    let username = jwt.decode(token, secret).username
    if (!await data.getUser(username)) {
        res.status(404)
        return res.send({msg: 'User does not exist'})
    }

    if (await data.newPost(username, content)) {
        res.status(201)
        res.send({msg: 'Post successfully created'})
    } else {
        res.status(500)
        res.send({msg: 'An unexpected error occurred'})
    }
})

// Edits an existing post
app.put('/api/post', async (req, res) => {
    let token = req.body.token ?? req.session.token
    let id = req.body.id
    let content = req.body.content
    if (!token || !id || !content) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    if (content.length > 300) {
        res.status(403)
        return res.send({msg: 'Content is over 300 characters'})
    }

    let post = await data.getPost(id)
    if (!post) {
        res.status(404)
        return res.send({msg: 'Post does not exist'})
    }

    let username = jwt.decode(token, secret).username
    if (username != post.username) {
        res.status(403)
        return res.send({msg: 'Invalid token'})
    }

    if (await data.editPost(id, content)) {
        res.status(201)
        res.send({msg: 'Post successfully created'})
    } else {
        res.status(500)
        res.send({msg: 'An unexpected error occurred'})
    }
})

// Deletes an existing post
app.delete('/api/post', async (req, res) => {
    let token = req.body.token ?? req.session.token
    let id = req.body.id
    if (!token || !id) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    let post = await data.getPost(id)
    if (!post) {
        res.status(404)
        return res.send({msg: 'Post does not exist'})
    }

    let username = jwt.decode(token, secret).username
    if (username != post.username) {
        res.status(403)
        return res.send({msg: 'Invalid token'})
    }

    if (await data.deletePost(id)) {
        res.status(201)
        res.send({msg: 'Post successfully deleted'})
    } else {
        res.status(500)
        res.send({msg: 'An unexpected error occurred'})
    }
})

// Checks if a user has liked a post
app.get('/api/like', async (req, res) => {
    let token = req.body.token ?? req.session.token
    let id = req.body.id
    if (!token || !id) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    let post = await data.getPost(id)
    if (!post) {
        res.status(404)
        return res.send({msg: 'Post does not exist'})
    }

    let username = jwt.decode(token, secret).username
    let user = await data.getUser(username)
    if (!user) {
        res.status(404)
        return res.send({msg: 'User does not exist'})
    }

    let liked = await data.hasLiked(username, id)
    res.status(200)
    res.send({liked})
})

// Sets whether or not a user has liked a post
app.put('/api/like', async (req, res) => {
    let token = req.body.token ?? req.session.token
    let id = req.body.id
    let status = req.body.status !== false
    if (!token || !id) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    let post = await data.getPost(id)
    if (!post) {
        res.status(404)
        return res.send({msg: 'Post does not exist'})
    }

    let username = jwt.decode(token, secret).username
    let user = await data.getUser(username)
    if (!user) {
        res.status(404)
        return res.send({msg: 'User does not exist'})
    }

    if (status) {
        data.likePost(username, id)
        res.status(201)
        res.send({msg: 'Post liked'})
    } else {
        data.unlikePost(username, id)
        res.status(201)
        res.send({msg: 'Post unliked'})
    }
})

// Handle 404 errors here
app.use((req, res, next) => {
    res.status(404)
    res.render('404')
    next()
})