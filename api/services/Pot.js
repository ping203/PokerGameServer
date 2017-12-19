var schema = new Schema({
    table:{
        type: Schema.Types.ObjectId,
        ref: 'Table'
    },
    TotalAmount:{
        type: Number,
        default:0
    },
    players:[{
        player:{
            type: Schema.Types.ObjectId,
            ref: 'Player'
        },
        amount:{
            type:Number,
            default:0
        }
    }],
    winner:{
        type: Schema.Types.ObjectId,
        ref: 'Player'
    }
});

schema.plugin(deepPopulate, {});
schema.plugin(uniqueValidator);
schema.plugin(timestamps);
module.exports = mongoose.model('Pot', schema);

var exports = _.cloneDeep(require("sails-wohlig-service")(schema));
var model = {};
module.exports = _.assign(module.exports, exports, model);