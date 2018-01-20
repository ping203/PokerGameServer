var schema = new Schema({
    cardNo: {
        type: Number,
        required: true
    },
    isOpen: {
        type: Boolean,
        default: false,
        required: true
    },
    cardValue: {
        type: String,
        default: ""
    },
    isBurn: {
        type: Boolean,
        default: false
    },
    serve: {
        type: Boolean,
        default: false
    },
    table: {
        type: Schema.Types.ObjectId,
        ref: 'Table'
    }

});

schema.plugin(deepPopulate, {});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);

module.exports = mongoose.model('CommunityCards', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema));
var model = {
    createCards: function (callback) {
        var Model = this;
        var cardsNo = [1, 2, 3, 4, 5];
        _.each(cardsNo, function (value, key) {
            Model.saveData({
                cardNo: value
            }, function (err, data2) {
                if (err) {
                    if (value == 1) {
                        callback(err, data2);
                    }
                } else {}
            });
        });
        callback(null, "Cards Created");
    },
    findWinner: function (players, communityCards, callback) {
        var playerCardsNotPresent = _.findIndex(players, function (player) {
            return player.cards.length === 0;
        });
        if (playerCardsNotPresent >= 0) {
            callback("Cards not Distributed");
            return 0;
        }

        //Check All Community Cards are Distributed
        var communityCardsNoDistributed = _.findIndex(communityCards, function (commu) {
            return commu.cardValue === "";
        });
        if (communityCardsNoDistributed >= 0) {
            callback("Community Cards not Distributed");
            return 0;
        }

        _.each(players, function (player) {
            player.allCards = _.cloneDeep(player.cards);
            _.each(communityCards, function (commu) {
                player.allCards.push(commu.cardValue);
            });
            player.hand = Hand.solve(player.allCards);
            player.winName = player.hand.name;
            player.descr = player.hand.descr;
        });

        var rank = 1;
        var isAllComplete = false;
        while (!isAllComplete) {
            var remainingPlayers = _.filter(players, function (n) {
                n.hand = Hand.solve(n.allCards);
                return !(n.winRank);
            });
            if (remainingPlayers.length === 0) {
                isAllComplete = true;
            } else {
                var winners = Hand.winners(_.map(remainingPlayers, "hand"));
                _.each(players, function (player) {
                    var index = _.findIndex(winners, function (winner) {
                        return player.hand == winner;
                    });
                    if (index >= 0) {
                        if (rank == 1) {
                            player.winner = true;
                        }

                        player.winRank = rank;
                    }
                    player.hand = undefined;
                });
                rank++;
            }

        }
        _.each(players, function (player) {
            player.hand = undefined;
        });
        callback();
    },
    removeCards: function (data, callback) {
        CommunityCards.find().sort({
            cardNo: 1
        }).exec(function (err, allCards) {
            if (err) {
                callback(err);
            } else {
                var cards = _.filter(allCards, function (n, index) {
                    return (index >= data.cardIndex);
                });
                console.log(cards);
                async.concat(cards, function (card, callback) {
                    card.cardValue = "";
                    card.save(callback);
                }, function (err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(err, data);
                        Player.blastSocket();
                    }
                });
            }
        });
    },
    closeServe: function (tableId, callback) {
        var Model = this;
        Model.findOne({
            table: tableId
        }).sort({
            cardNo: 1
        }).exec(function (err, data) {
            data.serve = false;
            data.save(callback);
        });
    },
    checkServe: function (tableId, callback) {
        var Model = this;
        Model.findOne({
            table: tableId
        }).sort({
            cardNo: 1
        }).exec(callback);
    },
    startServe: function (tableId, callback) {
        var Model = this;
        Model.findOne({
            table: tableId
        }).sort({
            cardNo: 1
        }).exec(function (err, data) {
            data.serve = true;
            data.save(callback);
        });
    },
    createCron: function (interval, callback) {
        cron.schedule(interval, callback);
    },

    createTurnSchedule: function () {
        var insterval = '*/15 * * * * *';
        var tableId = 123;
        var callback = function (tableId) {
            console.log("tableId ", tableId);
            CommunityCards.checkServe(tableId, function (err, dataserve) {
                if (err) {
                    console.log(err);
                } else {
                    if (dataserve && dataserve.serve) {
                        Player.find({
                            table: tableId
                        }).sort({
                            updatedAt: -1
                        }).limit(1).exec(function (err, data) {
                            if (err) {
                                console.log(err);
                            } else {
                                //  if (moment(data.updatedAt).);
                            }
                        });
                    }
                }
            });
        }
        CommunityCards.createCron(insterval, callback);
    },
    setNewGameTimeOut: function (tableId) {
        console.log("newgame timer");
        setTimeout(function (tableId) {
            Player.newGame({
                tableId: tableId
            }, function(){});
        }, 30 * 1000, tableId);
    },
    setTimeOut: function (tableId, playerNo) {
        Table.findOne({
            _id: tableId
        }).exec(function (err, table) {
            console.log("table.timeoutTime ", table.timeoutTime);
            setTimeout(function (tableId, playerNo, timeout) {
                async.parallel({
                    player: function (callback) {
                        Player.findOne({
                            table: tableId,
                            playerNo: playerNo
                        }).exec(callback);
                    }
                    // table: function (callback) {
                    //     Table.findOne({
                    //         _id: tableId,
                    //     }).exec(callback)
                    // }
                }, function (err, data) {
                    if (err) {
                        console.log(err);
                    } else {

                        // if (data && data.player && !moment(data.player.updatedAt).isAfter(moment().subtract(timeout, 'seconds'))) {
                        //     Player.fold({
                        //         tableId: tableId,
                        //         accessToken: 'fromSystem'
                        //     }, function () {});
                        // }
                    }
                })
                // Player.findOne({
                //     table: tableId,
                //     isTurn: true
                // }).exec(function (err, data) {
                //     console.log("set timeout executed");
                //     if (err) {
                //         console.log(err);
                //     } else {

                //         if (data && data.playerNo == playerNo) {
                //             Player.fold({
                //                 tableId: tableId,
                //                 accessToken: 'fromSystem'
                //             }, function () {});
                //         }
                //     }
                // });
                //console.log(str1 + " " + str2);
            }, table.timeoutTime * 1000, tableId, playerNo, table.timeoutTime);
        });

    }

};
module.exports = _.assign(module.exports, exports, model);