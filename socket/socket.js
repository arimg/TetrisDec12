const uuidv1 = require('uuid/v1');
const Game = require("../models/Game");
const TurnEntry = require("../models/TurnEntry");

//Handle New Connection
const newConnection = function (socket, io, options) {
    console.log("Socket ID :: " + socket.id);
    //JOIN_GAME
    socket.on("join_game", (data) => { joinRoom(socket, io, data, options) });
    //STATE
    socket.on("state", (data) => braodcastState(socket, io, data, options));
    //DISCONNECTION
    socket.on('disconnect', (data) => disconnect(socket, io, data, options));
    //TURN_CHANGE
    socket.on("block_landed", (data) => blockLandedHandler(socket, io, data, options));
    //RESET EVENT
    socket.on("game_reset", (data) => resetHandler(socket, io, data, options));
}

//JOIN ROOM
function joinRoom(socket, io, data, options) {
    let { players, games, MAX_GAME_PLAYERS } = options;

    var player = {
        playerName: data.playerName,
        socket: socket
    }

    //Add to waiting players list
    players.push(player);


    if (players.length == MAX_GAME_PLAYERS) {
        let uniqueGameId = uuidv1();
        data.gameId = uniqueGameId;

        var gamePlayers = [];
        var playersTally = {};


        players.forEach(player => {
            console.log("joined")
            playersTally[player.socket.id] = {
                playerName: player.playerName,
                gameId: uniqueGameId,
                totalScore: 0,
                lastScore: 0,
                totalTurns: 0,
            }
            player.socket.join(uniqueGameId);
            let gamePlayer = {
                playerName: player.playerName,
                socketId: player.socket.id
            };
            gamePlayers.push(gamePlayer);
        });

        // Creating game instance for DB
        let gameObj = new Game({
            gameId: uniqueGameId,
            players: gamePlayers,
            startTime: new Date(),
            endTime: null,
        })

        gameObj.save(); // saving data to db.


        games[data.gameId] = gamePlayers;

        // Reset Options
        options.players = [];

        var currentTurn = gamePlayers[0].playerName;
        var currentPlayerSocketId = gamePlayers[0].socketId;
        //Updating current player turn count to one.
        playersTally[currentPlayerSocketId].totalTurns += 1;
       
        io.in(uniqueGameId).emit("join_room_ack", {
            joinedGame: true,
            gameId: data.gameId,
            status: "paired",
            startTime: gameObj.startTime,
            turnCount: 0,
            currentTurn: currentTurn,
            playersTally: playersTally,
            players: gamePlayers    //changed
        })
    } else {
        socket.emit("join_room_ack", { joinedGame: false, status: "waiting" });
    }
}


//BROADCAST GAME STATE
function braodcastState(socket, io, data) {
    socket.broadcast.to(data.gameId).emit("state", data);
}

//DISCONNECT
async function disconnect(socket, io, data, options) {
    let { players, games } = options;
    let socketId = socket.id;
    for (var i = 0; i < players.length; i++) {
        if (players[i].socket.id == socket.id) {
            console.log(players[i]);
            players.splice(i, 1);
        }
    }

    let currentGameId;
    let currentPlayer;
    let disconnectGameId;
    for (var gameId in games) {
        let players = games[gameId]
        players.forEach((player) => {
            if (player.socketId == socketId) {
                //deleting game from games
                currentGameId = gameId;
                currentPlayer = player.playerName;
                delete games[gameId];
                disconnectGameId = gameId;
                //Removing All Players from room
            }
        });
    }

    let currentGame = await Game.findOne( {"gameId": currentGameId} );

    //Updating End time and Player which left
    if(currentGame){
        currentGame.endTime = new Date();
        currentGame.playerLeft = currentPlayer;
        currentGame.save();
    }

    socket.leave();
    io.in(disconnectGameId).emit("disconnect_ack", {
        disconnect: true
    })

    console.log("disconnected");
}

//BLOCK LANDED
function blockLandedHandler(socket, io, data, options) {
    var { NUM_PLAYS, games, players, MAX_GAME_PLAYERS, MAX_SCORE } = options;

    var gamePlayers = games[data.gameId];

    if (!(data.playCount % NUM_PLAYS)) {
        console.log("TURN_COUNT :: " + data.turnCount + "RESET_COUNT :: " + data.resetCount);
        let nextPlayerId = null;
        //if num plays are completed then increase the turn count
        data.turnCount = data.turnCount + 1;

        //update the data in the db
        var turnDataObj = {
            gameId: data.gameId,
            playerScore: [],
            playerTurns: [],
            turnCount: data.turnCount,
            resetCount: data.resetCount,
            spaceCount: data.spaceCount,
			rotateCount: data.rotateCount,
			downCount: data.downCount,
        }
        console.log("space :"+data.spaceCount+" rotate: "+data.rotateCount+" downCount: "+data.downCount);

        gamePlayers.forEach((player) => {
            let { socketId } = player;
            console.log(data.playersTally[socketId]);
            turnDataObj.playerTurns.push(data.playersTally[socketId].totalTurns);
            turnDataObj.playerScore.push(data.playersTally[socketId].totalScore);
        });
        //console.log(turnDataObj);

        //Updating Game object from db
        let turnEntry = new TurnEntry(turnDataObj);
        turnEntry.save();

        if (data.turnCount < MAX_GAME_PLAYERS) {
            console.log("Total game turns :: " + data.turnCount + " index " + (data.turnCount) % MAX_GAME_PLAYERS);
            nextPlayerId = gamePlayers[((data.turnCount) % MAX_GAME_PLAYERS)].socketId;
        } else {
            nextPlayerId = turnCalulator(data.playersTally, data.playCount, NUM_PLAYS, MAX_SCORE);
        }

        data.currentTurn = data.playersTally[nextPlayerId].playerName;
        data.playersTally[nextPlayerId].totalTurns += 1;
        data.playersTally[nextPlayerId].lastScore = 0;
        io.in(data.gameId).emit("turn_change", data);
    } else {
        io.in(data.gameId).emit("turn_state", data);
    }
}

//GAME RESET
function resetHandler(socket, io, data, options) {
    socket.broadcast.to(data.gameId).emit("state", data);
}
//PROBABILITY FUNCTION
function get(input) {
    var array = [];
    for (var item in input) {
        if (input.hasOwnProperty(item)) { // Safety
            for (var i = 0; i < input[item]; i++) {
                array.push(item);
            }
        }
    }
    // Probability Fun
    return array[Math.floor(Math.random() * array.length)];
}

function turnCalulator(players, playCount, NUM_PLAYS, MAX_SCORE) {
    // players, playersScore, playersTurn, playCount, numPlayers,50/50
    let arrayIds = Object.keys(players);
    let maxTrend = Number.MIN_SAFE_INTEGER;
    let upperBound = -200;
    let maxPlayerId;
    let lowerPlayer;
    for (let i = 0; i < arrayIds.length; i++) {
        let id = arrayIds[i];
        let player = players[id];
        let trend = Math.exp((-.01) * player.totalTurns);
        let delta = Math.sqrt(((2 * Math.log(playCount / NUM_PLAYS) / player.totalTurns)));
        let averageReward = ((player.totalScore / player.totalTurns) / MAX_SCORE);
        let upperBound = ((averageReward + delta));//* trend;
        console.log("AVG_SOCRE :: " + averageReward);
        if (upperBound > maxTrend) {
            maxTrend = upperBound;
            maxPlayerId = id;

        }
    }
    return maxPlayerId;
}


//SOCKET MAIN
const main = function (io) {
    var options = {
        players: [],
        games: {},
        MAX_GAME_PLAYERS: 2,
        NUM_PLAYS: 7,
        MAX_SCORE: 300
    }
    io.sockets.on('connection', (socket) => {
        console.log(`OPTIONS :: NUM_PLAYS :: ${options.NUM_PLAYS}, MAX_SCORE :: ${options.MAX_SCORE}`);
        newConnection(socket, io, options)
    });
}

module.exports = main;