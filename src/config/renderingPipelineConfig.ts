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
 * Define different types of rendering pipeline
 */
export interface RenderingPipelineConfig {
    /**
     * Default rendering pipeline configuration.
     *
     * The default rendering pipeline can be added to a scene to apply common
     * post-processing effects such as anti-aliasing or depth of field.
     */
    defaultRenderingPipeline?: {
        /**
         * Whether to enable the rendering pipeline
         * @default true
         */
        enable?: boolean;

        /**
         * Image post-processing pass used to perform operations
         */
        imageProcessing?: {
            /**
             * Whether to enable image post-processing
             * @default true
             */
            enable?: boolean;

            /**
             * Contrast used in the effect
             * @default 1
             */
            contrast?: number;

            /**
             * Exposure used in the effect
             * @default 1
             */
            exposure?: number;

            /**
             * Enable tone mapping
             * @default false
             */
            toneMappingEnabled?: boolean;

            /**
             * Tone mapping type
             * 0: Standard
             * 1: ACES
             * 2: Khronos PBR Neutral
             * @default 0
             */
            toneMappingType?: 0 | 1 | 2;
        };

        /**
         * MSAA sample count, setting this to 4 will provide 4x anti aliasing
         * @default 1
         */
        samples?: number;

        /**
         * Fast Approximate Anti-aliasing (FXAA) uses a full screen pass that smooths
         * edges on a per-pixel level.
         * @default false
         */
        fxaaEnabled?: boolean;
    };

    /**
     * SSAO2 rendering pipeline configuration.
     *
     * This rendering pipeline can be added to a scene to apply
     * post-processing effects such as Squared Space Ambient Occlusion (SSAO).
     * Note: only available with WebGL2.
     */
    ssao2RenderingPipeline?: {
        /**
         * Whether to enable the rendering pipeline.
         * @default false
         */
        enable?: boolean;

        /**
         * The size of the post-processes is a number shared between passes or for more
         * precision modify ssaoRatio, blurRatio, and combineRatio.
         * @default 0.5
         */
        ratio?: number;

        /**
         * ratio of the SSAO post-process used. Is more specific than the generic ratio placeholder
         * Note: all 3 ssaoRatio & blurRatio & combineRatio must be configured for this to apply.
         * @default undefined
         */
        ssaoRatio?: number;

        /**
         * A horizontal and vertical Gaussian shader blur to clear the noise.
         * Note: all 3 ssaoRatio & blurRatio & combineRatio must be configured for this to apply.
         * @default undefined
         */
        blurRatio?: number;

        /**
         * Ratio of the combine post-process (combines the SSAO and the scene.
         * Note: all 3 ssaoRatio & blurRatio & combineRatio must be configured for this to apply.
         * @default undefined
         */
        combineRatio?: number;

        /**
         * A legacy geometry buffer renderer.
         * @default false
         */
        forceGeometryBuffer?: boolean;

        /**
         * Number of samples to use for antialiasing, setting this to 4 will provide 4x anti aliasing.
         * @default 1
         */
        textureSamples?: number;

        /**
         * Number of samples used for the SSAO calculations.
         * @default 1
         */
        samples?: number;

        /**
         * Enables the configurable bilateral de-noising (blurring) filter.
         * Set false to instead use a legacy bilateral filter that can't be configured.
         * @default true
         */
        expensiveBlur?: boolean;
    };
}
