const express = require('express')
const session = require('express-session')
const bcrypt = require('bcrypt')
const jwt = require('jwt-simple')
const data = require('./data.js')
const app = express()
const port = 4131

const secret = 'asmoranomardicadaistinaculdacar'

// As of the time of submission, passwords of existing accounts
// have all been set to 'password'

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

// Middleware to unpack username from session tokens
app.use((req, res, next) => {
    let token = req.session.token
    if (token) req.username = jwt.decode(token, secret).username
    next()
})

app.get('/', async (req, res) => {
    let page = parseInt(req.query.page ?? 1) || 1
    let params = {
        title: 'Home',
        header: 'Orblr',
        username: req.username,
        sort: req.query.sort,
        pagenum: page
    }

    let posts = await (req.query.sort == 'likes'
                        ? data.postsByLikes()
                        : data.postsByTime())

    let start = (page-1)*10
    let end = Math.min(page*10)
    params.posts = posts.slice(start, end)

    if (page > 1)
        params.prev = new URLSearchParams({...req.query, page: page-1})
    if (end < posts.length)
        params.next = new URLSearchParams({...req.query, page: page+1})

    for (let post of posts)
        post.liked = Boolean(req.username) && await data.hasLiked(req.username, post.id)

    res.render('posts', params)
})
app.get('/user/:username', async (req, res) => {
    let page = parseInt(req.query.page ?? 1) || 1
    let params = {
        title: req.params.username,
        header: `${req.params.username}'s page`,
        username: req.username,
        sort: req.query.sort,
        pagenum: page
    }

    let posts = await (req.query.sort == 'likes'
                        ? data.userPostsByLikes(req.params.username)
                        : data.userPostsByTime(req.params.username))

    let start = (page-1)*10
    let end = Math.min(page*10)
    params.posts = posts.slice(start, end)

    if (page > 1)
        params.prev = new URLSearchParams({...req.query, page: page-1})
    if (end < posts.length)
        params.next = new URLSearchParams({...req.query, page: page+1})

    for (let post of posts)
        post.liked = Boolean(req.username) && await data.hasLiked(req.username, post.id)

    if (req.params.username == req.username)
        res.render('self', params)
    else
        res.render('posts', params)
})

app.get('/register', (req, res) => res.render('register', {username: req.username}))
app.get('/login', (req, res) => res.render('login', {username: req.username}))

// Endpoints for registration or logging in/out
app.post('/register', async (req, res) => {
    let username = req.body.username
    let password = req.body.password
    if (!username || !password) {
        res.status(400)
        return res.render('message', {
            title: 'Registration',
            header: 'Registration Failed',
            message: 'There was an error with your request',
            username: req.username
        })
    }

    let hash = bcrypt.hashSync(password, 10)
    if (await data.newUser(username, hash)) {
        req.session.token = jwt.encode({username}, secret)
        res.status(201)
        res.render('message', {
            title: 'Registration',
            header: 'Registration Successful',
            message: `Successfully registered as ${username}`,
            username: username
        })
    } else {
        res.status(400)
        res.render('message', {
            title: 'Registration',
            header: 'Registration Failed',
            message: 'This account already exists',
            username: req.username
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
            message: 'There was an error with your request',
            username: req.username
        })
    }

    let user = await data.getUser(username)
    if (!user) {
        res.status(404)
        return res.render('message', {
            title: 'Login',
            header: 'Login Failed',
            message: 'User does not exist',
            username: req.username
        })
    }

    if (bcrypt.compareSync(password, user.pw_hash)) {
        req.session.token = jwt.encode({username}, secret)
        res.status(200)
        res.render('message', {
            title: 'Login',
            header: 'Login Successful',
            message: `You've logged in as ${username}`,
            username: username
        })
    } else {
        res.status(403)
        res.render('message', {
            title: 'Login',
            header: 'Login Failed',
            message: 'Invalid credentials',
            username: req.username
        })
    }
})
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.render('message', {
            title: 'Logged out',
            header: 'Successfully Logged Out',
            message: 'We hope to see you again'
        })
    })
})

// API endpoints ---------------------------------------------------------------

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

// Create/edit/delete a post
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

// Check if a user has liked a post, or have a user like a post
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

// Handle 404 errors
app.use((req, res, next) => {
    res.status(404)
    res.render('message', {
        title: '404',
        header: '404 Error',
        message: 'The requested resource could not be found'
    })
    next()
})