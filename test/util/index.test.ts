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
import { DefaultScene } from '../../src/scene/defaultScene';
import { Constant, Util } from '../../src/util/index';

Logger.LogLevels = Logger.ErrorLogLevel;

describe('Lighting', () => {
    describe('isTextureAsset', () => {
        it('should return true if file extension is .png', () => {
            const filename = 'http://localhost/test.png?param';

            const isTextureAsset = Util.isTextureAsset(filename);

            expect(isTextureAsset).toBeTruthy();
        });

        it('should return false if file extension is .glb', () => {
            const filename = 'test.glb';

            const isTextureAsset = Util.isTextureAsset(filename);

            expect(isTextureAsset).toBeFalsy();
        });
    });
});

describe('Util.createMetallicSphere', () => {
    const data = fs.readFileSync('public/model/mannequin.glb').toString('base64');
    let defaultScene: Nullable<DefaultScene> = null;

    beforeEach(() => {
        const presetConfig: Config = {
            engineConfig: {
                useNullEngine: true,
            },
        };
        defaultScene = new DefaultScene(null, presetConfig);
    });

    afterEach(() => {
        defaultScene?.dispose();
    });

    it('should return null if ', async () => {
        const metallicSphere = Util.createMetallicSphere(defaultScene!);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(metallicSphere).toBe(null);
    });

    it('should be able to create metallic sphere mesh', async () => {
        await defaultScene!.init();
        await defaultScene!.loadGltf(`data:model/gltf-binary;base64,${data}`, true);

        Util.createMetallicSphere(defaultScene!);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(defaultScene!.sceneManager.scene.getMeshByName(Constant.LIGHTING_REFLECTION_SPHERE)).toBeTruthy();
        expect(defaultScene!.sceneManager.scene.getMaterialByName(Constant.METALLIC_SPHERE_MATERIAL)).toBeTruthy();
    });
});
