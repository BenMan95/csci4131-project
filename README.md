# csci4131-project

A website created as a project for one of my classes.

## Usage
- Setup:
    - Requires Node.js installed
    - After unzipping or cloning, run `npm install` from the project directory to install required packages
- Running:
  - Setup a SSH tunnel to `cse-mysql-classes-01.cse.umn.edu`
    - This can be done with the command `ssh -L 3306:cse-mysql-classes-01.cse.umn.edu:3306 <csel-machine>` in another terminal
  - Begin running the website with `node server.js` from the project directory
