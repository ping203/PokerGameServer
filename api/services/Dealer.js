var schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
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
    }
});

schema.plugin(deepPopulate, {});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Dealer', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema));
var model = {
    login: function (dealer, callback) {
        var Model = this;
        Model.findOne({
            mobile: dealer.mobile,
            password: md5(dealer.password)
        }).exec(function (err, data) {
            if (err) {
                callback(err);
            } else {
                if (!_.isEmpty(data)) {
                    console.log(data);
                    var accessToken = [uid(16)];
                    data.accessToken = accessToken;
                    data.save(function (err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(err, {
                                accessToken: accessToken
                            });
                        }
                    });
                } else {
                    callback("Otp verfication failed");
                }
            }
        });
    },
    selectTable: function(data, callback){
          Dealer.update({
              accessToken: data.accessToken
          },{
              socketId: data.socketId,
              table: data.tableId
          }).exec(callback);
    }
};
module.exports = _.assign(module.exports, exports, model);