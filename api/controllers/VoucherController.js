module.exports = _.cloneDeep(require("sails-wohlig-controller"));
var controller = {
    createVoucher: function (req, res) {
        Voucher.createVoucher(req.body, res.callback);
    }
};
module.exports = _.assign(module.exports, controller);