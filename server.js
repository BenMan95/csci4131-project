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

// Middleware to make session data available in pug
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Pages for viewing/editing posts
app.get('/', async (req, res) => {
    // Initialize parameters object
    let page = parseInt(req.query.page ?? 1) || 1
    let params = {
        title: 'Home',
        header: 'Orblr',
        sort: req.query.sort,
        pagenum: page
    }

    let posts = await (req.query.sort == 'likes'
                        ? data.postsByLikes()
                        : data.postsByTime())

    // Add posts to params
    let start = (page-1)*10
    let end = Math.min(page*10)
    params.posts = posts.slice(start, end)

    // Add pagination parameters
    if (page > 1)
        params.prev = new URLSearchParams({...req.query, page: page-1})
    if (end < posts.length)
        params.next = new URLSearchParams({...req.query, page: page+1})

    // Get like status of posts
    for (let post of posts)
        post.liked = Boolean(req.session.username) && await data.hasLiked(req.session.username, post.id)

    res.render('posts', params)
})
app.get('/user/:username', async (req, res) => {
    // Checck user exists
    let user = await data.getUser(req.params.username)
    if (!user) {
        res.status(404)
        return res.render('message', {
            title: req.params.username,
            header: '404 Error',
            message: 'This user does not exist'
        })
    }

    // Initialize parameters object
    let page = parseInt(req.query.page ?? 1) || 1
    let params = {
        title: req.params.username,
        header: `${req.params.username}'s page`,
        sort: req.query.sort,
        pagenum: page
    }

    let posts = await (req.query.sort == 'likes'
                        ? data.userPostsByLikes(req.params.username)
                        : data.userPostsByTime(req.params.username))

    // Add posts to params
    let start = (page-1)*10
    let end = Math.min(page*10)
    params.posts = posts.slice(start, end)

    // Add pagination parameters
    if (page > 1)
        params.prev = new URLSearchParams({...req.query, page: page-1})
    if (end < posts.length)
        params.next = new URLSearchParams({...req.query, page: page+1})

    // Get like status of posts
    for (let post of posts)
        post.liked = Boolean(req.session.username) && await data.hasLiked(req.session.username, post.id)

    // Render different version if it is current user's page
    if (req.params.username == req.session.username)
        return res.render('self', params)

    res.render('posts', params)
})
app.get('/edit/:id', async (req, res) => {
    // Check that the post exists
    let post = await data.getPost(req.params.id)
    if (!post) {
        res.status(404)
        return res.render('message', {
            title: 'Edit Post',
            header: '404 Error',
            message: 'This post does not exist or has been deleted'
        })
    }

    // Check if it is the correct user
    if (post.username != req.session.username) {
        res.status(403)
        return res.render('message', {
            title: 'Edit Post',
            header: '403 Error',
            message: 'You do not have access to edit this post'
        })
    }

    res.render('edit', {
        id: post.id,
        current: post.content
    })
})

// Login and registration pages
app.get('/register', (req, res) => res.render('register'))
app.get('/login', (req, res) => res.render('login'))

// Pages to handle registration/login/logout requests
app.post('/register', async (req, res) => {
    // Check for correct parameters
    let username = req.body.username
    let password = req.body.password
    if (!username || !password || username.length > 20) {
        res.status(400)
        return res.render('message', {
            title: 'Registration',
            header: 'Registration Failed',
            message: 'There was an error with your request'
        })
    }

    // Check if the user already exists
    let user = data.getUser(username)
    if (user) {
        res.status(400)
        res.render('message', {
            title: 'Registration',
            header: 'Registration Failed',
            message: 'This account already exists'
        })
    }

    // Create entry for user
    let hash = bcrypt.hashSync(password, 10)
    if (await data.newUser(username, hash)) {
        req.session.token = jwt.encode({username}, secret)
        req.session.username = username
        res.status(201)
        res.render('message', {
            title: 'Registration',
            header: 'Registration Successful',
            message: `You've successfully registered as ${username}!`
        })
    } else {
        res.status(500)
        res.render('message', {
            title: 'Registration',
            header: 'Registration Failed',
            message: 'An unexpected error occured'
        })
    }
})
app.post('/login', async (req, res) => {
    // Check for correct parameters
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

    // Check that the user exists
    let user = await data.getUser(username)
    if (!user) {
        res.status(404)
        return res.render('message', {
            title: 'Login',
            header: 'Login Failed',
            message: 'User does not exist'
        })
    }

    // Check for correct credentials
    if (bcrypt.compareSync(password, user.pw_hash)) {
        req.session.token = jwt.encode({username}, secret)
        req.session.username = username
        res.status(200)
        res.render('message', {
            title: 'Login',
            header: 'Login Successful',
            message: `You've logged in as ${username}`
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
    req.session.username = null
    req.session.token = null
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
    // Check for correct parameters
    let username = req.body.username
    let password = req.body.password
    if (!username || !password) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    // Check that the user exists
    let user = await data.getUser(username)
    if (!user) {
        res.status(404)
        return res.send({msg: 'User does not exist'})
    }

    // Check for correct credentials
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
    // Check for correct parameter
    let token = req.body.token ?? req.session.token
    let content = req.body.content
    if (!token || !content) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    // Check content length
    if (content.length > 300) {
        res.status(403)
        return res.send({msg: 'Content is over 300 characters'})
    }

    // Check that the user exists
    let username = jwt.decode(token, secret).username
    if (!await data.getUser(username)) {
        res.status(404)
        return res.send({msg: 'User does not exist'})
    }

    // Create the post
    if (await data.newPost(username, content)) {
        res.status(201)
        res.send({msg: 'Post successfully created'})
    } else {
        res.status(500)
        res.send({msg: 'An unexpected error occurred'})
    }
})
app.put('/api/post', async (req, res) => {
    // Check for correct parameters
    let token = req.body.token ?? req.session.token
    let id = req.body.id
    let content = req.body.content
    if (!token || !id || !content) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    // Check content length
    if (content.length > 300) {
        res.status(403)
        return res.send({msg: 'Content is over 300 characters'})
    }

    // Check that the post exists
    let post = await data.getPost(id)
    if (!post) {
        res.status(404)
        return res.send({msg: 'Post does not exist'})
    }

    // Check that the username is correct
    let username = jwt.decode(token, secret).username
    if (username != post.username) {
        res.status(403)
        return res.send({msg: 'Invalid token'})
    }

    // Create the post
    if (await data.editPost(id, content)) {
        res.status(201)
        res.send({msg: 'Post successfully created'})
    } else {
        res.status(500)
        res.send({msg: 'An unexpected error occurred'})
    }
})
app.delete('/api/post', async (req, res) => {
    // Check for correct parameters
    let token = req.body.token ?? req.session.token
    let id = req.body.id
    if (!token || !id) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    // Check that the post exists
    let post = await data.getPost(id)
    if (!post) {
        res.status(404)
        return res.send({msg: 'Post does not exist'})
    }

    // Check for the correct token
    let username = jwt.decode(token, secret).username
    if (username != post.username) {
        res.status(403)
        return res.send({msg: 'Invalid token'})
    }

    // Delete the post
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
    // Check for correct parameters
    let token = req.body.token ?? req.session.token
    let id = req.body.id
    if (!token || !id) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    // Check that the post exists
    let post = await data.getPost(id)
    if (!post) {
        res.status(404)
        return res.send({msg: 'Post does not exist'})
    }

    // Check that the user exists
    let username = jwt.decode(token, secret).username
    let user = await data.getUser(username)
    if (!user) {
        res.status(404)
        return res.send({msg: 'User does not exist'})
    }

    // Send like status
    let liked = await data.hasLiked(username, id)
    res.status(200)
    res.send({liked})
})
app.put('/api/like', async (req, res) => {
    // Check paramters correct
    let token = req.body.token ?? req.session.token
    let id = req.body.id
    let status = req.body.status !== false
    if (!token || !id) {
        res.status(400)
        return res.send({msg: 'Request is missing required parameters'})
    }

    // Check post exists
    let post = await data.getPost(id)
    if (!post) {
        res.status(404)
        return res.send({msg: 'Post does not exist'})
    }

    // Check user exists
    let username = jwt.decode(token, secret).username
    let user = await data.getUser(username)
    if (!user) {
        res.status(404)
        return res.send({msg: 'User does not exist'})
    }

    // Set like status
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