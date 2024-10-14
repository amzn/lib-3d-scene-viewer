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

import { CubicEase } from '@babylonjs/core/Animations/easing';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '@babylonjs/core/Misc/logger';
import { Scene } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';

import { Camera } from '../../src/camera/camera';
import { CameraConfig } from '../../src/config/cameraConfig';
import { ObservableManager } from '../../src/manager/observableManager';
import { SceneManager } from '../../src/manager/sceneManager';

Logger.LogLevels = Logger.ErrorLogLevel;

describe('Camera', () => {
    let engine: Nullable<NullEngine> = null;
    let scene: Nullable<Scene> = null;
    let sceneManager: Nullable<SceneManager> = null;
    let observableManager: Nullable<ObservableManager> = null;
    let camera: Nullable<Camera> = null;

    beforeEach(async () => {
        engine = new NullEngine();
        scene = new Scene(engine);
        observableManager = new ObservableManager();
        sceneManager = new SceneManager(engine, {}, observableManager);
        await sceneManager.createScene(scene);
        sceneManager.runRenderLoop();
        camera = new Camera(sceneManager, observableManager);
    });

    afterEach(() => {
        camera?.dispose();
        sceneManager?.dispose();
        observableManager?.dispose();
        engine?.dispose();
    });

    it('should do nothing if no camera settings in CameraConfig', async () => {
        const defaultCameraName = scene?.activeCamera?.name;
        const cameraConfig: CameraConfig = {};

        await camera?.updateCameras(cameraConfig);

        expect(scene?.activeCamera?.name).toBe(defaultCameraName);
    });

    it('should be able to create and remove a camera', async () => {
        // Create a camera
        const cameraConfig: CameraConfig = {
            NewArcRotateCamera: {
                type: 'arcRotateCamera',
                target: Vector3.One(),
                alphaInDegrees: 60,
                minimizeRotation: true,
                animationDuration: 0.5,
                cameraAnimationConfig: {
                    easingFunction: new CubicEase(),
                    easingMode: 'EASINGMODE_EASEINOUT',
                    loopMode: 'ANIMATIONLOOPMODE_CONSTANT',
                    maxFPS: 60,
                },
                autoRotationBehavior: {
                    enabled: true,
                },
                framingBehavior: {
                    enabled: true,
                },
            },
        };
        await camera?.updateCameras(cameraConfig);
        expect(scene?.activeCamera?.name).toEqual('NewArcRotateCamera');
        expect((scene?.activeCamera as ArcRotateCamera).useAutoRotationBehavior).toBeTruthy();
        expect((scene?.activeCamera as ArcRotateCamera).useFramingBehavior).toBeTruthy();

        // Remove a camera
        cameraConfig.NewArcRotateCamera.enable = false;
        await camera?.updateCameras(cameraConfig);
        expect(scene?.getCameraByName('NewArcRotateCamera')).toBeFalsy();
    });

    test('willAddOrRemoveCameras', async () => {
        const cameraConfig: CameraConfig = {
            NewArcRotateCamera: {
                type: 'arcRotateCamera',
                enable: true,
            },
        };

        // Will add camera
        let willAddOrRemoveCameras = camera?.willAddOrRemoveCameras(cameraConfig);
        expect(willAddOrRemoveCameras).toBe(true);

        // Camera already added
        await camera?.updateCameras(cameraConfig);
        willAddOrRemoveCameras = camera?.willAddOrRemoveCameras(cameraConfig);
        expect(willAddOrRemoveCameras).toBe(false);

        // Will remove camera
        cameraConfig.NewArcRotateCamera.enable = false;
        willAddOrRemoveCameras = camera?.willAddOrRemoveCameras(cameraConfig);
        expect(willAddOrRemoveCameras).toBe(true);
    });
});
