module.exports = function(err, data) {
    var req = this.req;
    var res = this.res;
    var sails = req._sails;
    //console.log("err", (typeof stringValue));
    //console.log("err", (typeof err == 'string'));
    if(err && (typeof err == 'string')){
        var index = -1;
        index = err.search(/login/i);
        //console.log("index inside" , index);
        if(index >= 0){
           err = {
               logout : true
           }
        }
    }
    
    if (err) {
        res.json({
            error: err,
            value: false
        });
    } else if (data) {
        res.json({
            data: data,
            value: true
        });
    } else {
        res.json({
            data: "No Data Found",
            value: false
        });
    }
};
