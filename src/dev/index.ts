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

/**
 * This file is only for testing/demo purposes
 */

function createButton(name: string, url: string) {
    const div = document.createElement('div');
    const button = document.createElement('button');
    button.innerText = name;
    button.onclick = () => {
        window.open(url, '_blank');
    };
    div.appendChild(button);
    document.body.appendChild(div);
}

(function () {
    createButton('3D scene viewer', '/v3dViewer');
})();
