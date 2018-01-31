var schema = new Schema({
    voucherCode: {
        type: String,
        require: true,
        unique: true
    },
    amount: {
        type: Number,
        require: true
    },
    usedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    name: {
        type: String,
        require: true,
    }
});

schema.plugin(deepPopulate, {});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Voucher', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema));
var model = {
    createCode: function (callback) {
        var Model = this;
        Model.find({}).exec(
            function (err, data) {

                var voucher = '';
                do {
                    voucher = voucher_codes.generate({
                        length: 8,
                    });
                } while (Model.checkExists(data, voucher));
                callback(voucher);
            }
        );


    },
    checkExists: function (data, voucher) {
        var voucherIndex = _.findIndex(data, function (v) {
            return v.voucherCode == voucher
        });
        if (voucherIndex >= 0) {
            return true;
        } else {
            return false;
        }
    },
    createVoucher: function (data, callback) {
        var Model = this;
        Model.createCode(function(voucher){
            data.voucherCode = voucher;
            Model.saveData(data, callback);
        });
    }
};
module.exports = _.assign(module.exports, exports, model);