module.exports = _.cloneDeep(require("sails-wohlig-controller"));
var controller = {
    login: function(req, res){
       Dealer.login(req.body, res.callback);
    },
    connectSocket: function(req, res){
        Dealer.connectSocket(req.body, res.callback);
    },
    createDealer: function(req, res){
        Dealer.createDealer(req.body, res.callback);
    }
};
module.exports = _.assign(module.exports, controller);
