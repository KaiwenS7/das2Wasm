var express = require('express');
var app = express();
var cors = require('cors');
var path = require('path');
var PORT = 8080;
 

app.options('*', cors());

app.get('/', cors(), function(req, res, next){
    var options = {
        root: path.join(__dirname, 'data'),
        
    };
     
    var fileName = 'tr-pre_ql_msc-sim_bac_2017-09-25-data.d3b';

    res.sendFile(fileName, options, function (err) {
        if (err) {
            next(err);
        } else {
            console.log('Sent:', fileName);
        }
    });
});
 
app.listen(PORT, function(err){
    if (err) console.log(err);
    console.log("Server listening on PORT", PORT);
});