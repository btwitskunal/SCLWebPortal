const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const azureAdConfig = require('../config/azureAd').creds;

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new OIDCStrategy(azureAdConfig,
  function(iss, sub, profile, accessToken, refreshToken, done) {
    if (!profile.oid) {
      return done(new Error('No OID found'), null);
    }
    // Here, you can look up or create the user in your DB
    return done(null, profile);
  }
));

exports.login = passport.authenticate('azuread-openidconnect', { failureRedirect: '/' });
exports.callback = [
  passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/'); // Redirect to frontend or upload page
  }
];
exports.logout = (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
}; 