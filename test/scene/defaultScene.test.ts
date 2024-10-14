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

import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Logger } from '@babylonjs/core/Misc/logger';
import { Tools } from '@babylonjs/core/Misc/tools';
import { Nullable } from '@babylonjs/core/types';
import { jest } from '@jest/globals';

import { Config } from '../../src/config/config';
import { DEFAULT_CONFIG } from '../../src/config/preset/defaultConfig';
import { DefaultScene } from '../../src/scene/defaultScene';

Logger.LogLevels = Logger.ErrorLogLevel;

describe('DefaultScene', () => {
    let defaultScene: Nullable<DefaultScene> = null;
    const lightingData = 'data;,' + fs.readFileSync('public/ibl/Neutral.env').toString('base64');

    beforeEach(() => {
        const presetConfig: Config = {
            '3dCommerceCertified': true,
            engineConfig: {
                useNullEngine: true,
            },
            enableDragAndDrop: true,
            sceneConfig: {
                useLoadingUI: true,
            },
            lightingConfig: {
                Neutral: {
                    type: 'env',
                    enable: false,
                },
            },
        };
        defaultScene = new DefaultScene(null, presetConfig);
    });

    afterEach(() => {
        defaultScene?.dispose();
    });

    test('init', async () => {
        await defaultScene?.init();

        expect(defaultScene?.engine).toBeTruthy();
        expect(defaultScene?.scene).toBeTruthy();
        expect(defaultScene?.sceneManager).toBeTruthy();
        expect(defaultScene?.config).toBeTruthy();
        expect(defaultScene?.observableManager).toBeTruthy();
        expect(defaultScene?.canvas).toBeFalsy();
    });

    test('should use DEFAULT_CONFIG if presetConfig is not provided', async () => {
        defaultScene = new DefaultScene(null);

        expect((defaultScene as any)._initialConfig).toEqual(DEFAULT_CONFIG);
    });

    test('updateConfig', async () => {
        await defaultScene?.init();

        await defaultScene?.updateConfig({
            lightingConfig: {
                DirectionalLight: {
                    type: 'directional',
                },
            },
        });

        expect(defaultScene?.scene.getLightByName('DirectionalLight')).toBeTruthy();
    });

    test('loadGltf', async () => {
        await defaultScene?.init();
        const data = fs.readFileSync('public/model/mannequin.glb').toString('base64');

        await defaultScene?.loadGltf(`data:model/gltf-binary;base64,${data}`, true);

        expect(defaultScene?.sceneManager.models.size).toBe(1);
    });

    test('loadGltfFromFiles', async () => {
        await defaultScene?.init();
        const data = fs.readFileSync('public/model/mannequin.glb');
        const blob = new Blob([data.buffer]);
        const file = new File([blob], 'mannequin.glb');

        defaultScene?.loadGltfFromFiles([file]);

        await new Promise((resolve) => setTimeout(resolve, 2000));
        expect(defaultScene?.sceneManager.models.size).toBe(1);
    });

    it('should invoke Tools.CreateScreenshotAsync() when usingRenderTarget is false', async () => {
        const mockCreateScreenshot = jest.fn<typeof Tools.CreateScreenshotAsync>();
        const mockCreateScreenshotUsingRenderTarget = jest.fn<typeof Tools.CreateScreenshotUsingRenderTargetAsync>();
        Tools.CreateScreenshotAsync = mockCreateScreenshot;
        Tools.CreateScreenshotUsingRenderTargetAsync = mockCreateScreenshotUsingRenderTarget;
        await defaultScene?.init();

        await defaultScene!.takeScreenshot(600, false);

        expect(mockCreateScreenshot).toHaveBeenCalledTimes(1);
        expect(mockCreateScreenshotUsingRenderTarget).toHaveBeenCalledTimes(0);
    });

    it('should invoke Tools.CreateScreenshotUsingRenderTargetAsync() when usingRenderTarget is true', async () => {
        const mockCreateScreenshot = jest.fn<typeof Tools.CreateScreenshotAsync>();
        const mockCreateScreenshotUsingRenderTarget = jest.fn<typeof Tools.CreateScreenshotUsingRenderTargetAsync>();
        Tools.CreateScreenshotAsync = mockCreateScreenshot;
        Tools.CreateScreenshotUsingRenderTargetAsync = mockCreateScreenshotUsingRenderTarget;
        await defaultScene?.init();

        await defaultScene!.takeScreenshot(600, true);

        expect(mockCreateScreenshot).toHaveBeenCalledTimes(0);
        expect(mockCreateScreenshotUsingRenderTarget).toHaveBeenCalledTimes(1);
    });

    test('toggleLighting', async () => {
        await defaultScene?.init();
        await defaultScene?.updateConfig({
            lightingConfig: {
                NeutralIBL: {
                    type: 'env',
                    enable: true,
                    filePath: lightingData,
                },
            },
        });

        // Turn off NeutralIBL
        defaultScene?.toggleLighting('NeutralIBL', false);
        expect(defaultScene?.scene.environmentTexture).toBeFalsy();

        // Turn on NeutralIBL
        defaultScene?.toggleLighting('NeutralIBL', true);
        expect(defaultScene?.scene.environmentTexture).toBeTruthy();
    });

    test('zoomOnModels', async () => {
        await defaultScene?.init();
        await defaultScene?.updateConfig({
            cameraConfig: {
                ArcRotateCamera: {
                    type: 'arcRotateCamera',
                    enable: true,
                    framingBehavior: {
                        enabled: true,
                    },
                },
            },
        });
        const camera = defaultScene?.scene.activeCamera as ArcRotateCamera;
        const initCameraRadius = camera.radius;
        const data = fs.readFileSync('public/model/mannequin.glb').toString('base64');
        const model = await defaultScene?.loadGltf(`data:model/gltf-binary;base64,${data}`, true);

        defaultScene?.zoomOnModelsWithFramingBehavior([model!]);

        expect(camera.radius).not.toBe(initCameraRadius);
    });

    test('get camera by name', async () => {
        await defaultScene?.init();
        await defaultScene?.updateConfig({
            cameraConfig: {
                ArcRotateCamera: {
                    type: 'arcRotateCamera',
                    enable: true,
                },
            },
        });
        const camera = defaultScene?.getCamera('ArcRotateCamera');

        expect(camera).toBe(defaultScene?.scene.activeCamera);
    });
});
