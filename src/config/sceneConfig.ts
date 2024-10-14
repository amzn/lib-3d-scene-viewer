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

/**
 * Scene configuration
 */
export interface SceneConfig {
    /**
     * Color of the bounding box lines placed in front of an object
     * @default '#EBA832'
     */
    boundingBoxFrontColor?: Color3;

    /**
     * Color of the bounding box lines placed behind an object
     * @default Color3(1, 0, 1)
     */
    boundingBoxBackColor?: Color3;

    /**
     * Defines the color used to clear the render buffer
     * @default Color4(1, 1, 1, 1)
     */
    clearColor?: Color4;

    /**
     * Whether to display the loading UI when loading a model
     * @default false
     */
    useLoadingUI?: boolean;

    /**
     * The logo url to use for the loading screen
     * @default 1 pixel (alpha = 0) base64 data
     */
    loadingUILogoUrl?: string;

    /**
     * The spinner url to use for the loading screen
     * @default 1 pixel (alpha = 0) base64 data
     */
    loadingUISpinnerUrl?: string;
}
