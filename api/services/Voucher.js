var schema = new Schema({
	voucherCode	: {
        type: String,
        require: true,
        unique: true
    },
    amount: {
        type: Number,
        require: true
    },
    UsedBy:{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }
});

schema.plugin(deepPopulate, {});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Voucher', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema));
var model = {};
module.exports = _.assign(module.exports, exports, model);