var redis = require("redis"),
    client = redis.createClient();

client.on("error", function (err) {
    console.log("Redis connection error to " + client.host + ":" + client.port + " - " + err);
});

var User = function(jid, attributes) {
    this.jid = jid;
    this.attrs = {};
    if(typeof(attributes) !== undefined) {
        this.attrs = attributes;
    }
};

User.key = function(jid) {
    return "user:" + jid.toString();
};

User.find = function(jid, cb) {
    var self = this;
    client.hgetall(User.key(jid), function(err, obj) {
        if(isEmpty(obj)) {
            cb(null);
        } 
        else {
            cb(new User(jid, obj));
        }
    });
};

User.randomiser = function(cb){
    client.srandmember("user",function(err,res){
        if(!err){
            cb(null,res);
        }
        else
            cb(err)
    });

};

User.prototype.delete = function(callback) {
    var self = this;
    client.del(User.key(this.jid), function(err, obj) {
        callback(err, self);
    });
};


User.prototype.save = function(callback) {
    var self = this;
    console.log('save');
    console.log("user", this.jid);
    client.sadd("user", this.jid, function(err, obj) {
        callback(err, self);
    });
};

// TOFIX : race condition!
User.register = function(jid, password, options) {
    console.log('register');
    User.find(jid, function(user) {
        if(user && !options.force) {
            options.error("There is already a user with that jid");
        } else {
            var user = new User(jid, {password: password});
            user.save(function() {
                options.success(user);
            });
        }
    });
    
}
exports.User = User;


function isEmpty(ob){
   for(var i in ob){ if(ob.hasOwnProperty(i)){return false;}}
  return true;
}


// var u = new exports.User();
// u.find("julien@localhost", function() {
//     console.log(u);
// })

