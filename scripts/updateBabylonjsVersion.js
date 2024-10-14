/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Get the version from command-line arguments
const version = process.argv[2];
if (!version) {
    throw new Error('Please provide a version. For example: npm run update-bjs-ver -- 7.0.0');
}

const dependencies = ['@babylonjs/core', '@babylonjs/gui', '@babylonjs/loaders', '@babylonjs/materials'];
const devDependencies = ['@babylonjs/inspector'];

// Run npm install with the given version
for (const packageName of dependencies) {
    const packageToInstall = `${packageName}@${version}`;
    console.log(`Installing ${packageToInstall}`);
    execSync(`npm install ${packageToInstall} --save --save-exact`, { stdio: 'inherit' });
}

for (const packageName of devDependencies) {
    const packageToInstall = `${packageName}@${version}`;
    console.log(`Installing ${packageToInstall}`);
    execSync(`npm install ${packageToInstall} --save-dev --save-exact`, { stdio: 'inherit' });
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update peerDependencies with the installed version
const currentVersion = packageJson.dependencies['@babylonjs/core'];
packageJson.peerDependencies = packageJson.peerDependencies ?? {};
for (const packageName of dependencies) {
    packageJson.peerDependencies[packageName] = `^${currentVersion}`;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log(`Updated peerDependencies: ${packageName} to version ${currentVersion}`);
}
