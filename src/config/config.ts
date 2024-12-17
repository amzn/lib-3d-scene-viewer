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

import { EngineOptions } from '@babylonjs/core/Engines/thinEngine';

import { CameraConfig } from './cameraConfig';
import { ExtensionConfig } from './extensionConfig';
import { LightingConfig } from './lightingConfig';
import { RenderingPipelineConfig } from './renderingPipelineConfig';
import { SceneConfig } from './sceneConfig';

/**
 * Hold all configurable parameters for the viewer
 */
export interface Config {
    /**
     * Whether to enable 3D Commerce Certified Viewer
     * @see https://doc.babylonjs.com/setup/support/3D_commerce_certif
     * @default true
     */
    '3dCommerceCertified'?: boolean;

    /**
     * Basis transcoder configuration
     * @see https://doc.babylonjs.com/typedoc/modules/BABYLON#BasisToolsOptions
     */
    basisTranscoder?: {
        /**
         * Define where to find transcoder files. It can be an external URL or a local file path.
         * @default empty string for all urls
         */
        urlConfig?: {
            jsModuleUrl?: string;
            wasmModuleUrl?: string;
        };
    };

    /**
     * Camera configuration
     * @default create an ArcRotateCamera with alpha = 0, beta = 0, radius = 1, and target = Vector3.Zero
     */
    cameraConfig?: CameraConfig;

    /**
     * Draco compression configuration
     * @see https://doc.babylonjs.com/typedoc/classes/BABYLON.DracoCompression
     */
    dracoCompression?: {
        /**
         * Define where to find decoders. It can be an external URL or a local file path.
         * @default empty string for all urls
         */
        decoders?: {
            wasmUrl?: string;
            wasmBinaryUrl?: string;
            fallbackUrl?: string;
        };

        /**
         * Default number of workers to create when creating the draco compression object
         * @default defer to babylon.js
         */
        defaultNumWorkers?: number;
    };

    /**
     * Extension configuration
     */
    extensionConfig?: ExtensionConfig;

    /**
     * Whether to enable drag and drop feature.
     * When enabled, users are able to drag and drop their local model files to the viewer.
     * @default false
     */
    enableDragAndDrop?: boolean;

    /**
     * Engine configuration
     */
    engineConfig?: {
        /**
         * Whether to enable antialiasing
         * @default true
         */
        antialiasing?: boolean;

        /**
         * Whether to disable handling 'resize' event
         * @default false
         */
        disableResize?: boolean;

        /**
         * Interface defining initialization parameters for Engine class
         */
        engineOptions?: EngineOptions;

        /**
         * Whether to use NullEngine which provides support for headless version of babylon.js.
         * This can be used in server side scenario or for testing purposes.
         * @see https://doc.babylonjs.com/typedoc/classes/BABYLON.NullEngine
         * @default false
         */
        useNullEngine?: boolean;
    };

    /**
     * Khronos Texture Extension 2 (KTX2) decoder configuration
     * @see https://doc.babylonjs.com/typedoc/classes/BABYLON.KhronosTextureContainer2
     */
    ktx2Decoder?: {
        /**
         * Define where to find decoders. It can be an external URL or a local file path.
         * @default empty string or null for all urls
         */
        urlConfig?: {
            jsDecoderModule: string;
            jsMSCTranscoder: string | null;
            wasmMSCTranscoder: string | null;
            wasmUASTCToASTC: string | null;
            wasmUASTCToBC7: string | null;
            wasmUASTCToR8_UNORM: string | null;
            wasmUASTCToRG8_UNORM: string | null;
            wasmUASTCToRGBA_SRGB: string | null;
            wasmUASTCToRGBA_UNORM: string | null;
            wasmZSTDDecoder: string | null;
        };

        /**
         * Default number of workers used to handle data decoding
         * @default defer to babylon.js
         */
        defaultNumWorkers?: number;
    };

    /**
     * Lighting configuration
     */
    lightingConfig?: LightingConfig;

    /**
     * Meshopt compression configuration
     * @see https://doc.babylonjs.com/typedoc/classes/BABYLON.MeshoptCompression
     */
    meshoptCompression?: {
        /**
         * Define where to find decoder file. It can be an external URL or a local file path.
         * @default empty string for all urls
         */
        decoder?: {
            url: string;
        };
    };

    /**
     * Rendering pipeline configuration
     */
    renderingPipelineConfig?: RenderingPipelineConfig;

    /**
     * Scene configuration
     */
    sceneConfig?: SceneConfig;
}
