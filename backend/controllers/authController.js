const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const azureAdConfig = require('../config/azureAd').creds;
const UserService = require('../utils/userService');

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new OIDCStrategy(azureAdConfig,
  async function(iss, sub, profile, accessToken, refreshToken, done) {
    try {
      if (!profile.oid) {
        return done(new Error('No OID found'), null);
      }
      
      // Find or create user in our database
      const dbUser = await UserService.findOrCreateUser(profile);
      
      // Attach both Azure profile and our DB user info
      profile.dbUser = dbUser;
      
      return done(null, profile);
    } catch (error) {
      console.error('Error in OIDC strategy:', error);
      return done(error, null);
    }
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