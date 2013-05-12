var express = require('express')
  , mongoose = require('mongoose')
  , passport = require('passport')
  , util = require('util')
  , TwitterStrategy = require('passport-twitter').Strategy
  , FacebookStrategy = require('passport-facebook').Strategy
  , LocalStrategy = require('passport-local').Strategy
  , Schema = mongoose.Schema;

var fs = require("fs");


var TWITTER_CONSUMER_KEY = "JmXrgiHEOaVR6Ho8OnqvLQ"
var TWITTER_CONSUMER_SECRET = "AeiYS9JHzfVZSilW6SB9l9QAx71RlaZZBhF0QmUjjI";

 
var FACEBOOK_APP_ID	=	"589710817719176"
var FACEBOOK_APP_SECRET	=	"0446fce5630e89529a4a2ac1caea2b36";

 
var UserSchema = new Schema({
  provider: String,
  username:String,
  token : String,
  stream: {},
  followers:{},
  fllowing:{},
  created: {type: Date, default: Date.now}
});

 
mongoose.connect('mongodb://localhost/twitter-mongo');
mongoose.model('User',UserSchema);

var User = mongoose.model('User');

 
passport.use(new TwitterStrategy({
    consumerKey: TWITTER_CONSUMER_KEY,
    consumerSecret: TWITTER_CONSUMER_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    User.findOne({username: profile.username}, function(err, user) {
      console.log(profile);
      if(user) {
        done(null, user);
      } else {
        var user = new User();
        user.provider = "twitter";
        user.username = profile.username;
        user.token	  = profile.id;
        user.stream	=	[];
        user.follower= [];
        user.following= [];
   //     user.name = profile.displayName;
  //      user.image = profile._json.profile_image_url;
        user.save(function(err) {
          if(err) { throw err; }
          done(null, user);
        });
      }
    })
  }
));

 
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/facebook/callback",
  },
  function(accessToken, refreshToken, profile, done) {
        User.findOne({uid: profile.id}, function(err, user) {
      console.log(profile);
      if(user) {
        done(null, user);
      } else {
        var user = new User();
        user.provider = "facebook";
        user.username = profile.username;
        user.token	  = profile.id;
        user.stream	=	[];
        user.follower= [];
        user.following= [];
 
//        user.name = profile.displayName;
//        user.image = "https://graph.facebook.com/"+profile.id+"/picture";
//       console.log(user);
        user.save(function(err) {
          if(err) { throw err; }
          done(null, user);
        });
      }
    });
  }
));

// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
  function(username,  done) {
	  process.nextTick(function () {
    User.findOne({ username: username}, function(err, user) {
      if (err) { return done(err); }
      if(user) {
        	done(null, user);
      } else {

      }
    });
	
	  });
  }
));

// POST /login
//   This is an alternative implementation that uses a custom callback to
//   acheive the same functionality.



passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(username, done) {
  User.findOne({username: username}, function (err, user) {
    done(err, user);
  });
});

var app = express.createServer();

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/auth/twitter',
  passport.authenticate('twitter'),
  function(req, res){
    // The request will be redirected to Twitter for authentication, so this
    // function will not be called.
  });

app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/auth/facebook', passport.authenticate('facebook'));
 
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res){
    res.redirect('/');
  });
  
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

  
app.post('/upload', function(req, res) {

console.log(req.files);
fs.readFile(req.files.file.path, function (err, data) {
   
  var newPath = __dirname + "/uploads/user/photo.jpg";
  fs.writeFile(newPath, data, function (err) {
  
    res.send(req.files.file.size);
  });
});
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.session.messages });
});

 
app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});


app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

// POST /login
//   This is an alternative implementation that uses a custom callback to
//   acheive the same functionality.
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err) }
    if(!req.body.username){
    req.session.messages =  [info.message];
    return res.redirect('/login')
    }
    if (!user) {
        console.log(req.body.username);
        var user = new User();      
        user.provider = "local";
        user.username = req.body.username;
        user.token	  = randomToken();
        user.stream	=	[];
        user.follower=[];
        user.following=[];
 
//        user.name = profile.displayName;
//        user.image = "https://graph.facebook.com/"+profile.id+"/picture";
        console.log(user);
        user.save(function(err) {
          if(err) { throw err; }
 		   req.logIn(user, function(err) {
      		if (err) { return next(err); }
	  			res.redirect('/account');	 
    			});
        });
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
	  res.redirect('/account');	 
    });
  })(req, res, next);
});



app.listen(3000);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
 	  res.redirect('/')
}

function randomToken()
{
	var from	=	10000000000;
	var to		=	99999999999;
    return Math.floor(Math.random()*(to-from+1)+from);
}
 