# Fairness Games- Collaborative Tetris
Developing a Collaboritve Tetris Game for learning about fairness. 

## Getting Started

### Online
Type the following URL:
```
coltetris.herokuapp.com
```

### To push edits online:

Initialize(Only need to do this one time to add heroku):

1.) Download Tetris2 folder

2.) Navigate to the Tetris2 folder

3.) Run: heroku create  and git remote -v

Any time you make an edit and want to push online:

1.) Cd to the Tetris2 folder

2.) git pull heroku master

3.) git commit -am"changes"

4.) git push heroku master


#Run Locally:

1.) Navigate to Tetris2 folder

2.) On Terminal Run:
```
npm run dev
```
3.) On Web browser: 
```
localhost:5000
```

#Installation

1. Download Node.js & NPM
https://nodejs.org/en/download/
https://www.npmjs.com/get-npm

2. Navigate to TETRIS folder in Terminal
3. Execute "sudo npm install"

#Running Locally.
1. Navigate to TETRIS folder in Terminal
2. Execute "npm run dev" to run it locally

#Running Remotely on HEROKU SERVER
1. git add .
2. git commit -m "commit-message"
3. git push heroku master


#Changing Algorithm constant
1. Navigate to ./TETRIS/socket/socket.js
2. function turnCalulator() do the changes then repeate the above steps to run it. 
