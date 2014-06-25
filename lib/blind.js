var redis = require("redis"),
    client = redis.createClient();
var User = require('../lib/users.js').User;

client.on("error", function (err) {
    console.log("Redis connection error to blinder: " + client.host + ":" + client.port + " - " + err);
});

var Blind = function (jid1, jid2, attributes) {
    this.jid1 = jid1;
    this.jid2 = jid2;
    this.attrs = {};
    if (typeof (attributes) !== undefined) {
        this.attrs = attributes;
    }
};

// Blind.key = function(jid) {
//    // return "Blind:" + jid.toString();
// };

Blind.find = function (jid, cb) {
    console.log('finding before a blinder for jid:',jid);
    var self = this;
    client.smembers(jid, function (err, obj) {
        if (isEmpty(obj)) {
            console.log('Looks good for blinder jid', jid);
            return cb(null);
        } else {
           console.log('Already in a blinder, DND!! jid:', jid);
           return cb(new User(jid, obj));
        }
    });
};


Blind.prototype.delete = function (callback) {
    var self = this;
    client.del(this.jid1, function (err, obj) {
        client.del(this.jid2, function (err, obj) {
            callback(err, self);
        })
    });
};


Blind.prototype.save = function (jid1, jid2, cb) {
    var self = this;
    console.log('saving..', jid1, jid2);
    client.sadd(jid2.local, jid1.local, function (err, obj) {
        client.sadd(jid1.local, jid2.local, function (err, obj) {
            if (!err) {
                cb(err, self)
            }
            console.log('save success!');
        });
    });
};


// TOFIX : race condition!
Blind.register = function (jid1, jid2, options) {
    console.log('registering a blinder:', jid1, jid2);
    Blind.find(jid1.local, function (blind) {
        if (blind && !options.force) {
            console.log('issue here');
            options.error("There is already a blinder going on with jid:", jid1);
        } else {
            Blind.find('jid2.local', function (blind2) {
                if (blind2 && !options.force) {
                    options.error("There is already a blinder going on with jid:", jid2);
                }
                console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>New Blinder looks good to go!');
                var blind = new Blind(jid1, jid2);
                blind.save(jid1, jid2, function () {
                    options.success(blind);
                });
            });
        }

    });
}

exports.Blind = Blind;

function isEmpty(ob) {
    for (var i in ob) {
        if (ob.hasOwnProperty(i)) {
            return false;
        }
    }
    return true;
}


// var u = new exports.Blind();
// u.find("julien@localhost", function() {
//     console.log(u);
// })
