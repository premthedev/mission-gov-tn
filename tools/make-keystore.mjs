// One-time: create the Android release signing key (PKCS#12) and print the GitHub secrets to add.
// Every APK update must be signed with this same key, or Android will refuse the update.
// Usage: npm run keystore
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import forge from 'node-forge';

const OUT = 'android-release.p12';
const SECRETS = 'android-release.secrets.txt';
const ALIAS = 'missiongov';

if (existsSync(OUT)) {
  console.error(`${OUT} already exists. Keep using it; do not regenerate (updates would fail).`);
  process.exit(1);
}

const password = randomBytes(18).toString('base64url');
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const key = forge.pki.privateKeyFromPem(privateKey.export({ type: 'pkcs1', format: 'pem' }).toString());
const cert = forge.pki.createCertificate();
cert.publicKey = forge.pki.setRsaPublicKey(key.n, key.e);
cert.serialNumber = '01' + randomBytes(8).toString('hex');
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 30);
const attrs = [
  { name: 'commonName', value: 'Mission GOV' },
  { name: 'organizationName', value: 'Personal' },
  { name: 'countryName', value: 'IN' },
];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(key, forge.md.sha256.create());

const p12 = forge.pkcs12.toPkcs12Asn1(key, [cert], password, { algorithm: '3des', friendlyName: ALIAS });
const der = Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary');
writeFileSync(OUT, der);

// Sanity check: the file must open with the password and contain the key under the alias.
const parsed = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der.toString('binary')), password);
const bags = parsed.getBags({ friendlyName: ALIAS });
if (!bags.friendlyName?.length) throw new Error('Keystore check failed');

const secrets = [
  `ANDROID_KEYSTORE_BASE64=${der.toString('base64')}`,
  `ANDROID_KEYSTORE_PASSWORD=${password}`,
  `ANDROID_KEY_ALIAS=${ALIAS}`,
  `ANDROID_KEY_PASSWORD=${password}`,
].join('\n');
writeFileSync(SECRETS, secrets + '\n');
console.log(`Created ${OUT} and ${SECRETS} (both git-ignored).`);
console.log('Add the 4 values in the secrets file as GitHub repository secrets, then store both files somewhere safe (e.g. Google Drive).');
