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
const path = require('path');

// Remove dist folder
const distFolder = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distFolder)) {
    fs.rmSync(distFolder, { recursive: true, force: true });
}

// Install dependencies
execSync('npm install', { stdio: 'inherit' });

// Build and pack
execSync('npm run pack:dist', { stdio: 'inherit' });

// Read package.json
const packageJsonPath = path.join(distFolder, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Remove prepublishOnly script from package.json
delete packageJson.scripts['prepublishOnly'];
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// Publish
execSync(`npm publish ${distFolder} --access public`, { stdio: 'inherit' });
