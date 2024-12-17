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

import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

import { CameraConfig } from '../cameraConfig';
import { Config } from '../config';
import { LightingConfig } from '../lightingConfig';

export const DEFAULT_LIGHTING: LightingConfig = {
    Neutral: {
        type: 'env',
        enable: true,
        filePath: 'public/ibl/Neutral.env',
        gammaSpace: false,
        intensity: 2.4,
    },
};

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
    ArcRotateCamera: {
        type: 'arcRotateCamera',
        attachControl: true,
        enable: true,
        target: Vector3.Zero(),
        alphaInDegrees: 90,
        betaInDegrees: 90,
        radius: 1,
        wheelPrecision: 1000,
        pinchPrecision: 1000,
        angularSensibilityX: 2000,
        angularSensibilityY: 2000,
        panningSensibility: 3000,
        lowerRadiusLimit: 0.4,
        upperRadiusLimit: 10,
        inertia: 0.9,
        fovInDegrees: 45,
        minZ: 0.1,
        maxZ: 100,
        animationDuration: 0,
        lowerBetaLimitInDegrees: 0.01,
        upperBetaLimitInDegrees: 179.99,
    },
};

export const DEFAULT_CONFIG: Config = {
    '3dCommerceCertified': true,

    cameraConfig: DEFAULT_CAMERA_CONFIG,

    enableDragAndDrop: true,

    engineConfig: {
        antialiasing: true,
        disableResize: false,
        engineOptions: {
            disableWebGL2Support: false,
        },
    },

    lightingConfig: DEFAULT_LIGHTING,

    sceneConfig: {
        clearColor: Color4.FromColor3(Color3.White()),
    },
};
