module.exports = _.cloneDeep(require("sails-wohlig-controller"));
var controller = {
    login: function(req, res){
       Dealer.login(req.body, res.callback);
    }
};
module.exports = _.assign(module.exports, controller);
