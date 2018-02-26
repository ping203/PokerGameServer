var schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    mobile: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    forgotPassword: {
        type: String,
        default: ""
    },
    table: {
        type: Schema.Types.ObjectId,
        ref: 'Table'
    },
    accessToken: {
        type: [String],
        index: true
    },
    socketId: {
        type: String
    },
    balance: {
        type: Number,
        default: 0
    }
});

schema.plugin(deepPopulate, {});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Dealer', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema));
var model = {
    createDealer: function (dealer, callback) {
        dealer.password = md5(dealer.password);
        if (dealer._id) {
            dealer.isNew = false;
        }  
        dealer = new this(dealer);
       
        dealer.save(callback);
    },
    login: function (dealer, callback) {
        console.log(dealer);
        var Model = this;
        Model.findOne({
            mobile: dealer.mobile,
            password: md5(dealer.password)
        }).exec(function (err, data) {
            console.log("data", data);
            if (err) {
                callback(err);
            } else {
                if (!_.isEmpty(data)) {
                    console.log(data);
                    var accessToken = [uid(16)];
                    data.accessToken = accessToken;
                    data.table = dealer.tableId;
                    data.socketId = dealer.socketId;
                    data.save(function (err, data) {
                        if (err) {
                            callback(err);
                        } else {

                            Table.update({
                                _id : dealer.tableId
                            }, {
                                youTubeUrl: dealer.youTubeUrl
                            }).exec(function(err, data){

                            });
                            callback(err, {
                                accessToken: accessToken
                            });
                        }
                    });
                } else {
                    callback("Invalid credentials");
                }
            }
        });
    },
    connectSocket: function (data, callback) {
        Dealer.update({
            accessToken: data.accessToken
        }, {
            socketId: data.socketId
        }).exec(callback);
    },




};
module.exports = _.assign(module.exports, exports, model);