# csci4131-project

A website created as a project for one of my classes.

## Features
- Users can register/login/logout with username and password
  - Maximum username length is 20
  - Login session saved until user logs out
  - Passwords are hashed
    - As of the time of submission, all passwords are set to "password"
  - Includes API to directly get user token
    - Can be used to create/edit/delete or like/unlike posts
- Can view all posts from main page
- Can view a single user's posts from that user's page
  - Can navigate to a user's page by clicking on their name in a post
  - Can navigate to own page by clicking on name in navigation bar while logged in
- Post viewing is paginated in pages of 10 posts each
- Can sort posts by most recent or most liked
- Users can create, edit, and delete posts of up to 300 characters
  - Cannot be done from home page, must be done from own page
- Registered users can like posts. Likes are tracked individually for each user

## Usage
- Setup:
    - Requires Node.js installed
    - After unzipping or cloning, run `npm install` from the project directory to install required packages
- Running:
  - Setup a SSH tunnel to `cse-mysql-classes-01.cse.umn.edu`
    - This can be done with the command `ssh -L 3306:cse-mysql-classes-01.cse.umn.edu:3306 <csel-machine>` in another terminal
  - Begin running the website with `node server.js` from the project directory
