module.exports = _.cloneDeep(require("sails-wohlig-controller"));
var controller = {
    getConfig: function(req, res){
       Config.getConfig(req.body, res.callback);
    },
    setConfig: function(req, res){
        Config.setConfig(req.body, res.callback);
     }
};
module.exports = _.assign(module.exports, controller);