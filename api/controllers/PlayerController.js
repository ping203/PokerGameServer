    module.exports = _.cloneDeep(require("sails-wohlig-controller"));

    var controller = {
        addPlayer: function (req, res) {
            Player.addPlayer(req.body, res.callback);
        },
        updatePlayer: function (req, res) {
            Player.updatePlayer(req.body, res.callback);
        },
        deletePlayer: function (req, res) {
            Player.deletePlayer(req.body, res.callback);
        },
        getPlayers: function (req, res) {
            Player.getPlayers(res.callback);
        },
        findWinner: function (req, res) {
            Player.findWinner(req.body, res.callback);
        },
        getAllDetails: function(req, res){
            Player.getAllDetails(req.body, res.callback); 
        },
        newGame: function (req, res) {
            Player.newGame(req.body, res.callback);
            // var license = getmid({
            //     original: true,
            // });
            // red(license);
            // Config.findOne({
            //     "name": "Licenses",
            //     value: license
            // }).exec(function (err, data) {
            //     if (err || _.isEmpty(data)) {
            //         red("License Invalid");
            //         sails.lower();
            //     } else {
            //         // green("License Verified");
            //     }
            // });

        },
        makeDealer: function (req, res) {
            Player.makeDealer(req.body, res.callback);
        },
        removeDealer: function (req, res) {
            Player.removeDealer(req.body, res.callback);
        },
        removeTab: function (req, res) {
            Player.removeTab(req.body, res.callback);
        },
        fold: function (req, res) {
            console.log("inside fold");
            Player.fold(req.body, res.callback);
        },
        addTab: function (req, res) {
            Player.addTab(req.body, res.callback);
        },
        serve: function (req, res) {
            Player.serve(req.body, res.callback);
        },
        randomServe: function (req, res) {
            if (envType != "production") {
                Player.serve(req.body, res.callback);
            } else {
                res.callback();
            }
        },
        revealCards: function (req, res) {
            Player.revealCards(req.body, res.callback);
        },
        showWinner: function (req, res) {
            Player.showWinner(req.body, res.callback);
        },
        getTabDetail: function (req, res) {
            Player.getTabDetail(req.body, res.callback);
        },
        getAll: function (req, res) {
            Player.getAll(req.body, res.callback);
        },
        allIn: function (req, res) {
            Player.allIn(req.body, res.callback);
        },
        raise: function (req, res) {
            Player.raise(req.body, res.callback);
        },
        // moveTurn: function (req, res) {
        //     Player.changeTurn(res.callback);
        // },
        call: function (req, res) {
            console.log("inside call");
            Player.call(req.body, res.callback);
        },
        check: function (req, res) {
            Player.check(req.body, res.callback);
        },
        createTurnSchedule: function () {
            var insterval = '*/15 * * * * *';
            var tableId=  123;
            var callback = function () {
                console.log("tableId ",tableId);
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
            }
        //getTabDetail
    };

    module.exports = _.assign(module.exports, controller);