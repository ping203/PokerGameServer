var schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    transType: {
        type: String,
        enum: ["diposit", "withdraw", "tableLost", "tableWon", "tip", "voucher"]
    },
    amount: Number,
    status: {
        type: String,
        enum: ["Sent", "Processing", "Completed", "Failed"]
    },
    transactionId: String,
    transactionLog: Schema.Types.Mixed,
    voucher: {
        type: Schema.Types.ObjectId,
        ref: 'Voucher'
    },
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
    makeTip: function (data, callback) {
        var Model = this;
        var amount = parseInt(data.amount);
        async.parallel({
            user: function (callback) {
                User.findOne({
                    accessToken: data.accessToken
                }).exec(callback);
            },
            dealer: function (callback) {
                Dealer.findOne({
                    table: data.tableId
                }).sort({
                    updatedAt: -1
                }).exec(callback);
            },
            players: function (callback) {
                Player.find({
                    table: data.tableId
                }).exec(callback);
            }
        }, function (err, result) {
            console.log("result...", result);
            if (_.isEmpty(result.user)) {
                console.log("inside empty");
                callback({
                    msg: "Please login first.",
                    internalErr: true
                });
                return 0;
            }
            if (_.isEmpty(result.dealer)) {
                callback({
                    msg: "No Dealer Found.",
                    internalErr: true
                });
                return 0;
            }

            var player = _.findIndex(result.players, function (p) {
                return (p.user + "" == result.user._id + "");
            });
            if (player < 0) {
                callback({
                    msg: "No Player Found.",
                    internalErr: true
                });
                return 0;
            }

            player = result.players[player];
            //remove
            player.buyInAmt -= parseInt(amount);
            result.user.balance -= amount;
            result.dealer.balance += amount;
            var transactionData = {
                transType: 'tip',
                status: 'Completed',
                amount: amount,
                userId: result.user._id,
                balance: result.user.balance
            }
            async.parallel([
                function (callback) {
                    console.log("player",player);
                    player.save(callback)
                },
                function (callback) {
                    console.log("user", result.user);
                    result.user.save(callback);
                },
                function (callback) {
                    console.log("dealer",result.dealer);     
                    result.dealer.save(callback);
                },
                function (callback) {
                    console.log("Transaction",result.dealer);     
                    TransactionData = new Transaction(transactionData);
                    TransactionData.save(callback);
                }
            ], function (err, result) {
                console.log("err", err, "result ", result);
                Table.blastSocket(data.tableId, {
                    action: "tip",
                    amount: amount
                });
                callback(err, {});
            });

        });
    },
    useVoucher: function (data, callback) {
        var Model = this;
        async.parallel({
            user: function (callback) {
                User.findOne({
                    accessToken: data.accessToken
                }).exec(callback);
            },
            voucher: function (callback) {
                Voucher.findOne({
                    voucherCode: data.voucherCode
                }).exec(callback);
            }
        }, function (err, result) {
            if (_.isEmpty(result.user)) {
                callback({
                    msg: "Please login first.",
                    internalErr: true
                });
                return 0;
            }
            if (_.isEmpty(result.voucher)) {
                callback({
                    msg: "Invalide voucher code.",
                    internalErr: true
                });
                return 0;
            }

            if (result.voucher.usedBy) {
                callback({
                    msg: "Voucher code already used",
                    internalErr: true
                });
                return 0;
            }


            async.parallel([
                function (callback) {
                    result.user.balance += result.voucher.amount;
                    result.user.save(callback);
                },
                function (callback) {
                    result.voucher.usedBy = result.user._id;
                    result.voucher.save(callback)
                },
                function (callback) {
                    var TransactionData = {
                        transType: 'voucher',
                        status: 'Completed',
                        amount: amount,
                        userId: result.user._id,
                        balance: result.user.balance,
                        voucher: result.voucher._id
                    }

                    Transaction(TransactionData).save(callback);

                }
            ], callback);

        });
    },
    saveTransaction: function (data, callback) { 
        console.log(data);
        var Model = this;
        var user = data.userId._id;
        var deductAmt = -data.amount;
        if (data.transType == 'withdraw' && data.status == 'Completed') {
            async.parallel([
                function (callback) {
                    var instance = Model(data);
                    instance.isNew = false;
                    instance.save(callback)
                },
                function (callback) {
                    User.update({
                        _id: user
                    }, {
                        $inc: {
                            balance: deductAmt
                        }
                    }).exec(callback);
                }
            ], callback);
        } else {
            var instance = Model(data);
            //to save the document with _id
            instance.isNew = false;
            instance.save(callback)
        }
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

                player.totalPotAmt = winAmount;
                player.rackRate = 5;
                if(allData.table){
                    player.rackRate =  allData.table.rackRate;
                }
                
                if (winAmount >= player.totalAmount) {
                    player.totalAmount = winAmount - player.totalAmount;
                    Transaction.tableWonAmount(player, callback);
                } else if (winAmount > 0) {
                   
                    async.waterfall([
                        function (callback) {
                            Transaction.tableLostAmount(player, function (err) {
                                callback(err);
                            });
                        },
                        function (callback) {
                            player.totalAmount = winAmount;
                            Transaction.tableWonAmount(player, function (err) {
                                callback(err);
                            });
                        }
                    ], callback);

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

        transData.transType = "tableWon";

        var rackAmt = (data.totalPotAmt * parseInt(data.rackRate)) / 100;
        data.totalAmount = data.totalAmount - rackAmt;
        transData.amount = data.totalAmount;

        console.log("total amount", transData.amount);
        console.log("rack amount", rackAmt);
        // var accessToken = data.accessToken;
        // if (parseInt(transAmt) == NaN) {
        //     callback("Enter Valid Amount");
        // }

        User.findOne({
            _id: data.user
        }).exec(function (err, userData) {

            if (!_.isEmpty(userData)) {
                console.log( "tableWonAmount userData", userData);
               
                var finalAmount = parseInt(userData.balance) + parseInt(data.totalAmount);
                transData.balance = finalAmount;
                async.parallel({
                    transaction: function (callback) {
                        transData.userId = userData._id;

                        Transaction.saveData(transData, function (err, data) {
                            callback(err, data);
                        });

                    },
                    balance: function (callback) {
                      
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
                                //remove
                                buyInAmt: parseInt(data.totalAmount)
                            }
                        }).exec(callback)
                    },
                    rackAmt: function (callback) {
                        User.findOneAndUpdate({
                            accessLevel: 'Admin'
                        }, {
                            $inc: {
                                balance: rackAmt
                            }
                        }, callback)
                    }
                }, function (err, result) {
                    console.log('......................', err, result);
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
            
            
            if (!_.isEmpty(userData)) {
                var finalAmount = parseInt(userData.balance) - parseInt(data.totalAmount);
                transData.balance = finalAmount;
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
                                //remove
                                buyInAmt: parseInt(decAmount)
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