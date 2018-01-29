var schema = new Schema({
   amount: {
       type: Number,
       require: true
   },
   user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
   },
   transaction:{
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
   },
   status: {
       type: String,
       enum: ["Sent", "Processing", "Completed"]
   }
});

schema.plugin(deepPopulate, {});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Withdraw', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema));
var model = {};
module.exports = _.assign(module.exports, exports, model);