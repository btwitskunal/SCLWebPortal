const fs = require('fs');
const SamlStrategy = require('passport-saml').Strategy;

// Load your SP public certificate (for signing, if needed)
const spCert = fs.readFileSync('./certs/sp-public-cert.pem', 'utf-8').replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\r|\n/g, '');

const samlStrategy = new SamlStrategy(
  {
    callbackUrl: 'https://your-app.com/auth/callback', // <-- Replace with your ACS URL
    issuer: 'https://your-app.com',                    // <-- Replace with your SP Entity ID
    // If you want to support encrypted assertions, add:
    // decryptionPvk: fs.readFileSync('./certs/sp-private-key.pem', 'utf-8'),
    // privateCert: fs.readFileSync('./certs/sp-private-key.pem', 'utf-8'),
  },
  function(profile, done) {
    return done(null, profile);
  }
);

// Generate metadata with signing certificate
const metadata = samlStrategy.generateServiceProviderMetadata(spCert);

fs.writeFileSync('sp-metadata.xml', metadata);
console.log('SAML metadata written to sp-metadata.xml');