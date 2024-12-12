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

import * as fs from 'fs';

import { Logger } from '@babylonjs/core/Misc/logger';
import { Nullable } from '@babylonjs/core/types';

import { Config } from '../../src/config/config';
import { V3DScene } from '../../src/scene/v3dScene';

Logger.LogLevels = Logger.ErrorLogLevel;

describe('V3DScene', () => {
    let v3dScene: Nullable<V3DScene> = null;
    const lightingData = 'data;,' + fs.readFileSync('public/ibl/Neutral.env').toString('base64');

    beforeEach(() => {
        const presetConfig: Config = {
            '3dCommerceCertified': true,
            engineConfig: {
                useNullEngine: true,
            },
            lightingConfig: {
                Neutral: {
                    type: 'env',
                    enable: true,
                    filePath: lightingData,
                },
            },
        };
        v3dScene = new V3DScene(null, presetConfig);
    });

    afterEach(() => {
        v3dScene?.dispose();
    });

    test('init', async () => {
        await v3dScene?.init();

        expect(v3dScene?.engine).toBeTruthy();
        expect(v3dScene?.scene).toBeTruthy();
        expect(v3dScene?.sceneManager).toBeTruthy();
        expect(v3dScene?.config).toBeTruthy();
        expect(v3dScene?.observableManager).toBeTruthy();
        expect(v3dScene?.canvas).toBeFalsy();
    });
});
