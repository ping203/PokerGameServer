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
        },
        amount: {
            type: Number,
            default: 0
        }
    }],
    type: {
        type: String,
        enum: ['main', 'side']
    },
    winner: {
        type: Schema.Types.Mixed,
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
    addCurrentRoundAmt: function(data, callback){
           Table.findOne(
            {
                _id: data.tableId
            }).exec(function(err, table){
                if(table.currentRoundAmt){
                   var player = _.findIndex(table.currentRoundAmt, function(c){
                         return  data.playerNo == c.playerNo
                    });
                    if(player >= 0){
                        table.currentRoundAmt[player]["amount"] += data.amount;
                    } else{
                        table.currentRoundAmt.push(data);
                    }
                } else{
                    table.currentRoundAmt = [data]; 
                }
                table.save(function(err, data){
                       console.log(err);
                       callback(err, data);
                });
            });
    },
    declareWinner: function (allData, callback) {
        async.concat(allData.pots, function (p, callback) {
            var players = _.uniqBy(p.players, "playerNo");
            console.log("players", players);
            var playerNos = _.map(players, "playerNo");
            console.log("playerNos ", playerNos);
            // remove players not in pot and fold
            var playerData = _.filter(allData.players, function (p) {
                console.log("p.playerNo", p.playerNo, _.indexOf(playerNos, p.playerNo));
                if (_.indexOf(playerNos, p.playerNo) == -1) {
                    return false;
                } else {
                    return true;
                };
            });
            console.log("playerData ", playerData);
            var potPlayers = _.cloneDeep(playerData);
            CommunityCards.findWinner(potPlayers, allData.communityCards, function (err, finalVal) {
                if (err) {
                    callback(err);
                } else {
                    console.log(potPlayers);
                    p.winner = potPlayers;
                    p.save(callback);
                    // Player.blastSocketWinner({
                    //     winners: data.players,
                    //     communityCards: data.communityCards
                    // });
                    // callback(null, {
                    //     winners: data.players,
                    //     communityCards: data.communityCards
                    // });
                }
            });
        }, function (err, data) {
            if (err) {
                callback(err);
            } else {
                console.log("concat data", data);
                allData.pots = data;
                Transaction.makePotTransaction(allData, callback);
            }
        });
    },
    //type, tableId, playerNo, amount, round, 
    AddToMainPort: function (data, currentPlayer, callback) {
        async.waterfall([function (callback) {
            Pot.getMainPot(data.tableId, callback);
        }, function (potData, callback) {
            data.potId = potData._id;
            Pot.makeEntryAddAmount(data, currentPlayer, function(err){
                callback(err)
            });
        }, function(callback){
           Pot.addCurrentRoundAmt(data, callback);
        }], callback);
    },
    getAmountForPlayer: function (potsInfo, playerNo, round) {
        var paidAmt = 0;
        console.log("potsInfo", potsInfo);
        console.log("playerNo", playerNo);
        console.log("round", round);
        _.each(potsInfo, function (pot) {
            var playerAmt = _.find(pot.players, function (p) {
                return (playerNo == p.playerNo);
            });

            console.log("getAmountForPlayer playerAmt", playerAmt);

            if (playerAmt) {
                paidAmt += playerAmt.amount;
            }
        });
        console.log("paidAmt", paidAmt);
        return paidAmt;
    },
    equalAmountStatus: function (allData, callback) {
        var amountStatus = false;
        var playerAmount = [];
        var allInPlayerAmount = [];
        var amountRemaining = false;
        var round = allData.table['status'];
        var activePlayers = _.filter(allData.players, function (p) {
            return !p.isAllIn && p.isActive && !p.isFold
        });

        var allInPlayer = _.filter(allData.players, function (p) {
            return p.isAllIn && !p.isFold && p.isActive
        });

        allInPlayerAmount = _.map(allInPlayer, "totalAmount");
        // _.each(allInPlayer, function (p) {
        //     allInPlayerAmount.push(Pot.getAmountForPlayer(allData.pots, p.playerNo, round));
        // });


        console.log("allInPlayerAmount", allInPlayerAmount);
        console.log("activePlayers", activePlayers);
        console.log("allData.pots", allData.pots);

        playerAmount = _.map(activePlayers, "totalAmount");
        // _.each(activePlayers, function (p) {
        //     playerAmount.push(Pot.getAmountForPlayer(allData.pots, p.playerNo, round));
        // });

        console.log("playerAmount", playerAmount);
        //all have equal amounts and none of them has sone AllIn
        if (_.uniq(playerAmount).length == 1 && allInPlayerAmount.length == 0) {
            amountStatus = true;
            //    return amountStatus;
        }
        //all players have done AllIn
        if (activePlayers.length == 0) {
            amountStatus = true;
        }

        if (allInPlayerAmount.length > 0) {
            _.each(allInPlayerAmount, function (amount) {

                _.each(playerAmount, function (pa) {
                    if (pa < amount) {
                        amountRemaining = true;
                        return false;
                    }
                });
                if (amountRemaining == true) {
                    return false;
                }
            });
        }

        //when allin amount is larger than paid amount 
        if (!amountRemaining && _.uniq(playerAmount).length == 1) {
            amountStatus = true;
        }

        return amountStatus;

    },
    solveInfo: function (allData, callback) {
        var finalData = {};
        var tableInfo = allData.table;
        //var PlayersInfo = allData.players;
        var potsInfo = allData.pots;
        console.log(allData);
        //current Player
        var PlayersInfo = _.each(allData.players, function (p) {
            return p.isActive && !p.isFold
        });

        var currentPlayer = _.find(allData.players, function (p) {
            return p.isTurn;
        });

        if (!currentPlayer) {
            callback("No one has turn");
            return 0;
        }
        // console.log("currentPlayer", currentPlayer);
        // console.log("potsInfo length", potsInfo.length);
        //round of table 
        var status = tableInfo.status;

        //get call amount
        var callAmount = 0;
        var paidAmt = 0;
        var currentPlayerBalance = 0;
        // var betMoney = _.(potsInfo.players[]);
        _.each(potsInfo, function (pot) {
            var potMaxLimit = 0;
            var paidAmtPerPot = 0;

            //get maximum amount for particular round
            // potMaxLimit = _.max(_.map(pot.players, function (p) {
            //     if (p.round == status) {
            //         return p.amount;
            //     }
            // }));

            potMaxLimitObj = _.maxBy(pot.players, "amount");


            console.log("potMaxLimit1", potMaxLimit);
            // for new round take maximum amount from previous round
            if (!potMaxLimitObj) {
                // var prvstatus = Table.getPrvStatus(status);
                // potMaxLimit = _.max(_.map(pot.players, function (p) {
                //     if (p.round == prvstatus) {
                //         return p.amount;
                //     }
                // }));
                potMaxLimit = 0;
            } else {
                potMaxLimit = potMaxLimitObj.amount;
            }

            //  console.log("potMaxLimit2", potMaxLimit);
            //finding current player to abstract amount already paid
            var playerAmt = _.find(pot.players, function (p) {
                return (currentPlayer.playerNo == p.playerNo);
            });

            if (playerAmt) {
                paidAmt += playerAmt.amount;
                paidAmtPerPot = playerAmt.amount;
            }

            console.log("paidAmtPerPot", paidAmtPerPot);
            pot.payableAmt = potMaxLimit - paidAmtPerPot; // deduct already paid amount
            console.log("payableAmt", pot.payableAmt);
            pot.potMaxLimit = potMaxLimit;
            pot.paidAmtPerPot = paidAmtPerPot;
            callAmount += potMaxLimit;

        });

        console.log(" before callAmount", callAmount);
        console.log(" paidAmt", paidAmt);
        callAmount = callAmount - paidAmt; // deduct already paid amount

        //getPrvStatus

        console.log("callAmount", callAmount);
        //get AllIn amount 

        //remaining balance of players with  added amount in that round
        // var playerBalances = _.map(PlayersInfo, function (p) {
        //     var paidPerRound = 0;

        //     paidPerRound = Pot.getAmountForPlayer(potsInfo, p.playerNo, status);

        //     console.log("paidPerRound playerNo ", paidPerRound);
        //     if (p.playerNo == currentPlayer.playerNo) {
        //         currentPlayerBalance = p.buyInAmt - p.totalAmount;
        //     }

        //     //getAmountForPlayer

        //     // if (playerRound) {
        //     //     paidPerRound = playerRound.amount
        //     // }
        //     return p.buyInAmt - p.totalAmount + paidPerRound;
        // });
        // //var secondHighPlAmt =  playerBalances[1]
        // playerBalances.sort(function (a, b) {
        //     return b - a
        // });

        // // console.log("currentPlayerBalance", currentPlayerBalance);

        // //getAmountForPlayer
        // //remaining balance
        // //var currentPlayerBalance = currentPlayer.BuyIn - currentPlayer.totalAmount + ;   
        // //var currentPlayerBalance = currentPlayer.BuyIn - currentPlayer.totalAmount + ;   
        // //var currentPlayerBalance = currentPlayer.BuyIn - currentPlayer.totalAmount + ;
        // console.log("currentPlayerBalance", currentPlayerBalance);
        // console.log("playerBalances", playerBalances);
        // if (playerBalances[1] < currentPlayerBalance) {
        //     var allInAmount = playerBalances[1];
        //     allInAmount -= paidAmt;
        // } else {
        //     var allInAmount = currentPlayerBalance;
        // }
        // var remainingBalances = _.map(PlayersInfo, function(p){
        //       return p.buyInAmt - p.totalAmount;
        // });

        // currentPlayerBalance = currentPlayer.buyInAmt - currentPlayer.totalAmount;
        var buyInAmts = _.map(PlayersInfo, "buyInAmt");
        buyInAmts.sort(function (a, b) {
            return b - a
        });
        var allInAmount = 0;

        if (buyInAmts[1] < currentPlayer.buyInAmt) {
            allInAmount = buyInAmts[1] - currentPlayer.totalAmount;
        } else {
            allInAmount = currentPlayer.buyInAmt - currentPlayer.totalAmount;
        }

        //allInAmount = allInAmount - ;
        console.log("allInAmount", allInAmount);

        //return data
        allData.tableStatus = status;
        allData.currentPlayer = currentPlayer;
        allData.callAmount = callAmount;
        allData.allInAmount = allInAmount;
        //finalData.potsInfo = potsInfo;

        callback(null, allData);
    },
    //amountTobeAdded
    addAmtToPot: function (data, callback) {
        var pots = data.pots;
        var amountTobeAdded = data.amountTobeAdded;
        console.log("amountTobeAdded", amountTobeAdded);
        async.eachOfSeries(pots, function (item, key, callback) {
            var player = {};
            var deductAmt = 0;
            var payAmt = item.payableAmt;
            console.log("payableAmt ", item, key);
            ///////////////////////////////////
            // handle if someone has done allIn before with lesser amount
            //   amountTobeAdded = amountTobeAdded - payAmt;
            var allInPlayerAmt = [];
            var players = [];
            var paidAllInAmt = 0;
            var minAllInAmt = 0;
            var allInPlayer = _.filter(data.players, function (p) {
                return p.isActive && !p.isFold && p.isAllIn && p.playerNo != data.currentPlayer.playerNo
            });
            console.log("allInPlayer...........", allInPlayer);
            _.each(allInPlayer, function (ap) {
                paidAllInAmt = 0;
                players = _.filter(item.players, function (p) {
                    return (p.playerNo == ap.playerNo);
                });

                paidAllInAmt = _.sumBy(players, 'amount');
                allInPlayerAmt.push(paidAllInAmt)
            });

            var minAllInAmt = _.min(allInPlayerAmt);

            console.log("minAllInAmt...........", minAllInAmt);
            // if(minAllInAmt && minAllInAmt < payAmt ){

            // } else {
            ////////
            // }




            /////////////////////////////////
            //add all the remaining money if is greater than payable money

            if (key == (pots.length - 1) && amountTobeAdded > payAmt) {
                console.log("(pots.length - 1) ", (pots.length - 1), "key ", key);
                payAmt = amountTobeAdded;
            }

            if (amountTobeAdded == 0 || payAmt == 0) {
                callback(null);
            } else {
                // player = _.find(item.players, function (p) {
                //     return data.currentPlayer.playerNo = p.playerNo && p.round == data.tableStatus;
                // });

                // if (player) {
                //     deductAmt = player.amount;
                // }
                // payAmt = item.potMaxLimit - deductAmt; //substract already paid amount
                //case 1 , when amount to be added is less than pot max limit
                if (payAmt > amountTobeAdded) {
                    console.log("case 1 , when amount to be added is less than pot max limit");
                    console.log("splitPot");
                    var splitPotAmount = amountTobeAdded + item.paidAmtPerPot;
                    console.log("splitPotAmount", splitPotAmount);
                    Pot.splitPot(item, data.tableStatus, data.currentPlayer, splitPotAmount, function (err, data1) {
                        var sendData = {
                            playerNo: data.currentPlayer.playerNo,
                            amount: amountTobeAdded,
                            round: data.tableStatus,
                            potId: item._id
                        }
                        //add remaing money to existing pot
                        Pot.makeEntryAddAmount(sendData, data.currentPlayer, callback);
                        amountTobeAdded = 0;
                    });
                } else if (minAllInAmt && minAllInAmt < payAmt) {
                    console.log("case 2 when amount to be addded is greater than allIn added amount  ");
                    //case 2 when amount to be addded is greater than allIn added amount  
                    var splitPotAmount = minAllInAmt;
                    var AddToExistsPot = minAllInAmt - item.paidAmtPerPot;
                    amountTobeAdded = amountTobeAdded - minAllInAmt + item.paidAmtPerPot;
                    Pot.splitPot(item, data.tableStatus, data.currentPlayer, splitPotAmount, function (err, newPot) {
                        if (err) {
                            callback(err);
                        } else {

                            async.waterfall([function (callback) {
                                var sendData = {
                                    playerNo: data.currentPlayer.playerNo,
                                    amount: amountTobeAdded,
                                    round: data.tableStatus,
                                    potId: newPot._id
                                }
                                Pot.makeEntryAddAmount(sendData, data.currentPlayer, function () {
                                    callback(err);
                                });
                            }, function (callback) {
                                var sendData = {
                                    playerNo: data.currentPlayer.playerNo,
                                    amount: AddToExistsPot,
                                    round: data.tableStatus,
                                    potId: item._id
                                }
                                Pot.makeEntryAddAmount(sendData, data.currentPlayer, callback);
                            }], callback);

                        }
                    });

                } else {
                    //case 3 when amount to be added is equal to max pot limit
                    console.log("case 3 when amount to be added is equal to max pot limit");
                    amountTobeAdded = amountTobeAdded - payAmt;
                    var sendData = {};
                    sendData.amount = payAmt;
                    sendData.round = data.tableStatus;
                    sendData.potId = item._id;
                    sendData.playerNo = data.currentPlayer.playerNo;
                    Pot.makeEntryAddAmount(sendData, data.currentPlayer, callback);
                }
            }
        }, callback);
    },
    splitPot: function (pot, tableStatus, currentPlayer, amount, callback) {
        var potData = {};
        potData.type = "side";
        potData.table = pot.table;
        console.log("inside splitPot");
        Pot.createPot(potData, function (err, newPot) {
            if (newPot) {
                var playerIndex = _.findIndex(pot.players, function (p) {
                    return (p.playerNo == currentPlayer.playerNo)
                });

                // if (playerIndex < 0) {
                //     pot.players.push({
                //         playerNo: currentPlayer.playerNo,
                //         amount: amount,
                //         round: tableStatus
                //     });
                // }
                async.eachOfSeries(pot.players, function (item, key, callback) {
                    console.log(item);
                    // if (item.round != tableStatus) {
                    //     console.log("inside condition");
                    //     callback(null);
                    // } else {
                    if (item.amount > amount) {
                        var finalAmount = item.amount - amount;
                        console.log("item.amount", item.amount);
                        console.log("amount", amount);
                        console.log("finalAmount", finalAmount);
                        async.parallel([
                            function (callback) {
                                //remove Extra amount
                                var sendData = {};
                                sendData.playerNo = item.playerNo;
                                sendData.amount = finalAmount;
                                // sendData.round = item.round;
                                sendData.potId = pot._id;
                                Pot.makeEntryRemoveAmount(sendData, currentPlayer, callback);
                            },
                            function (callback) {
                                // add remaining amount to new pot
                                var sendData = {};
                                sendData.playerNo = item.playerNo;
                                sendData.amount = finalAmount;
                                //sendData.round = item.round;
                                sendData.potId = newPot._id;
                                Pot.makeEntryAddAmount(sendData, currentPlayer, callback);
                            }
                        ], callback);

                    } else {
                        callback(null);
                    }
                    // }
                }, function (err, data) {
                    callback(err, newPot);
                });
            }
        });
    },
    solvePot: function (data, action, amount, callback) {
        var tableId = data.table;
        var playerNo = data.playerNo;

        //  var action = data.action;
        async.waterfall([
            function (callback) {
                Player.getAllInfo(tableId, callback);
            },
            Pot.solveInfo
        ], function (err, data) {
            if (err) {
                callback(err);
                return 0;
            }
            switch (action) {
                case 'call':
                    data.amountTobeAdded = data.callAmount;
                    break;
                case 'allIn':
                    data.amountTobeAdded = data.allInAmount;
                    break;
                case 'raise':
                    amount = parseInt(amount);
                    data.amountTobeAdded = amount;
                    if (amount > data.allInAmount) {
                        data.amountTobeAdded = data.allInAmount;
                    }
                    break;
                default:
                    break;
            }
            Pot.addAmtToPot(data, function (err, returnData) {
                if (err) {
                    callback(err);
                } else {
                    Pot.addCurrentRoundAmt( {tableId:tableId, playerNo: playerNo, amount:data.amountTobeAdded},
                        function (err, tableData) {
                            callback(err, {
                                action: action,
                                amount: data.amountTobeAdded,
                                playerNo: playerNo
                            });
                        }
                    );

                }

            });

        });
        //  Player.getAllInfo(data.table,function(err, allData){
        //        Pot.solveInfo();             
        //  });  
    },
    //params: playerNo, amount, round, PotId
    makeEntryAddAmount: function (data, currentPlayer, callback) {
        // console.log(data);
        console.log("makeEntryAddAmount");
        playerIndex = -1;
        Pot.findOne({
            _id: data.potId
        }).exec(function (err, Pot) {
            if (err) {
                callback(err);
                return 0;
            }
            if (Pot.players) {
                var playerIndex = _.findIndex(Pot.players, function (p) {
                    return (p.playerNo == data.playerNo);
                });
            }
            if (playerIndex >= 0) {
                Pot.players[playerIndex].amount = parseInt(Pot.players[playerIndex].amount) + parseInt(data.amount);
                //Pot.players[playerIndex].round = data.round;
                Pot.totalAmount = parseInt(Pot.totalAmount) + parseInt(data.amount);
            } else {
                var player = {};
                player.amount = data.amount;
                // player.round = data.round;
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
        console.log("makeEntryRemoveAmount");
        playerIndex = -1;
        Pot.findOne({
            _id: data.potId
        }).exec(function (err, Pot) {
            if (err) {
                callback(err);
                return 0;
            }
            if (Pot.players) {
                var playerIndex = _.findIndex(Pot.players, function (p) {
                    return (p.playerNo == data.playerNo);
                });
            }
            if (playerIndex >= 0) {
                Pot.players[playerIndex].amount = parseInt(Pot.players[playerIndex].amount) - parseInt(data.amount);
                // Pot.players[playerIndex].round = data.round;
                Pot.totalAmount = parseInt(Pot.totalAmount) - parseInt(data.amount);
            } else {
                var player = {};
                player.amount = data.amount;
                // player.round = data.round;
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
            }], callback);
        });
    }
};
module.exports = _.assign(module.exports, exports, model);