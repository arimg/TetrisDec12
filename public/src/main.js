var utils = require('./utils.js');
var consts = require('./consts.js');
var socketFunc = require('./socket.js');
var shapes = require('./shapes.js');
var views = require('./views.js');
var canvas = require('./canvas.js');

/**
	Init game matrix
*/
var initMatrix = function (rowCount, columnCount) {
	var result = [];
	for (var i = 0; i < rowCount; i++) {
		var row = [];
		result.push(row);
		for (var j = 0; j < columnCount; j++) {
			row.push(0);
		}
	}
	return result;
};

/**
  Clear game matrix
*/
var clearMatrix = function (matrix) {
	for (var i = 0; i < matrix.length; i++) {
		for (var j = 0; j < matrix[i].length; j++) {
			matrix[i][j] = 0;
		}
	}
};

/**
	Check all full rows in game matrix
	return rows number array. eg: [18,19];
*/
var checkFullRows = function (matrix) {
	var rowNumbers = [];
	for (var i = 0; i < matrix.length; i++) {
		var row = matrix[i];
		var full = true;
		for (var j = 0; j < row.length; j++) {
			full = full && row[j] !== 0;
		}
		if (full) {
			rowNumbers.push(i);
		}
	}
	return rowNumbers;
};

/**
	Remove one row from game matrix. 
	copy each previous row data to  next row  which row number less than row;
*/
var removeOneRow = function (matrix, row) {
	var colCount = matrix[0].length;
	for (var i = row; i >= 0; i--) {
		for (var j = 0; j < colCount; j++) {
			if (i > 0) {
				matrix[i][j] = matrix[i - 1][j];
			} else {
				matrix[i][j] = 0;
			}
		}
	}
};
/**
	Remove rows from game matrix by row numbers.
*/
var removeRows = function (matrix, rows) {
	for (var i in rows) {
		removeOneRow(matrix, rows[i]);
	}
};

/**
	Check game data to determin wether the  game is over
*/
var checkGameOver = function (matrix) {
	var firstRow = matrix[0];
	for (var i = 0; i < firstRow.length; i++) {
		if (firstRow[i] !== 0) {
			return true;
		};
	}
	return false;
};


/**
	Calculate  the extra rewards add to the score
*/
var calcRewards = function (rows) {
	// if (rows && rows.length > 1) {
	// 	return Math.pow(2, rows.length - 1) * 100;
	// }
	return 0;
};

/**
	Calculate game score
*/
var calcScore = function (rows) {
	if (rows && rows.length) {
		switch (rows.length) {
			case 1:
				return 40;
				break;
			case 2:
				return 100;
				break;
			case 3:
				return 300;
				break;
			case 4:
				return 1200;
				break;
			default:
				return 0;
		}
	}
	return 0;
};

/**
	Calculate time interval by level, the higher the level,the faster shape moves
*/
// var calcIntervalByLevel = function (level) {
// 	return consts.DEFAULT_INTERVAL; //In order to return default interval - (level - 1) * 60;
// };


// Default max scene size
var defaults = {
	maxHeight: 500,
	maxWidth: 400
};

/**
	Tetris main object defination
*/
function Tetris(id, socket, options) {
	this.id = id; // container Id
	this.gameId = options.gameId || "";
	this.playerName = options.playerName;
	console.log("PlayerName :: " + this.playerName);
	this.socket = socket;
	this.playCount = 0;
	this.turnCount = 0;
	this.resetCount = 0;
	this.MAX_TURNS = 300000;
	console.log(this.socket);
	this.init();
}

Tetris.prototype = {

	init: function (options) {
		this.currentTurn = this.playerName;
		this.playersTally = null;
		this.socket.emit("join_game", { socketId: socket.id, gameId: this.gameId, playerName: this.playerName });
		//hardcoaded setting 
		views.setPlayer(this.playerName);
		views.setPlayCount(this.playCount);
		//JOIN ROOM ACK
		this.socket.on("join_room_ack", (data) => {
			console.log("join_room_ack :: " + data.joinedGame + " :: gameId ::" + data.gameId);
			this.gameId = data.gameId;
			this.playersTally = data.playersTally;

			if (!data.joinedGame) {
				views.setPairingMessage(true);
			} else {
				views.setPairingMessage(false);
				views.hideModal();
				this.startTime = data.startTime;
				console.log("StartTime "+ this.startTime);
			}

			if (data.currentTurn && data.joinedGame) {
				this.currentTurn = data.currentTurn;
				views.setNotification("TURN : " + this.currentTurn);
				views.setTurn(this.currentTurn);
				setTimeout(() => {
					console.log("Game Resume")
					if (this.isMyTurn()) {
						this.running = true;
						this._refresh();
					} else {
						this.running = false;
					}
				}, consts.WAIT_TIME * 1000);
			}

		})

		//GAME STATE
		this.socket.on('state', (data) => {
			this.state = data;
			this._setStatePayload(data);
			this._draw();
		});

		//TURN CHANGED
		this.socket.on("turn_change", (data) => {
			console.log("Game Freeze");
			this.pause();
			console.log("turn_change :: " + this.currentTurn);
			this.playCount = data.playCount;
			views.setPlayCount(this.playCount);
			this.currentTurn = data.currentTurn;
			this.turnCount = data.turnCount;
			views.setTurnCount(this.turnCount);
			this.playersTally = data.playersTally;
			console.log(this.playersTally);
			//changing current players last score to zero
			views.setNotification("TURN : " + this.currentTurn);
			views.setTurn(this.currentTurn);
			console.log("TURN:::::::::playerName :: " + this.playerName + ", playCount :: " + this.playCount + ", currentTurn ::" + this.currentTurn);

			setTimeout(() => {
				console.log("Game Resume")
				if (this.isMyTurn()) {
					this.running = true;
					this._refresh();
				} else {
					this.running = false;
				}
			}, consts.WAIT_TIME * 1000);

		})
		//TURN STATE
		this.socket.on("turn_state", (data) => {
			this.playCount = data.playCount;
			this.playersTally = data.playersTally;
			this.resetCount = data.resetCount;
			views.setPlayCount(this.playCount);
			console.log("TURN_STATE:::::::::playCount :: " + this.playCount);
		})
		//DISOCNNECT ACK
		this.socket.on("disconnect_ack", (data) => {
			console.log(data)
			if (data.disconnect) {
				// views.setNotification("Other player left please start a new game");
				this.isGameOver = true;
				views.setGameOver(this.isGameOver);
				views.setRedirectMessage("Other player left please start a new game");
				this.pause();
			}
		});

		var cfg = this.config = utils.extend(options, defaults);
		this.interval = consts.DEFAULT_INTERVAL;

		views.init(this.id, cfg.maxWidth, cfg.maxHeight);

		canvas.init(views.scene, views.preview);

		this.matrix = initMatrix(consts.ROW_COUNT, consts.COLUMN_COUNT);
		this.reset();

		this._initEvents();
		this._fireShape();
	},

	//Reset game
	reset: function () {
		this.running = false;
		this.isGameOver = false;
		this.level = 1;
		this.score = 0;
		this.startTime = new Date().getTime();
		this.currentTime = this.startTime;
		this.rotationCount = 0;
		this.spaceCount = 0;
		this.downCount = 0;
		this.rotateCount = 0;
		//this.prevTime = this.startTime;
		//this.levelTime = this.startTime;
		clearMatrix(this.matrix);
		//views.setLevel(this.level);
		views.setScore(this.score);
		views.setGameOver(this.isGameOver);
		this._draw();
	},
	//Start game
	start: function () {
		this.running = true;
		window.requestAnimationFrame(utils.proxy(this._refresh, this));
		if (this.isMyTurn()) {
			this.socketEmit(this._getStatePayload());
		}
	},
	//Pause game
	pause: function () {
		this.running = false;
		this.currentTime = new Date().getTime();
		this.prevTime = this.currentTime;
		if (this.isMyTurn()) {
			this.socketEmit("state", this._getStatePayload());
		}
	},
	//Game over
	gamveOver: function () {

	},
	//isMyTurn =>
	isMyTurn: function () {
		return (this.playerName == this.currentTurn);
	},
	//state Payload
	_getStatePayload: function () {
		return {
			gameId: this.gameId,
			playerName: this.playerName,
			currentTurn: this.currentTurn,
			matrix: this.matrix,
			running: this.running,
			isGameOver: this.isGameOver,
			shape: this.shape,
			preparedShape: this.preparedShape,
			//level: this.level,
			interval: this.interval,
			score: this.score,
			startTime: this.startTime,
			currentTime: this.currentTime,
			prevTime: this.prevTime,
			resetCount: this.resetCount,
			spaceCount: this.spaceCount,
			rotateCount: this.rotateCount,
			downCount: this.downCount,
			//levelTime: this.levelTime
		}
	},
	// set state payload
	_setStatePayload: function (data) {

		this.matrix = data.matrix || this.matrix;
		if (this.running != data.running) {
			this.running = data.running;
			if (this.running) {
				this.start();
			}
		}

		this.isGameOver = data.isGameOver || this.isGameOver;
		//Shape
		if (this.shape) {
			this.shape.updateShape(data.shape);
		} else {
			this.shape = shapes.generateShape(data.shape);
		}

		//preparedShapes
		if (this.preparedShape) {
			this.preparedShape.updateShape(data.preparedShape);
		} else {
			this.preparedShape = shapes.generateShape(data.preparedShape);
		}
		canvas.drawPreviewShape(this.preparedShape);

		//change level in view on level change
		// if (this.level != data.level) {
		// 	this.level = data.level;
		// 	views.setLevel(this.level);
		// }

		this.interval = data.interval || this.interval;
		if (this.score != data.score) {
			this.score = data.score;
			views.setScore(this.score);
		}
		this.score = data.score || this.score;
		this.startTime = data.startTime || this.startTime;
		this.currentTime = data.currentTime || this.currentTime;
		this.prevTime = data.prevTime || this.prevTime;
		this.resetCount = data.resetCount || this.resetCount;
		//this.levelTime = data.levelTime || this.levelTime;
	},

	//socketEmit()
	socketEmit: function (event, message) {
		this.socket.emit(event, message);
	},


	// All key event handlers
	_keydownHandler: function (e) {
		var matrix = this.matrix;
		var myTurn = this.isMyTurn();
		if (!e) {
			var e = window.event;
		}
		if (this.isGameOver || !this.shape || !myTurn) {
			return;
		}

		switch (e.keyCode) {
			case 37: {
				if (!this.running) return;
				this.shape.goLeft(matrix);
				this._draw();
			}
				break;

			case 39: {
				if (!this.running) return;
				this.shape.goRight(matrix);
				this._draw();
			}
				break;

			case 38: {
				if (!this.running) return;
				this.rotateCount++;
				this.shape.rotate(matrix);
				this._draw();
			}
				break;

			case 40: {
				if (!this.running) return;
				this.downCount++;
				this.shape.goDown(matrix);
				this._draw();
			}
				break;

			//pause
			case 80: {
				if (this.running) {
					this.pause();
				} else {
					this.start();
				}
				this._draw();
			}
				break;

			case 32: {
				if (!this.running) return;
				this.spaceCount++;
				this.shape.goBottom(matrix);
				this._update();
			}
				break;
		}
		if (this.isMyTurn()) {
			this.socketEmit("state", this._getStatePayload())
		}
	},
	// Restart game
	_restartHandler: function () {
		this.reset();
		this.start();
	},
	// Bind game events
	_initEvents: function () {
		window.addEventListener('keydown', utils.proxy(this._keydownHandler, this), false);
		//views.btnRestart.addEventListener('click', utils.proxy(this._restartHandler, this), false);
	},


	// Fire a new random shape
	_fireShape: function () {
		this.shape = this.preparedShape || shapes.generateShape();
		if (this.isMyTurn()) {
			this.preparedShape = shapes.generateShape();
		}
		this._draw();
		this.socketEmit("state", this._getStatePayload());
		canvas.drawPreviewShape(this.preparedShape);
	},

	// Draw game data
	_draw: function () {
		canvas.drawScene();
		canvas.drawShape(this.shape);
		canvas.drawMatrix(this.matrix);
	},
	// Refresh game canvas
	_refresh: function () {

		if (!this.running) {
			return;
		}

		this.currentTime = new Date().getTime();
		if (this.currentTime - this.prevTime > this.interval) {
			this._update();
			this.prevTime = this.currentTime;
		}
		if (!this.isGameOver) {
			window.requestAnimationFrame(utils.proxy(this._refresh, this));
		}
	},
	// Update game data
	_update: function () {
		if (this.isMyTurn()) {
			if (this.shape.canDown(this.matrix)) {
				this.shape.goDown(this.matrix);
			} else {
				this.shape.copyTo(this.matrix);
				this._check();
				this._fireShape();
				this.socketEmit("block_landed", {
					gameId: this.gameId,
					playerName: this.playerName,
					currentTurn: this.currentTurn,
					playCount: this.playCount + 1,
					turnCount: this.turnCount,
					score: this.score,
					resetCount: this.resetCount,
					playersTally: this.playersTally,
					spaceCount: this.spaceCount,
					rotateCount: this.rotateCount,
					downCount: this.downCount,
				})
				views.setPlayCount(this.playCount);
				views.setTurnCount(this.turnCount);
			}
			if (this.isMyTurn()) {
				this.socketEmit("state", this._getStatePayload());
			}
		}
		this._draw();

		let endGame = checkGameOver(this.matrix);
		if (this.turnCount < this.MAX_TURNS) {
			if (this.isMyTurn() && endGame == true) {
				clearMatrix(this.matrix);
				this.resetCount = this.resetCount + 1;
				this.socketEmit("game_reset", this._getStatePayload());
			}
		} else {
			endGame = true;
			this.isGameOver = endGame;
			views.setGameOver(this.isGameOver);
		}

		if (this.isGameOver) {
			views.setFinalScore(this.score);
		}
	},
	// Check and update game data
	_check: function () {
		var rows = checkFullRows(this.matrix);
		if (rows.length) {
			removeRows(this.matrix, rows);
			var score = calcScore(rows);
			var reward = calcRewards(rows);
			this.score += score + reward;
			this.playersTally[this.socket.id].totalScore += (score + reward);
			this.playersTally[this.socket.id].lastScore += (score + reward);
			views.setScore(this.score);
			views.setReward(reward);
		}
	},

	// Check and update game level
	// _checkLevel: function () {
	// 	var currentTime = new Date().getTime();
	// 	if (currentTime - this.levelTime > consts.LEVEL_INTERVAL) {
	// 		this.level += 1;
	// 		this.interval = calcIntervalByLevel(this.level);
	// 		views.setLevel(this.level);
	// 		this.levelTime = currentTime;
	// 	}
	// }
}


window.Tetris = Tetris;





