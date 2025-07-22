const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const fs = require('fs');

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new SamlStrategy(
  {
    path: '/auth/callback', // Assertion Consumer Service (ACS) URL
    entryPoint: 'https://your-idp.com/sso', // IdP SSO URL
    issuer: 'https://your-app.com', // Your SP Entity ID
    cert: fs.readFileSync('./certs/idp-public-cert.pem', 'utf-8'), // IdP public cert
    // privateCert: fs.readFileSync('./certs/sp-private-key.pem', 'utf-8'), // If signing
  },
  function(profile, done) {
    return done(null, profile);
  }
));