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

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '@babylonjs/core/Misc/logger';
import { Scene } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';

import { LightingConfig } from '../../src/config/lightingConfig';
import { Lighting } from '../../src/lighting/lighting';
import { ObservableManager } from '../../src/manager/observableManager';
import { SceneManager } from '../../src/manager/sceneManager';

Logger.LogLevels = Logger.ErrorLogLevel;

describe('Lighting', () => {
    let engine: Nullable<NullEngine> = null;
    let scene: Nullable<Scene> = null;
    let sceneManager: Nullable<SceneManager> = null;
    let observableManager: Nullable<ObservableManager> = null;
    let lighting: Nullable<Lighting> = null;

    beforeEach(async () => {
        engine = new NullEngine();
        scene = new Scene(engine);
        observableManager = new ObservableManager();
        sceneManager = new SceneManager(engine, {}, observableManager);
        await sceneManager.createScene(scene);
        lighting = new Lighting(sceneManager);
    });

    afterEach(() => {
        lighting?.dispose();
        sceneManager?.dispose();
        observableManager?.dispose();
        engine?.dispose();
    });

    it('should be able to create and remove environment lighting', async () => {
        // Create environment lighting
        const lightingConfig: LightingConfig = {
            NeutralIBL: {
                type: 'env',
                filePath: 'public/ibl/Neutral.env',
            },
        };
        await lighting?.updateLighting(lightingConfig);
        expect(scene?.environmentTexture?.name).toEqual('NeutralIBL');

        // Remove environment lighting
        lightingConfig.NeutralIBL.enable = false;
        await lighting?.updateLighting(lightingConfig);
        expect(scene?.environmentTexture).toBeFalsy();
    });

    it('should be able to switch between different environment lighting', async () => {
        // Enable NeutralIBL
        const lightingConfig: LightingConfig = {
            NeutralIBL: {
                type: 'env',
                enable: true,
                filePath: 'public/ibl/Neutral.env',
            },
            DirectionalIBL: {
                type: 'env',
                enable: false,
                filePath: 'public/ibl/Directional_colorVariationOnTopBlur100_512.env',
            },
        };
        await lighting?.updateLighting(lightingConfig);
        expect(scene?.environmentTexture?.name).toEqual('NeutralIBL');

        // Disable NeutralIBL and enable DirectionalIBL
        lightingConfig.NeutralIBL.enable = false;
        lightingConfig.DirectionalIBL.enable = true;
        await lighting?.updateLighting(lightingConfig);
        expect(scene?.environmentTexture?.name).toEqual('DirectionalIBL');
    });

    it('should be able to create and remove ambient light', async () => {
        // Create ambient light
        const lightingConfig: LightingConfig = {
            AmbientLight: {
                type: 'ambient',
            },
        };
        await lighting?.updateLighting(lightingConfig);
        expect(scene?.getLightByName('AmbientLight')?.name).toEqual('AmbientLight');

        // Remove ambient light
        lightingConfig.AmbientLight.enable = false;
        await lighting?.updateLighting(lightingConfig);
        expect(scene?.getLightByName('AmbientLight')).toBeFalsy();
    });

    it('should be able to create and remove directional light', async () => {
        // Create directional light
        const lightingConfig: LightingConfig = {
            DirectionalLight: {
                type: 'directional',
            },
        };
        await lighting?.updateLighting(lightingConfig);
        expect(scene?.getLightByName('DirectionalLight')?.name).toEqual('DirectionalLight');

        // Remove directional light
        lightingConfig.DirectionalLight.enable = false;
        await lighting?.updateLighting(lightingConfig);
        expect(scene?.getLightByName('DirectionalLight')).toBeFalsy();
    });

    it('should be able to rotate light', async () => {
        const lightingConfig: LightingConfig = {
            NeutralIBL: {
                type: 'env',
                enable: true,
                filePath: 'public/ibl/Neutral.env',
                textureMatrix: Matrix.RotationY(90),
            },
        };

        await lighting?.updateLighting(lightingConfig);

        expect(scene?.environmentTexture?.name).toEqual('NeutralIBL');
        expect(scene?.environmentTexture?.getReflectionTextureMatrix().asArray()).toEqual(
            Matrix.RotationY(90).asArray(),
        );
    });

    it('should throw error if EnvironmentProperty.filePath is empty or undefined', async () => {
        const lightingConfig: LightingConfig = {
            NeutralIBL: {
                type: 'env',
                filePath: '',
            },
        };

        await expect(lighting?.updateLighting(lightingConfig)).rejects.toThrow(Error);
    });
});
