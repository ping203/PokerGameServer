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
    }]
});

schema.plugin(deepPopulate, {});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Table', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema));
var model = {
    addUserToTable: function (data, callback) {
        User.findOne({
            accessToken: data.accessToken
        }).exec(function (err, user) {
            if (!_.isEmpty(user)) {
                Player.find({
                    table: data.tableId
                }).sort({
                    playerNo: -1
                }).limit(1).exec(function (err, playersData) {
                    var player = {};
                    console.log(playersData);
                    if (playersData && playersData[0]) {
                        player.playerNo = parseInt(playersData[0].playerNo) + 1;
                    }
                    console.log(player.playerNo);
                    if (!player.playerNo) {
                        console.log("Inside");
                        player.playerNo = 1;
                    }
                    player.user = user._id;
                    player.table = data.tableId;
                    Player.saveData(player, function (err, player) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(err, "User added to table.");
                        }
                    });
                });
            } else {
                callback("Login First");
            }


        });
    },
    upadteStatus: function(table, callback){
        Table.save(table, function(err, data){
                callback(err,data);
        });
    }
};
module.exports = _.assign(module.exports, exports, model);