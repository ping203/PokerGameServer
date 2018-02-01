module.exports = _.cloneDeep(require("sails-wohlig-controller"));
var controller = {
    buyCoins: function (req, res) {
        console.log("inside bycoins");
        Transaction.buyCoins(req.body, res.callback);
    },
    withdrawCoins: function (req, res) {
        console.log("inside withdrawCoins");
        Transaction.withdrawCoins(req.body, res.callback);
    },
    getDetails: function (req, res) {
        Transaction.getDetails(req.body, res.callback);
    },
    generateRefundExcel: function (req, res) {
        Transaction.generateRefundExcel(req.body, res);
    },
    saveTransaction: function (req, res) {
        Transaction.saveTransaction(req.body, res.callback);
    },
    useVoucher: function (req, res) {
        console.log(req.body);
        Transaction.useVoucher(req.body, res.callback);  
    },
    makeTip: function (req, res) {
        console.log(req.body);
        Transaction.makeTip(req.body, res.callback);  
    }
};
module.exports = _.assign(module.exports, controller);