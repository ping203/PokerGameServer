module.exports = _.cloneDeep(require("sails-wohlig-controller"));
var controller = {
    addUserToTable: function(req, res){
        Table.addUserToTable(req.body, res.callback);
    }
};
module.exports = _.assign(module.exports, controller);
