var schema = new Schema({
    minimumBuyin: {
        type: Number,
        require: true
    },
    smallBlind: {
        type: Number,
        require: true
    },
    bigBlind: {
        type: Number,
        require: true
    },
    emu: String,
    maximumNoOfPlayers: {
        type: Number,
        require: true
    },
    name: {
        type: String,
        require: true
    },
    image: {
        type: String,
        default: ""
    },
    isOpen: Boolean,
    type: String,
    cameraUrl: String,
    ip: String,
    dealer: Number,
    timeoutTime: Number,
    ante: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: [
            'beforeStart',
            'serve',
            'preFlop',
            'Flop',
            'Turn',
            'River',
            'winner'
        ],
        default: 'beforeStart'
    },
    activePlayer: [{
        type: Schema.Types.ObjectId,
        ref: 'Player'
    }],
    isStraddle: {
        type: Boolean,
        default: false
    },
    setDealer: {
        type: Boolean,
        default: false
    },
    currentRoundAmt: [{
        playerNo: {
            type: Number
        },
        amount: {
            type: Number
        }
    }, ],
    youTubeUrl: {
        type: String,
        default: ""
    },
    history: {
        type: [{
            activePlayers: [{
                type: Schema.Types.ObjectId,
                ref: 'User'
            }],
            potWinners: [{
                winnerPlayer: [{
                    playerId: {
                        type: Schema.Types.ObjectId,
                        ref: 'User'
                    },
                    winningCards: []
                }],
                potName: String,
                amount: Number
            }],

        }],
        default: []
    },
    rakeRate: {
        type: Number,
        default: 0
    }

});

schema.plugin(deepPopulate, {
    "history.potWinners.winnerPlayer.playerId": {
        select: '_id name'
    }
});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Table', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema, 'history.potWinners.winnerPlayer.playerId', 'history.potWinners.winnerPlayer.playerId'));
var model = {
    getAllTable: function (data, callback) {
        var requiredData = Player.requiredData();
        this.find({}, requiredData.table).exec(callback);
    },

    makePlayerInactive: function (data, callback) {
        console.log("makePlayerInactive ", data);
        async.parallel({
            user: function (callback) {
                User.findOne({
                    accessToken: data.accessToken
                }).exec(callback);
            },

            player: function (callback) {
                Player.find({
                    table: data.tableId,
                    //  playerNo: data.playerNo
                }).exec(callback);
            }
        }, function (err, result) {
            if (_.isEmpty(result.user) || _.isEmpty(result.player)) {
                callback("Invalide Request");
                return 0;
            }

            var removerPlayer = _.find(result.player, function (p) {
                return (result.user._id + "" == p.user + "");
            });
            // var socketId = result.player.socketId;
            if (!removerPlayer) {
                callback(null);
                return 0;
            }

            if (data.tableLeft) {
                removerPlayer.tableLeft = true;
            } else {
                removerPlayer.tableLeft = false;
            }

            removerPlayer.save(callback);
        });
    },
    removePlayer: function (data, callback) {
        // console.log(data);
        async.parallel({
            user: function (callback) {
                User.findOne({
                    accessToken: data.accessToken
                }).exec(callback);
            },
            table: function (callback) {
                Table.findOne({
                    _id: data.tableId
                }).exec(callback);
            },
            player: function (callback) {
                Player.find({
                    table: data.tableId,
                    //  playerNo: data.playerNo
                }).exec(callback);
            }
        }, function (err, result) {
            if (err) {
                callback(err);
            } else {

                if (_.isEmpty(result.user) || _.isEmpty(result.player) || _.isEmpty(result.table)) {
                    callback("Invalide Request");
                    return 0;
                }

                var removerPlayer = _.find(result.player, function (p) {
                    return (result.user._id + "" == p.user + "");
                });
                // var socketId = result.player.socketId;
                if (!removerPlayer) {
                    callback(null);
                    return 0;
                }

                var removedIds = _.remove(result.table.activePlayer, function (p) {
                    //console.log((p + "" == removerPlayer._id + ""));
                    return (p + "" == removerPlayer._id + "");
                });



                var player = _.cloneDeep(removerPlayer)
                var socketId = removerPlayer.socketId;
                var removeCheck = false;
                var playerNo = removerPlayer.playerNo;
                if (result.table.status == 'beforeStart' && !player.isDealer && !player.isSmallBlind && !player.isBigBlind) {
                    removeCheck = true;
                }

                if (!player.isActive && !player.tableLeft && !player.isDealer && !player.isSmallBlind && !player.isBigBlind) {
                    removeCheck = true;
                }
                //  console.log("removedIds", removedIds);
                //  console.log("removerPlayer...........", removerPlayer)
                //result.table.activePlayer = result.table.activePlayer;
                result.table.markModified('activePlayer');
                //console.log("socketId....", socketId);
                //console.log("result.table ", String("room" + result.table._id));
                async.waterfall([
                    function (callback) {
                        if (removeCheck) {
                            removerPlayer.remove(function (err) {
                                callback(err);
                            });
                        } else {
                            // Player.fold({
                            //     tableId: data.tableId,
                            //     accessToken: 'fromSystem',
                            //     foldPlayer: removerPlayer
                            // }, function (err) {
                            //     Player.findOneAndUpdate({
                            //         table: data.tableId,
                            //         _id: removerPlayer._id
                            //     }, {
                            //         $set: {
                            //             isFold: false,
                            //             cards: [],
                            //             isTurn: false,
                            //             cardsServe: 0,
                            //             isLastBlind: false,
                            //             hasRaised: false,
                            //             isAllIn: false,
                            //             hasRaisedd: false,
                            //             hasChecked: false,
                            //             hasCalled: false,
                            //             isSmallBlind: false,
                            //             isBigBlind: false,
                            //             totalAmount: 0,
                            //             hasTurnCompleted: false,
                            //             tableLeft: true,
                            //         },

                            //     }, {
                            //         new: true
                            //     }, function (err, result) {
                            //        callback(err); 
                            //     });
                            // });
                            removerPlayer.tableLeft = true;
                            removerPlayer.isActive = true;
                            removerPlayer.cards = [];
                            // removerPlayer.user = "";
                            removerPlayer.save(function (err, foldPlayer) {
                                if (err) {
                                    callback(err);
                                } else {
                                    Player.fold({
                                        tableId: data.tableId,
                                        accessToken: 'fromSystem',
                                        foldPlayer: foldPlayer
                                    }, function (err) {
                                        callback(err);
                                    });
                                }
                            });
                        }
                    },
                    // function (callback) {
                    //     console.log("inside removePlayer.......");
                    //     Player.removeInactivePlayer({
                    //         tableId: data.tableId
                    //     }, callback);
                    // }

                    // function (callback) {
                    //     Transaction.tableLostAmount(player, callback);

                    // }
                    // function (callback) {
                    //     sails.sockets.leave(socketId, String("room" + result.table._id), callback);
                    // }
                ], function (err, result) {
                    Player.removeInactivePlayer({
                        tableId: data.tableId
                    }, function (err) {
                        Table.blastRemoveSocket(data.tableId, {
                            removePlayer: true,
                            playerNo: playerNo
                        });
                        callback(err);
                    });

                    // console.log("err", err);

                });


            }
        });
    },
    connectSocket: function (table, socketId, user, player, callback) {
        if (table.activePlayer) {
            table.activePlayer.push(
                player._id
            );
        } else {
            table.activePlayer = [
                player._id
            ];
        }
        async.parallel([
            // function (callback) {
            //     console.log(table._id);
            //     console.log(table._id + "");
            //     sails.sockets.join(socketId, 'room' + table._id, callback);
            //     // callback();
            // },
            function (callback) {
                table.save(callback);
            }
        ], function (err, data) {
            if (err) {
                console.log(err);
                callback(err);
            } else {
                //  console.log(sails.sockets.rooms());
                // sails.sockets.subscribers(table._id, function(err, socketId){
                //        console.log(socketId);
                // });
                Table.blastAddPlayerSocket(table._id);
                callback(err, player);
            }
        });
        // table.save(function (err, data) {
        //     sails.sockets.join(socketId, table._id, function(err){

        //     });

        // });
    },
    socketBroadcast: function (data, callback) {
        sails.sockets.broadcast(table._id, 'update', data);
    },

    addUserToTable: function (data, callback) {
        console.log(data);


        // sails.sockets.join(data.socketId, 'room'+ data.tableId , function(err, data1){
        //     sails.sockets.broadcast('room' + data.tableId, "Update", {name:"mansi"});   
        // });
        // sails.sockets.join(data.socketId, 'myRoom', function(err, data){
        //     if(err){
        //         console.log(err);
        //     }
        //     sails.sockets.broadcast('myRoom', "Update", "data send");   
        // });
        //sails.sockets.broadcast(data.socketId, 'Update', "sent data");
        async.parallel({
            user: function (callback) {
                User.findOne({
                    accessToken: data.accessToken
                }).exec(callback);
            },
            table: function (callback) {
                Table.findOne({
                    _id: data.tableId
                }).exec(callback);
            },
            players: function (callback) {
                Player.find({
                    table: data.tableId
                }).exec(callback);
            },
            CommunityCards: function (callback) {
                CommunityCards.find({
                    table: data.tableId
                }).exec(callback);
            }
        }, function (err, result) {

            if (!_.isEmpty(result.user)) {
                var user = result.user;
                var table = result.table;
                var playerIndex = -1;
                var dealerIndex = -1;
                //check for max players
                if (table.activePlayer && result.players.length == table.maximumNoOfPlayers) {
                    callback("Room Not Available");
                    return 0;
                }

                if (!data.playerNo && parseInt(data.amount) == NaN) {
                    callback("Invalid data");
                    return 0;
                }

                playerIndex = _.findIndex(result.players, function (p) {
                    return (p.user + "" == user._id + "" && p.table + "" == data.tableId + "" && !p.tableLeft);
                });

                smallBlindIndex = _.findIndex(result.players, function (p) {
                    return p.isDealer;
                });


                // console.log(playerAdded);
                // if (playerAdded) {

                //     playerIndex = _.findIndex(table.activePlayer, function (p) {
                //         return (p + "" == playerAdded._id + "");
                //     });
                // }

                // console.log("playerIndex ", playerIndex);
                //already exists
                if (playerIndex >= 0) {

                    callback("Player Already Added");
                    return 0;
                }

                var positionFilled = _.findIndex(result.players, function (p) {
                    return p.playerNo == data.playerNo && !p.tableLeft;
                });

                if (positionFilled >= 0) {
                    callback("position filled");
                    return 0;
                }
                var removePlayer = _.findIndex(result.players, function (p) {
                    return p.playerNo == data.playerNo
                });


                // Player.find({
                //     table: data.tableId
                // }).sort({
                //     playerNo: -1
                // }).limit(1).exec(function (err, playersData) {
                //     var player = {};
                //     console.log(playersData);
                //     if (playersData && playersData[0]) {
                //         player.playerNo = parseInt(playersData[0].playerNo) + 1;
                //     }
                //     // console.log(player.playerNo);
                //     if (!player.playerNo) {
                //         //  console.log("Inside");
                //         player.playerNo = 1;
                //     }
                var player = {};

                if (parseInt(data.payBigBlind)) {
                    player.payBigBlind = false
                }
                player.user = user._id;
                player.table = data.tableId;
                player.playerNo = data.playerNo;
                player.buyInAmt = data.amount;
                player.socketId = data.socketId;
                player.autoRebuy = data.autoRebuy;
                player.payBigBlind = data.payBigBlind;
                if (removePlayer >= 0) {
                    player.isDealer = result.players[removePlayer].isDealer;
                    player.isSmallBlind = result.players[removePlayer].isSmallBlind;
                    player.isBigBlind = result.players[removePlayer].isBigBlind;
                }
                if (result.table.status != "beforeStart" || smallBlindIndex != -1) {
                    player.isActive = false;
                }

                if (player.autoRebuy) {
                    player.autoRebuyAmt = player.buyInAmt;
                }

                async.waterfall([function (callback) {
                    Player.remove({
                        table: data.tableId,
                        playerNo: data.playerNo
                    }).exec(function (err) {
                        callback(err);
                    });
                }, function (callback) {
                    Player.saveData(player, function (err, player) {
                        if (err) {

                            callback(err);
                        } else {
                            if (_.isEmpty(result.CommunityCards)) {
                                //configuring things for rooms befor starting a game. 
                                // console.log("inside");
                                // sails.sockets.join('Update', data.tableId);
                                // sails.sockets.join('ShowWinner', data.tableId);
                                async.each([1, 2, 3, 4, 5, 6, 7, 8], function (cardNo, callback) {
                                    var comData = {};
                                    comData.cardNo = cardNo;
                                    comData.table = data.tableId;
                                    if (_.includes([1, 5, 7], cardNo)) {
                                        comData.isBurn = true;
                                    }
                                    CommunityCards.saveData(comData, callback);

                                }, function (err, data1) {
                                    Table.blastAddPlayerSocket(table._id);
                                    callback(err, player);
                                    // Table.connectSocket(table, data.socketId, user, player, callback);
                                });
                            } else {
                                Table.blastAddPlayerSocket(table._id);
                                callback(err, player);
                                //Table.connectSocket(table, data.socketId, user, player, callback);
                            }
                        }
                    });
                }], function (err, data) {
                    //console.log("err...................", err);
                    callback(err, data)
                });

                //  });
            } else {
                console.log("Please Login first");
                callback("Please Login first");
            }
        });
        // User.findOne({
        //     accessToken: data.accessToken
        // }).exec(function (err, user) {
        //     if (!_.isEmpty(user)) {
        //         Player.find({
        //             table: data.tableId
        //         }).sort({
        //             playerNo: -1
        //         }).limit(1).exec(function (err, playersData) {
        //             var player = {};
        //             console.log(playersData);
        //             if (playersData && playersData[0]) {
        //                 player.playerNo = parseInt(playersData[0].playerNo) + 1;
        //             }
        //             // console.log(player.playerNo);
        //             if (!player.playerNo) {
        //                 //  console.log("Inside");
        //                 player.playerNo = 1;
        //             }
        //             player.user = user._id;
        //             player.table = data.tableId;
        //             Player.saveData(player, function (err, player) {
        //                 if (err) {
        //                     callback(err);
        //                 } else {
        //                     if (player && player.playerNo == 1) {
        //                         //configuring things for rooms befor starting a game. 
        //                         console.log("inside");
        //                         // sails.sockets.join('Update', data.tableId);
        //                         // sails.sockets.join('ShowWinner', data.tableId);
        //                         async.each([1, 2, 3, 4, 5], function (cardNo, callback) {
        //                             var comData = {};
        //                             comData.cardNo = cardNo;
        //                             comData.table = data.tableId;
        //                             CommunityCards.saveData(comData, function () {
        //                                 callback();
        //                             });

        //                         }, function (err, data) {
        //                             callback(err, player);
        //                         });

        //                     } else {
        //                         callback(err, player);
        //                     }
        //                 }
        //             });
        //         });
        //     } else {
        //         callback("Login First");
        //     }


        // });
    },
    changeStatus: function (table, callback) {
        // table = new this(table);
        // console.log("inside changeStatus");
        // table.save(function (err, data) {
        //     callback(err, data);
        // });


        Table.findOneAndUpdate({
            _id: table._id
        }, {
            status: table.status
        }).exec(function (err, data) {
            switch (table.status) {
                case 'preFlop':

                    break;

                default:
                    callback(err, data);
            }

        });
    },

    blastSocketWinner: function (tableId, extraData) {

        // var newWinner = _.filter(data.winners, function (n) {
        //     return n.winner;
        // });
        // var finalWinner = _.map(newWinner, function (n) {
        //     var obj = {
        //         cards: n.cards,
        //         descr: n.descr,
        //         playerNo: n.playerNo
        //     };
        //     return obj;
        // });
        // sails.sockets.blast("ShowWinner", {
        //     data: finalWinner
        // });

        Player.getAllDetails({
            tableId: tableId
        }, function (err, allData) {
            // if (!fromUndo) {
            //     GameLogs.create(function () {});
            // } else {
            //     allData.undo = true;
            // }
            // if (data && data.newGame) {
            //     allData.newGame = true;
            // }

            if (err) {
                console.log(err);
            } else {
                if (extraData) {
                    allData.extra = extraData;
                } else {
                    allData.extra = {};
                }
                console.log("Inner blast socket winner", tableId);
                console.log("allData ", allData);
                _.each(allData.pots, function (p) {
                    _.each(p.winner, function (w) {
                        var winningCards = [];
                        _.each(w.winningCards, function (c) {
                            var card = {};
                            var cardNumber = 0;
                            var cardNo = _.filter(allData.CommunityCards, function (cc) {
                                return cc.cardValue == c;
                            });
                            if (!_.isEmpty(cardNo)) {
                                cardNumber = cardNo.cardNo;
                            } else {
                                cardNumber = 0;
                            }
                            card.value = c;
                            card.no = cardNumber;
                            winningCards.push(card);
                        });
                        w.winningCards = winningCards;
                    })
                });
                // sails.sockets.broadcast("room" + tableId, "showWinner", {
                //     data: allData
                // });
                if (allData.table && allData.table.status != 'beforeStart' && allData.table.status != 'serve') {
                    _.each(allData.players, function (p) {
                        if (!p.tableLeft) {
                            sails.sockets.broadcast(p.socketId, "showWinner", {
                                data: allData
                            });
                        }
                    });

                    _.each(allData.dealer, function (d) {
                        sails.sockets.broadcast(d.socketId, "showWinner", {
                            data: allData
                        });
                    });

                    _.each(allData.admin, function (a) {
                        sails.sockets.broadcast(a.socketId, "showWinner", {
                            data: allData
                        });
                    });
                }
            }
        }, true);
    },
    blastAddPlayerSocket: function (tableId, extraData) {
        Player.getAllDetails({
            tableId: tableId
        }, function (err, allData) {
            // if (!fromUndo) {
            //     GameLogs.create(function () {});
            // } else {
            //     allData.undo = true;
            // }
            // if (data && data.newGame) {
            //     allData.newGame = true;
            // }

            if (err) {
                console.log(err);
            } else {
                if (extraData) {
                    allData.extra = extraData;
                } else {
                    allData.extra = {};
                }
                //console.log(allData);
                sails.sockets.blast("seatSelection", {
                    data: allData
                });


                // sails.sockets.broadcast("room" + tableId, "Update", {
                //     data: allData
                // });
            }
        });
    },
    blastNewGame: function (tableId, extraData) {
        Player.getAllDetails({
            tableId: tableId
        }, function (err, allData) {
            // if (!fromUndo) {
            //     GameLogs.create(function () {});
            // } else {
            //     allData.undo = true;
            // }
            // if (data && data.newGame) {
            //     allData.newGame = true;
            // }

            if (err) {
                console.log(err);
            } else {
                if (!_.isEmpty(extraData)) {

                    allData.extra = extraData;
                } else {
                    allData.extra = {};
                }
                console.log("allData.extra", allData.extra);
                var players = _.cloneDeep(allData.players);
                _.remove(allData.players, function (p) {
                    return (p.tableLeft && !p.isDealer && !p.isSmallBlind && !p.isBigBlind);
                });
                // console.log("allData.players ", allData.players);
                _.each(players, function (p) {
                    console.log("players  ", p.playerNo);
                    sails.sockets.broadcast(p.socketId, "newGame", {
                        data: allData
                    });
                    // sails.sockets.blast("newGame", {
                    //     data: allData
                    // });
                });

                _.each(allData.dealer, function (d) {
                    sails.sockets.broadcast(d.socketId, "newGame", {
                        data: allData
                    });
                });

                _.each(allData.admin, function (a) {
                    sails.sockets.broadcast(a.socketId, "newGame", {
                        data: allData
                    });
                });
            }
        }, false);
    },
    blastSocket: function (tableId, extraData, fromUndo) {
        console.log(tableId);
        console.log("inside blastSocket", extraData);
        Player.getAllDetails({
            tableId: tableId
        }, function (err, allData) {
            // if (!fromUndo) {
            //     GameLogs.create(function () {});
            // } else {
            //     allData.undo = true;
            // }
            // if (data && data.newGame) {
            //     allData.newGame = true;
            // }

            if (err) {
                console.log(err);
            } else {
                if (!_.isEmpty(extraData)) {
                    allData.extra = extraData;
                } else {
                    allData.extra = {};
                }
                console.log("allData.extra", allData.extra);

                _.each(allData.players, function (p) {
                    // if (!p.tableLeft) {
                    sails.sockets.broadcast(p.socketId, "Update", {
                        data: allData
                    });
                    //}
                });

                _.each(allData.dealer, function (d) {
                    sails.sockets.broadcast(d.socketId, "Update", {
                        data: allData
                    });
                });
                _.each(allData.admin, function (a) {
                    sails.sockets.broadcast(a.socketId, "Update", {
                        data: allData
                    });
                });
            }
        });
    },
    getPrvStatus: function (curStatus) {
        var status = [
            'beforeStart',
            'serve',
            'preFlop',
            'Flop',
            'Turn',
            'River',
            'winner'
        ];

        var index = _.findIndex(status, function (s) {
            return s == curStatus
        });

        if (index >= 0) {
            curStatus = status[index - 1];
        }

        return curStatus;

    },
    blastRemoveSocket: function (tableId, extraData) {
        Player.getAllDetails({
            tableId: tableId
        }, function (err, allData) {
            // if (!fromUndo) {
            //     GameLogs.create(function () {});
            // } else {
            //     allData.undo = true;
            // }
            // if (data && data.newGame) {
            //     allData.newGame = true;
            // }

            if (err) {
                console.log(err);
            } else {
                if (extraData) {
                    allData.extra = extraData;
                } else {
                    allData.extra = {};
                }
                console.log("remove Player", allData);
                sails.sockets.blast("removePlayer", {
                    data: allData
                });
                // sails.sockets.broadcast("room" + tableId, "Update", {
                //     data: allData
                // });
            }
        });
    },
    updateStatus: function (tableId, callback) {
        console.log("updateStatus ", tableId);
        var status = [
            'beforeStart',
            'serve',
            'preFlop',
            'Flop',
            'Turn',
            'River',
            'winner'
        ];
        Table.findOne({
            _id: tableId
        }).exec(function (err, data) {
            var index = _.findIndex(status, function (s) {
                return s == data.status
            });

            if (index >= 0) {
                if (status[index + 1] != "beforeStart" && status[index + 1] != "serve" && status[index + 1] != "preFlop") {
                    data.currentRoundAmt = [];
                }
                data.status = status[index + 1];
            }
            async.parallel([function (callback) {
                data.save(callback);
            }, function (callback) {
                if (status[index + 1] == "winner") {
                    Player.showWinner({
                        tableId: tableId
                    }, callback)
                } else {
                    callback(null);
                }
            }], callback);
        });
    },
    tableHistory: function (data, callback) {
        console.log(data);
        async.parallel({
            table: function (callback) {
                Table.findOne({
                    _id: data.tableId
                }).deepPopulate("history.potWinners.winnerPlayer.playerId").lean().exec(callback);
            },
            user: function (callback) {
                User.findOne({
                    accessToken: data.accessToken
                }).lean().exec(callback);
            }
        }, function (err, result) {
            if (err || _.isEmpty(result.table) || _.isEmpty(result.user)) {
                callback(err);
            } else {
                var messages = [];
                var games = _.filter(result.table.history, function (h) {
                    console.log(_.some(h.activePlayers, result.user._id));
                    return _.some(h.activePlayers, result.user._id);
                });

                _.each(games, function (g) {
                    var pots = [];

                    _.each(g.potWinners, function (w) {
                        console.log("games", w);
                        var message = '';
                        var cards = [];
                        _.each(w.winnerPlayer, function (p, index) {
                            if (index != 0) {
                                message += ', ';
                            }
                            if (p.playerId._id + "" == result.user._id) {
                                message += 'You '
                            } else {
                                message += p.playerId.name + ' ';
                            }


                            cards.push(p.winningCards);
                            console.log(cards);
                        });
                        message += 'won the ' + w.potName + ' worth ' + w.amount + '.';

                        pots.push({
                            message: message,
                            cards: cards
                        });

                    });
                    messages.push(pots);
                });
                console.log(_.reverse(messages));
                callback(null, messages);

            }
        });
    }

};
module.exports = _.assign(module.exports, exports, model);