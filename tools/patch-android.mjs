// Runs in CI after `npx cap add android`: sets the version and required permissions.
import { readFileSync, writeFileSync } from 'node:fs';

const code = process.env.VERSION_CODE || '1';
const ref = process.env.VERSION_NAME || '';
const name = /^v\d/.test(ref) ? ref.slice(1) : `0.1.${code}`;

const gradlePath = 'android/app/build.gradle';
let gradle = readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "${name}"`);
writeFileSync(gradlePath, gradle);

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = readFileSync(manifestPath, 'utf8');
for (const perm of ['android.permission.POST_NOTIFICATIONS']) {
  if (!manifest.includes(perm)) manifest = manifest.replace('</manifest>', `    <uses-permission android:name="${perm}" />\n</manifest>`);
}
writeFileSync(manifestPath, manifest);
console.log(`Android patched: versionCode ${code}, versionName ${name}`);
