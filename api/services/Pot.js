var schema = new Schema({
    table: {
        type: Schema.Types.ObjectId,
        ref: 'Table'
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    players: [{
        playerNo: {
            type: Number,
            ref: 'Player'
        },
        amount: {
            type: Number,
            default: 0
        },
        round: String
    }],
    type: {
        type: String,
        enum: ['main', 'side']
    },
    winner: {
        type: Schema.Types.ObjectId,
        ref: 'Player'
    }
});

schema.plugin(deepPopulate, {});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Pot', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema));
var model = {
    createPot: function (data, callback) {
        var Model = this;
        Model.saveData(data, callback);
    },
    getMainPot: function (tableId, callback) {
        Pot.findOne({
            table: tableId,
            type: 'main'
        }).exec(callback);
    },
    //type, tableId, playerNo, amount, round, 
    AddToMainPort: function (data, currentPlayer, callback) {
        async.waterfall([function (callback) {
            Pot.getMainPot(data.tableId, callback);
        }, function (potData, callback) {
            data.potId = potData._id;
            Pot.makeEntryAddAmount(data, currentPlayer, callback);
        }], callback);
    },
    solveInfo: function (allData, callback) {
        var finalData = {};
        var tableInfo = allData.table;
        var PlayersInfo = allData.players;
        var potsInfo = allData.pots;

        //current Player
        var currentPlayer = _.find(PlayersInfo, function (p) {
            return p.isTurn;
        });
        console.log("currentPlayer", currentPlayer.playerNo);
        console.log("potsInfo length", potsInfo.length);
        //round of table 
        var status = tableInfo.status;

        //get call amount
        var callAmount = 0;
        var paidAmt = 0;
        // var betMoney = _.(potsInfo.players[]);
        _.each(potsInfo, function (pot) {
            var potMaxLimit = 0;
            var paidAmtPerPot = 0;
            potMaxLimit = _.max(_.map(pot.players, function (p) {
                if (p.round == status) {
                    return p.amount;
                }
            }));
            console.log("potMaxLimit", potMaxLimit);
            //finding current player to abstract amount already paid
            var playerAmt = _.find(pot.players, function (p) {
                return (currentPlayer.playerNo == p.playerNo && p.round == status);
            });

            if (playerAmt) {
                paidAmt += playerAmt.amount;
                paidAmtPerPot = playerAmt.amount;
            }
            console.log("paidAmtPerPot", paidAmtPerPot);
            pot.payableAmt = potMaxLimit - paidAmtPerPot; // deduct already paid amount
            console.log("payableAmt", pot.payableAmt);
            pot.potMaxLimit = potMaxLimit;
            callAmount += potMaxLimit;

        });

        callAmount = callAmount - paidAmt;

        console.log("callAmount", callAmount);
        //get AllIn amount 
        var playerBalances = _.map(PlayersInfo, 'user.balance');
        playerBalances.sort(function (a, b) {
            return b - a
        });
        console.log("playerBalances", playerBalances);
        if (playerBalances[1] < currentPlayer.user.balance) {
            var allInAmount = playerBalances[1];
        } else {
            var allInAmount = currentPlayer.user.balance;
        }
        
        console.log("allInAmount", allInAmount);
        //return data
        finalData.tableStatus = status;
        finalData.currentPlayer = currentPlayer;
        finalData.callAmount = callAmount;
        finalData.allInAmount = allInAmount;
        finalData.potsInfo = potsInfo;
        callback(null, finalData);
    },
    //amountTobeAdded
    addAmtToPot: function (data, callback) {
        var pots = data.potsInfo;
        var amountTobeAdded = data.amountTobeAdded;
        console.log("amountTobeAdded", amountTobeAdded);
        async.eachOfSeries(pots, function (item, key, callback) {
            var player = {};
            var deductAmt = 0;
            var payAmt = item.payableAmt;
            console.log("payAmt", payAmt);
            // player = _.find(item.players, function (p) {
            //     return data.currentPlayer.playerNo = p.playerNo && p.round == data.tableStatus;
            // });

            // if (player) {
            //     deductAmt = player.amount;
            // }

            // payAmt = item.potMaxLimit - deductAmt; //substract already paid amount
            if (payAmt > amountTobeAdded) {
                Pot.splitPot(item, data.tableInfo, data.currentPlayer, amountTobeAdded, callback);
            } else {
                if (key == (pots.length - 1)) {
                    payAmt = amountTobeAdded; //add all the remaining money
                }

                amountTobeAdded = amountTobeAdded - payAmt;

                

                var sendData = {};
                sendData.amount = payAmt;
                sendData.round = data.tableStatus;
                sendData.potId = item._id;
                sendData.playerNo = data.currentPlayer.playerNo;
                Pot.makeEntryAddAmount(sendData, data.currentPlayer, callback);
            }
        }, callback);
    },
    splitPot: function (pot, table, currentPlayer, amount, callback) {
        var potData = {};
        potData.type = "side";
        potData.table = pot.table;
        Pot.createPot(potData, function (err, newPot) {
            if (data) {
              var playerIndex  = _.findIndex(pot.players, function (p) {
                    return (p.playerNo == currentPlayer.playerNo && p.round == table.status)
                });

                if(playerIndex < 0){
                    pot.players.push({
                        playerNo : currentPlayer.playerNo,
                        amount : 0,
                        round : table.status
                    });
                }

                async.eachOfSeries(pot.players, function (item, key, callback) {
                    if (item.round != table.status) {
                        callback();
                    } else {
                        if (item.amount > amount) {
                            var finalAmount = item.amount - amount;
                            async.parallel([
                                function (callback) {
                                    //remove Extra amount
                                    var sendData = {};
                                    sendData.playerNo = item.playerNo;
                                    sendData.amount = finalAmount;
                                    sendData.round = item.round;
                                    pot.potId = pot._id;
                                    pot.makeEntryRemoveAmount(sendData, currentPlayer, callback);
                                },
                                function (callback) {
                                    // add remained amount to new pot
                                    var sendData = {};
                                    sendData.playerNo = item.playerNo;
                                    sendData.amount = finalAmount;
                                    sendData.round = item.round;
                                    pot.potId = newPot._id;
                                    pot.makeEntryAddAmount(sendData, currentPlayer, callback);
                                }
                            ], callback)

                        }
                    }
                });
            }
        });
    },
    solvePot: function (data, action, callback) {
        var tableId = data.table;
        var playerNo = data.playerNo;
      //  var action = data.action;
        async.waterfall([
            function (callback) {
                Player.getAllInfo(tableId, callback);
            },
            Pot.solveInfo
        ], function (err, data) {
            switch (action) {
                case 'call':
                data.amountTobeAdded =   data.callAmount;   
                break;
                case 'allIn':
                data.amountTobeAdded  =  data.allInAmount;
                break;
                default:
                break;
            }
            Pot.addAmtToPot(data, callback);             

        });
        //  Player.getAllInfo(data.table,function(err, allData){
        //        Pot.solveInfo();             
        //  });  
    },
    //params: playerNo, amount, round, PotId
    makeEntryAddAmount: function (data, currentPlayer, callback) {
        console.log(data);
        Pot.findOne({
            _id: data.potId
        }).exec(function (err, Pot) {
            if (err) {
                callback(err);
                return 0;
            }
            var playerIndex = _.findIndex(Pot.players, function (p) {
                return (p.playerNo == data.playerNo);
            });
            if (playerIndex >= 0) {
                Pot.players[playerIndex].amount = parseInt(Pot.players[playerIndex].amount) + parseInt(data.amount);
                Pot.players[playerIndex].round = data.round;
                Pot.totalAmount = parseInt(Pot.totalAmount) + parseInt(data.amount);
            } else {
                var player = {};
                player.amount = data.amount;
                player.round = data.round;
                player.playerNo = data.playerNo;
                Pot.players.push(player);
                // console.log("...........player",player);
                Pot.totalAmount = parseInt(Pot.totalAmount) + parseInt(data.amount);
            }
            async.parallel([function (callback) {
                Pot.save(callback);
            }, function (callback) {
                currentPlayer.totalAmount += parseInt(data.amount);
                currentPlayer.save(callback);
            }], callback)
        });
    },
    makeEntryRemoveAmount: function (data, currentPlayer, callback) {
        Pot.findOne({
            _id: data.potId
        }).exec(function (err, Pot) {
            if (err) {
                callback(err);
                return 0;
            }
            var playerIndex = _.findIndex(Pot.players, function (p) {
                return (p.playerNo == data.playerNo);
            });
            if (playerIndex >= 0) {
                Pot.players[playerIndex].amount = parseInt(Pot.players[playerIndex].amount) - parseInt(data.amount);
                Pot.players[playerIndex].round = data.round;
                Pot.totalAmount = parseInt(Pot.totalAmount) + parseInt(data.amount);
            } else {
                var player = {};
                player.amount = data.amount;
                player.round = data.round;
                player.playerNo = data.playerNo;
                Pot.players.push(player);
                // console.log("...........player",player);
                Pot.totalAmount = parseInt(Pot.totalAmount) - parseInt(data.amount);
            }
            async.parallel([function (callback) {
                Pot.save(callback);
            }, function (callback) {
                currentPlayer.totalAmount -= parseInt(data.amount);
                currentPlayer.save(callback);
            }], callback)
        });
    }
};
module.exports = _.assign(module.exports, exports, model);