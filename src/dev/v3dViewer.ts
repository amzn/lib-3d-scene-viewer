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

import '@babylonjs/inspector';
import { CubicEase } from '@babylonjs/core/Animations/easing';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DracoCompression } from '@babylonjs/core/Meshes/Compression/dracoCompression';
import { Tools } from '@babylonjs/core/Misc/tools';

import { CameraConfig } from '../config/cameraConfig';
import { Config } from '../config/config';
import { V3D_CONFIG } from '../config/preset/v3dConfig';
import { AbstractScene } from '../scene/abstractScene';
import { V3DScene } from '../scene/v3dScene';
import './viewer.css';

function createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.id = 'renderCanvas';
    return canvas;
}

function createHelperText(): HTMLDivElement {
    const helperTextDiv = document.createElement('div');
    helperTextDiv.id = 'helperTextDiv';
    helperTextDiv.innerText = [
        '- Drag and drop local GLB/GLTF files to view them',
        '- Press "SHIFT" and "?" to toggle the debug layer',
    ].join('\n');
    return helperTextDiv;
}

/**
 * This file is only for testing/demo purposes
 */
(async function () {
    const canvas = createCanvas();
    const helperTextDiv = createHelperText();
    document.body.appendChild(canvas);
    document.body.appendChild(helperTextDiv);

    // --> Step 1: create an instance of V3DScene
    const v3dScene = new V3DScene(canvas, V3D_CONFIG, {
        enableDragAndDrop: true,
        sceneConfig: {
            useLoadingUI: true,
        },
    });

    // --> Step 2: register any observers using V3DScene.observableManager

    // Set camera first interaction callback
    v3dScene.setOnCameraFirstInteraction(() => {
        console.log('CameraFirstInteraction');
    });

    v3dScene.observableManager.onViewerInitDoneObservable.add((viewer: AbstractScene) => {
        if (!viewer) {
            return;
        }

        console.log(`HardwareScalingLevel: ${viewer.engine.getHardwareScalingLevel()}`);
        console.log(DracoCompression.Configuration);
    });

    v3dScene.observableManager.onConfigChangedObservable.add((config: Config) => {
        console.log(config);
    });

    v3dScene.observableManager.onModelLoadedObservable.add((model) => {
        console.log(`Bounding box dimensions: ${model.getOverallBoundingBoxDimensions()}`);

        model.showShadowOnGroundDepthMap();
        model.moveCenterToTargetCoordinate();

        const radius = 2 * Math.max(...model.getOverallBoundingBoxDimensions().asArray());
        v3dScene.updateConfig({
            cameraConfig: {
                ArcRotateCamera: {
                    type: 'arcRotateCamera',
                    radius: radius,
                    lowerRadiusLimit: radius * 0.05,
                    upperRadiusLimit: radius * 5,
                    minZ: radius * 0.02,
                    maxZ: radius * 40,
                },
            },
        });
    });

    // --> Step 3: call V3DScene.init() function
    await v3dScene.init();

    // --> Step 4: load glTF/glb model
    const model = await v3dScene.loadGltf('public/model/mannequin.glb', true);

    // --> Step 5: call V3DScene.updateConfig() to update scene setup and/or handle user interactions
    const radius = 2 * Math.max(...model.getOverallBoundingBoxDimensions().asArray());
    const alphaInDegrees = Tools.ToDegrees(2.5);
    const cameraConfigPre: CameraConfig = {
        ArcRotateCamera: {
            type: 'arcRotateCamera',
            enable: true,
            attachControl: true,
            target: Vector3.Zero(),
            alphaInDegrees: alphaInDegrees + 360,
            betaInDegrees: Tools.ToDegrees(0.975),
            lowerBetaLimitInDegrees: Tools.ToDegrees(0.01),
            upperBetaLimitInDegrees: Tools.ToDegrees(3.132),
            radius: radius,
            lowerRadiusLimit: radius * 0.05,
            upperRadiusLimit: radius * 5,
            minZ: radius * 0.02,
            maxZ: radius * 40,
            animationDuration: 0,
            minimizeRotation: false,
        },
    };

    const cameraConfig: CameraConfig = {
        ArcRotateCamera: {
            type: 'arcRotateCamera',
            alphaInDegrees: alphaInDegrees,
            animationDuration: 2,
            cameraAnimationConfig: {
                easingFunction: new CubicEase(),
                easingMode: 'EASINGMODE_EASEINOUT',
                loopMode: 'ANIMATIONLOOPMODE_CONSTANT',
                maxFPS: 60,
            },
        },
    };

    await v3dScene.updateConfig({
        cameraConfig: cameraConfigPre,
    });
    await v3dScene.updateConfig({
        cameraConfig: cameraConfig,
    });

    // Create keystroke tests
    document.addEventListener('keydown', async (event) => {
        const key = event.key;
        // Pressing '?' should show/hide the debug layer
        if (key === '?') {
            v3dScene.toggleDebugMode();
        }
    });
})();
