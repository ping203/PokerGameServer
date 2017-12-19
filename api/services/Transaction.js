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
    status: String,
    transactionId: String,
    transactionLog: Schema.Types.Mixed,
    Voucher: String
});

schema.plugin(deepPopulate, {});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Transaction', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema));
var model = {
    getDetails: function (data, callback) {
        var Model = this;
        User.findOne({
            accessToken: data.accessToken
        }).exec(function (err, data) {
            if (err) {
                callback(err);
            } else {
                if (!_.isEmpty(data)) {
                    Model.findOne({
                        _id: data._id
                    }, {
                        _id: 0,
                        orderType: 1,
                        amount: 1,
                        status: 1
                    }).exec(function (err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(err, data);
                        }
                    });
                }
            }
        });
    },
    buyCoins: function (coinData, callback) {
        var transData = {};
        //transData.transStatus = "Completed";
        transData.transType = 'diposit';
        console.log(coinData);
        transData.amount = coinData.coins;
        var transAmt = coinData.coins;
        // var transAmt;
        var accessToken = coinData.accessToken;
        if (parseInt(transAmt) == NaN) {
            callback("Enter Valid Amount");
        }
        User.findOne({
            accessToken: accessToken
        }).exec((err, data) =>  {
            console.log(data);
            if (!_.isEmpty(data)) {
                async.parallel([(callback) => {
                    console.log(data);
                    transData.userId = data._id
                    transData = new this(transData);
                    transData.save(function(err, data){
                         callback(err, data);
                    });
                    // Transaction.saveData(transData, function (err, data) {
                    //     callback(err, data);
                    // });
                }, function (callback) {
                    var finalAmount = parseInt(data.balance) + parseInt(transAmt);
                    data.balance = finalAmount;
                    data.save(function (err, data) {
                        callback(err, data);
                    });
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
        //transData.transStatus = "Completed";
        transData.transType = 'withdraw';
        transData.amount = coinData.coins;
        var transAmt = coinData.coins;
        // var transAmt;
        var accessToken = coinData.accessToken;
        if (parseInt(transAmt) == NaN) {
            callback("Enter Valid Amount");
        }
        User.findOne({
            accessToken: accessToken
        }).exec(function (err, data) {

            if (!_.isEmpty(data)) {
                async.parallel([function (callback) {
                    transData.userId = data._id;
                    Transaction.saveData(transData, function (err, data) {
                        callback(err, data);
                    });
                }, function (callback) {
                    var finalAmount = parseInt(data.balance) - parseInt(transAmt);
                    data.balance = finalAmount;
                    data.save(function (err, data) {
                        callback(err, data);
                    });
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
    changeStatus: function (transData, callback) {

    },
    tableWonAmount: function (transData, callback) {
        var transData = {};
        var transStatus = "tableWon";
        var transAmt;
        var accessToken = data.accessToken;
        if (parseInt(transAmt) == NaN) {
            callback("Enter Valid Amount");
        }
        user.findOne({
            accessToken: accessToken
        }).exec(function (err, data) {

            if (!_.isEmpty(data)) {
                async.parallel({
                    transaction: function (callback) {
                        transData.userId = userData._id;
                        if (transData._id) {
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
                        var finalAmount = parseInt(data.amount) + parseInt(transAmt);
                        data.balance = finalAmount;
                        data.save(function (err, data) {
                            callback(err, data);
                        });
                    }
                }, function (err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(err, {tansId:result.transaction._id})
                    }
                });
            } else {
                callback("You need to login first.");
            }
        });
    },
    tableLostAmount: function (data, callback) {
        var transData = {};
        //transData.transStatus = "tableLost";
        var transAmt = data.coins;
        transData.amount = transAmt;
        var accessToken = data.accessToken;
        if (parseInt(transAmt) == NaN) {
            callback("Enter Valid Amount");
        }
        transData.amount = coinData.coins;
        if (!_.isEmpty(data.transId)) {
            transData._id = data.transId;
        }
        user.findOne({
            accessToken: accessToken
        }).exec(function (err, userData) {

            if (!_.isEmpty(data)) {
                async.parallel({
                    transaction: function (callback) {
                        transData.userId = userData._id;
                        if (transData._id) {
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
                        var finalAmount = parseInt(data.amount) - parseInt(transAmt);
                        data.balance = finalAmount;
                        data.save(function (err, data) {
                            callback(err, data);
                        });
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