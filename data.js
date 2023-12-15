// this package behaves just like the mysql one, but uses async await instead of callbacks.
const mysql = require(`mysql-await`); // npm install mysql-await

// first -- I want a connection pool: https://www.npmjs.com/package/mysql#pooling-connections
// this is used a bit differently, but I think it's just better -- especially if server is doing heavy work.
var connPool = mysql.createPool({
  connectionLimit: 5, // it's a shared resource, let's not go nuts.
  host: "127.0.0.1",// this will work
  user: "C4131F23U47",
  database: "C4131F23U47",
  password: "2259", // we really shouldn't be saving this here long-term -- and I probably shouldn't be sharing it with you...
});

// later you can use connPool.awaitQuery(query, data) -- it will return a promise for the query results.

async function userExists(username) {
  result = await connPool.awaitQuery(`SELECT * FROM user
                                      WHERE username=?`,
                                      [username])
  return result.length != 0
}

async function postExists(id) {
  result = await connPool.awaitQuery(`SELECT * FROM post
                                      WHERE id=?`,
                                      [id])
  return result.length != 0
}

async function newUser(username, hash) {
  if (await userExists(username))
    return false

  // Create user
  result = await connPool.awaitQuery(`INSERT INTO user (username, pw_hash)
                                      VALUES (?, ?)`,
                                      [username, hash])
  return result.affectedRows == 1
}

async function newPost(username, content) {
  if (!await userExists(username))
    return false

  result = await connPool.awaitQuery(`INSERT INTO post (username, content)
                                      VALUES (?, ?)`,
                                      [username, content])
  return result.affectedRows == 1
}

async function userPostsByTime(username) {
  return await connPool.awaitQuery(`SELECT post.*, COUNT(liked.post_id) AS likes
                                    FROM post LEFT JOIN liked
                                    ON post.id=liked.post_id
                                    WHERE post.username=?
                                    GROUP BY post.id
                                    ORDER BY time_posted DESC`,
                                    [username])
}

async function userPostsByLiked(username) {
  return await connPool.awaitQuery(`SELECT post.*, COUNT(liked.post_id) AS likes
                                    FROM post LEFT JOIN liked
                                    ON post.id=liked.post_id
                                    WHERE post.username=?
                                    GROUP BY post.id
                                    ORDER BY likes DESC`,
                                    [username])
}

async function editPost(id, content) {
  if (!await postExists(id))
    return false

  result = await connPool.awaitQuery(`UPDATE post
                                      SET content=?
                                      WHERE id=?`,
                                      [content, id])
  return result.affectedRows == 1
}

async function deletePost(id) {
  // Delete all likes on the post
  await connPool.awaitQuery(`DELETE FROM liked
                             WHERE post_id=?`,
                             [id])

  // Delete the post itself
  result = await connPool.awaitQuery(`DELETE FROM post
                                      WHERE id=?`,
                                      [id])
  return result.affectedRows != 0
}

async function likePost(username, id) {
  if (!await userExists(username))
    return false

  if (!await postExists(id))
    return false

  // Check if post is already liked by user
  result = await connPool.awaitQuery(`SELECT * FROM liked
                                      WHERE username=? AND post_id=?`,
                                      [username, id])
  if (result.length != 0)
    return false

  // Like the post
  result = await connPool.awaitQuery(`INSERT INTO liked
                                      VALUES (?, ?)`,
                                      [username, id])
  return true
}

async function unlikePost(username, id) {
  if (!await userExists(username))
    return false

  if (!await postExists(id))
    return false

  // Check if post is already liked by user
  result = await connPool.awaitQuery(`SELECT * FROM liked
                                      WHERE username=? AND post_id=?`,
                                      [username, id])
  if (result.length == 0)
    return false

  // Like the post
  result = await connPool.awaitQuery(`DELETE FROM liked
                                      WHERE username=? AND post_id=?`,
                                      [username, id])
  return true
}

module.exports = {userExists, postExists, newUser, newPost, userPostsByTime, userPostsByLiked, editPost, deletePost, likePost, unlikePost}