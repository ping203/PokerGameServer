var schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    transType: {
        type: String,
        enum: ["diposit", "withdraw", "tableLost", "tableWon"]
    },
    amount: Number,
    status: {
        type: String,
        enum: ["Sent", "Processing", "Completed"]
    },
    transactionId: String,
    transactionLog: Schema.Types.Mixed,
    Voucher: String,
    balance: {
        type: Number,
        default: 0
    }
});

schema.plugin(deepPopulate, {
    populate: {
        'userId': {
            select: 'name'
        }
    }
});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Transaction', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema, "userId", "userId"));
var model = {
    generateRefundExcel: function (data, res) {
        var Model = this;
        //    var pipeLine = [{
        //        $match :{
        //         {transType: "withdraw"}
        //        },
        //        $project: {
        //            amount:1,
        //            status:1,
        //            User:"$UserId.name"
        //        }
        //    }];
        Model.find({
            transType: "withdraw"
        }, {
            "userId": 1,
            _id: 0,
            amount: 1,
            status: 1
        }).deepPopulate("userId").lean().exec(function (err, data) {
            // console.log("data", data);
            if (err) {
                callback(err);
            } else {
                _.each(data, function (doc) {
                    doc['User'] = doc['userId']['name'];
                    delete doc['userId']
                });
                Config.generateExcel('Refund', data, res);
            }
        });
    },
    getDetails: function (data, callback) {
        var Model = this;
        var pagination = 20;
        var page = 0;
        if (data.page) {
            page = data.page
        }
        console.log(data);
        var skipRecords = page * pagination;
        User.findOne({
            accessToken: data.accessToken
        }).exec(function (err, data) {
            if (err) {
                callback(err);
            } else {
                if (!_.isEmpty(data)) {

                    var options = {


                        start: page * pagination,
                        count: pagination
                    };

                    Model.find({
                        userId: data._id
                    }).sort({
                        _id: -1
                    }).page(options, callback);
                    // Model.find({
                    //             userId: data._id
                    //         }
                    //         // {
                    //         //     _id: 0,
                    //         //     transType: 1,
                    //         //     amount: 1,
                    //         //     status: 1,
                    //         // }
                    //     ).sort({
                    //         _id: -1
                    //     })
                    //     // .skip(skipRecords)
                    //     // .limit(pagination)
                    //     .exec(function (err, data) {
                    //         if (err) {
                    //             callback(err);
                    //         } else {

                    //             callback(err, data);
                    //         }
                    //     });
                } else {
                    callback("Please login first.");
                }
            }
        });
    },

    buyCoins: function (coinData, callback) {
        //console.log();
        var transData = {};
        //transData.transStatus = "Completed";
        transData.transType = 'diposit';
        console.log("coinData", coinData);
        //  transData.amount = coinData.coins;
        var transAmt = parseInt(coinData.coins);
        // var transAmt;
        var accessToken = coinData.accessToken;
        if (transAmt == NaN) {
            callback("Enter Valid Amount");
        }
        User.findOne({
            accessToken: accessToken
        }).exec((err, data) => {

            if (!_.isEmpty(data)) {

                var finalAmount = parseInt(data.balance) + parseInt(transAmt);
                //save the transaction
                transData.userId = data._id
                transData.amount = transAmt;
                transData.balance = finalAmount;
                //change the balance
                data.balance = finalAmount;
                async.parallel([(callback) => {
                    Transaction.saveData(transData, callback);
                }, function (callback) {
                    data.save(callback);
                }], function (err, result) {
                    if (err) {
                        console.log(err);
                        callback(err);
                    } else {
                        callback(err, "Transaction Saved Successfully")
                    }
                });
            } else {
                callback("You need to login first.");
            }
        });
    },
    withdrawCoins: function (coinData, callback) {
        var transData = {};
        transData.transType = 'withdraw';
        var transAmt = parseInt(coinData.coins);
        var accessToken = coinData.accessToken;
        if (transAmt == NaN) {
            callback("Enter Valid Amount");
        }
        User.findOne({
            accessToken: accessToken
        }).exec(function (err, data) {

            if (!_.isEmpty(data)) {

                var finalAmount = parseInt(data.balance) - parseInt(transAmt);
                //save transaction                
                transData.userId = data._id;
                transData.amount = transAmt;
                transData.balance = finalAmount;
                transData.status = 'Sent';
                //change balance of user
                data.balance = finalAmount;
                async.parallel([function (callback) {
                    Transaction.saveData(transData, callback);
                }, 
                // function (callback) {
                //     data.save(callback);
                // }
            ], function (err, result) {
                    if (err) {
                        console.log(err);
                        callback(err);
                    } else {
                        callback(err, "Transaction Saved Successfully")
                    }
                });
            } else {
                callback("You need to login first.");
            }
        });
    },
    changeStatus: function (transData, callback) {

    },
    makePotTransaction: function (allData, callback) {
        async.each(allData.players,

            function (player, callback) {
                var winAmount = 0;
                _.each(allData.pots, function (pot) {
                    var winners = _.filter(pot.winner, function (w) {
                        return w.winner
                    });
                    _.each(winners, function (w) {

                        if (w.playerNo == player.playerNo && w.winner) {
                            winAmount += pot.totalAmount / winners.length;
                        }
                    });
                });

                if (winAmount >= player.totalAmount) {
                    player.totalAmount = winAmount - player.totalAmount;
                    Transaction.tableWonAmount(player, callback);
                } else {
                    player.totalAmount = player.totalAmount - winAmount;
                    Transaction.tableLostAmount(player, callback);
                }

            }, callback);

    },
    getWinAmount: function (player, pots, callback) {
        var playerNo = player.playerNo;




    },
    tableWonAmount: function (data, callback) {
        var transData = {};
        var transStatus = "tableWon";
        var transAmt;
        transData.amount = data.totalAmount;
        transData.transType = "tableWon";
        // var accessToken = data.accessToken;
        // if (parseInt(transAmt) == NaN) {
        //     callback("Enter Valid Amount");
        // }

        User.findOne({
            _id: data.user
        }).exec(function (err, userData) {

            if (!_.isEmpty(userData)) {
                Transaction.balance = userData.balance;
                async.parallel({
                    transaction: function (callback) {
                        transData.userId = userData._id;
                        if (!transData._id) {
                            Transaction.saveData(transData, function (err, data) {
                                callback(err, data);
                            });
                        } else {
                            Transaction.findOneAndUpdate({
                                userId: userData._id,
                                _id: data.transId
                            }, {
                                $inc: {
                                    amount: transAmt
                                }
                            });
                        }
                    },
                    balance: function (callback) {
                        var finalAmount = parseInt(userData.balance) + parseInt(data.totalAmount);
                        userData.balance = finalAmount;
                        userData.save(function (err, data) {
                            callback(err, data);
                        });
                    },
                    player: function (callback) {
                        Player.update({
                            _id: data._id
                        }, {
                            $inc: {
                                buyInAmt: data.totalAmount
                            }
                        }).exec(callback)
                    }
                }, function (err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(err, {
                            tansId: result.transaction._id
                        })
                    }
                });
            } else {
                callback("You need to login first.");
            }
        });
    },
    tableLostAmount: function (data, callback) {
        var transData = {};
        transData.transType = "tableLost";
        // var transAmt = data.amount;
        transData.amount = data.totalAmount;
        //var accessToken = data.accessToken;
        // if (parseInt(transAmt) == NaN) {
        //     callback("Enter Valid Amount");
        // }
        //transData.amount = coinData.coins;
        // if (!_.isEmpty(data.transId)) {
        //     transData._id = data.transId;
        // }
        User.findOne({
            _id: data.user
        }).exec(function (err, userData) {
            Transaction.balance = userData.balance;
            if (!_.isEmpty(userData)) {
                async.parallel({
                    transaction: function (callback) {
                        transData.userId = userData._id;
                        if (!transData._id) {
                            Transaction.saveData(transData, function (err, data) {
                                callback(err, data);
                            });
                        } else {
                            Transaction.findOneAndUpdate({
                                userId: userData._id,
                                _id: data.transId
                            }, {
                                $inc: {
                                    amount: data.totalAmount
                                }
                            });
                        }
                    },
                    balance: function (callback) {
                        var finalAmount = parseInt(userData.balance) - parseInt(data.totalAmount);
                        userData.balance = finalAmount;
                        userData.save(function (err, data) {
                            callback(err, data);
                        });
                    },
                    player: function (callback) {
                        var decAmount = -data.totalAmount;

                        Player.update({
                            _id: data._id
                        }, {
                            $inc: {
                                buyInAmt: decAmount,
                                //totalAmount: 0
                            }
                        }).exec(callback);
                    }
                }, function (err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(err, {
                            transId: result.transaction._id
                        })
                    }
                });
            } else {
                callback("You need to login first.");
            }
        });
    }
};
module.exports = _.assign(module.exports, exports, model);