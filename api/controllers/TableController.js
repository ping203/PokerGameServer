module.exports = _.cloneDeep(require("sails-wohlig-controller"));
var controller = {
    addUserToTable: function(req, res){
        Table.addUserToTable(req.body, res.callback);
    },
    getAllTable: function(req, res){
        Table.getAllTable(req.body, res.callback);
    },
    testSocket: function(req, res){
        sails.sockets.broadcast(req.tableId, "Update", "hi.........");
    }
};
module.exports = _.assign(module.exports, controller);
