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
        user: {
            type: Schema.Types.ObjectId,
            ref: 'user',
        },
        socketId: {
            type: String,
        }
    }]
});

schema.plugin(deepPopulate, {});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Table', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema));
var model = {
    getAllTable: function (data, callback) {
        this.find({}).exec(function (err, data) {
            callback(err, data);
        });
    },
    connectSocket: function (table, socketId, user, player, callback) {
        if (table.activePlayer) {
            table.activePlayer.push({
                user: user._id,
                socketId: socketId
            });
        } else {
            table.activePlayer = [{
                user: user._id,
                socketId: socketId
            }];
        }
        async.parallel([
            function (callback) {
                console.log(table._id);
                console.log(table._id + "");
                sails.sockets.join(socketId, 'room'+ table._id , callback);
            },
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
                Table.blastSocket(table._id);
                callback(err,player);
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
            }
        }, function (err, result) {

            if (!_.isEmpty(result.user)) {
                var user = result.user;
                var table = result.table;

                //check for max players
                if (table.activePlayer && table.activePlayer.length == table.maximumNoOfPlayers) {
                    callback("Room Not Available");
                    return 0;
                }

                if (!data.playerNo && parseInt(data.amount) == NaN) {
                    callback("Invalid data");
                }

                var playerIndex = _.findIndex(table.activePlayer, function (p) {
                    return p + "" == user._id;
                });

                //already exists
                if (playerIndex >= 0) {
                    callback("Player Already Added");
                    return 0;
                }

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
                player.user = user._id;
                player.table = data.tableId;
                player.playerNo = data.playerNo;
                player.buyInAmt = data.amount;
                Player.saveData(player, function (err, player) {
                    if (err) {
                        callback(err);
                    } else {
                        if (player && player.playerNo == 1) {
                            //configuring things for rooms befor starting a game. 
                            // console.log("inside");
                            // sails.sockets.join('Update', data.tableId);
                            // sails.sockets.join('ShowWinner', data.tableId);
                            async.each([1, 2, 3, 4, 5], function (cardNo, callback) {
                                var comData = {};
                                comData.cardNo = cardNo;
                                comData.table = data.tableId;
                                CommunityCards.saveData(comData, callback);

                            }, function (err, data1) {
                                Table.connectSocket(table, data.socketId, user, player, callback);
                            });
                        } else {
                            Table.connectSocket(table, data.socketId, user, player, callback);
                        }
                    }
                });
                //  });
            } else {
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
    
    blastSocket: function (tableId, fromUndo) {
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
                // if (data) {
                //     allData.extra = data;
                // } else {
                //     allData.extra = {};
                // }
                
                sails.sockets.broadcast("room" + tableId, "Update", allData);             
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
    updateStatus: function (tableId, callback) {
        var status = [
            'beforeStart',
            'serve',
            'preFlop',
            'Flop',
            'Turn',
            'River',
            'winner'
        ]
        Table.findOne({
            _id: tableId
        }).exec(function (err, data) {
            var index = _.findIndex(status, function (s) {
                return s == data.status
            });

            if (index >= 0) {
                data.status = status[index + 1];
            }

            data.save(callback);

        });
    }

};
module.exports = _.assign(module.exports, exports, model);