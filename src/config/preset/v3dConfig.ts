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
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Tools } from '@babylonjs/core/Misc/tools';

import { CameraConfig } from '../cameraConfig';
import { Config } from '../config';
import { LightingConfig } from '../lightingConfig';

export const V3D_LIGHTING: LightingConfig = {
    DirectionalBlur: {
        type: 'env',
        enable: true,
        gammaSpace: false,
        filePath: 'public/ibl/Directional_colorVariationOnTopBlur100_512.env',
        intensity: 1.6,
        textureMatrix: Matrix.RotationY(Tools.ToRadians(344)),
    },
};

export const V3D_DEFAULT_CAMERA_CONFIG: CameraConfig = {
    ArcRotateCamera: {
        type: 'arcRotateCamera',
        attachControl: true,
        enable: true,
        target: Vector3.Zero(),
        alphaInDegrees: Tools.ToDegrees(2.5),
        betaInDegrees: Tools.ToDegrees(0.975),
        radius: 0.8,
        wheelPrecision: 1000,
        pinchPrecision: 800,
        angularSensibilityX: 850,
        angularSensibilityY: 850,
        panningSensibility: 0,
        lowerRadiusLimit: 0.4,
        upperRadiusLimit: 1.2,
        inertia: 0.85,
        fovInDegrees: 45,
        minZ: 0.1,
        maxZ: 100,
    },
};

export const V3D_CONFIG: Config = {
    '3dCommerceCertified': true,

    basisTranscoder: {
        urlConfig: {
            jsModuleUrl: 'public/js/basis/basis_transcoder.js',
            wasmModuleUrl: 'public/js/basis/basis_transcoder.wasm',
        },
    },

    cameraConfig: V3D_DEFAULT_CAMERA_CONFIG,

    dracoCompression: {
        decoders: {
            wasmBinaryUrl: 'public/js/draco/draco_decoder_gltf.wasm',
            wasmUrl: 'public/js/draco/draco_decoder_gltf_nodejs.js',
            fallbackUrl: 'public/js/draco/draco_decoder_gltf.js',
        },
    },

    enableDragAndDrop: false,

    engineConfig: {
        antialiasing: true,
        disableResize: false,
        engineOptions: {
            disableWebGL2Support: false,
        },
    },

    ktx2Decoder: {
        urlConfig: {
            jsDecoderModule: 'public/js/ktx2/babylon.ktx2Decoder.js',
            jsMSCTranscoder: 'public/js/ktx2/msc_basis_transcoder.js',
            wasmMSCTranscoder: 'public/js/ktx2/msc_basis_transcoder.wasm',
            wasmUASTCToASTC: 'public/js/ktx2/uastc_astc.wasm',
            wasmUASTCToBC7: 'public/js/ktx2/uastc_bc7.wasm',
            wasmUASTCToR8_UNORM: null,
            wasmUASTCToRG8_UNORM: null,
            wasmUASTCToRGBA_SRGB: 'public/js/ktx2/uastc_rgba8_srgb_v2.wasm',
            wasmUASTCToRGBA_UNORM: 'public/js/ktx2/uastc_rgba8_unorm_v2.wasm',
            wasmZSTDDecoder: 'public/js/ktx2/zstddec.wasm',
        },
    },

    lightingConfig: V3D_LIGHTING,

    meshoptCompression: {
        decoder: {
            url: 'public/js/meshopt/meshopt_decoder.js',
        },
    },

    renderingPipelineConfig: {
        defaultRenderingPipeline: {
            enable: true,
            fxaaEnabled: true,
            samples: 8,
            imageProcessing: {
                enable: true,
                contrast: 1,
                exposure: 1,
                toneMappingEnabled: true,
                toneMappingType: 2,
            },
        },
    },

    sceneConfig: {
        clearColor: Color4.FromColor3(new Color3(0.95, 0.95, 0.95)),
        useLoadingUI: false,
    },
};
