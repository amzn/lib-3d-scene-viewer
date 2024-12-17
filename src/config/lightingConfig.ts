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

import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';

/**
 * Base properties of all types of lighting
 */
export interface LightingBaseProperty {
    /**
     * Whether to enable the light
     * @default true
     */
    enable?: boolean;

    /**
     * Strength of the light
     * @default 1
     */
    intensity?: number;
}

/**
 * Environment texture properties
 */
export interface EnvironmentProperty extends LightingBaseProperty {
    /**
     * Local file path or URL of the texture map
     */
    filePath?: string;

    /**
     * Define if the texture contains data in gamma space (most of the png/jpg aside bump).
     * HDR texture are usually stored in linear space.
     * @default true
     */
    gammaSpace?: boolean;

    /**
     * The cubemap desired size (the more it increases the longer the generation will be).
     * Only for .hdr file.
     * @default 128
     */
    size?: number;

    /**
     * Texture matrix includes the requested offsetting, tiling and rotation components
     * @default Matrix.Identity()
     */
    textureMatrix?: Matrix;

    /**
     * File extension, either '.hdr' or '.env'
     */
    type: 'hdr' | 'env';
}

/**
 * Hemispheric (ambient) light properties
 */
export interface AmbientLightProperty extends LightingBaseProperty {
    /**
     * The light reflection direction, not the incoming direction
     * @default Vector3(0, 0, -1)
     */
    direction?: Vector3;

    /**
     * Diffuse gives the basic color to an object
     * @default Color3.White
     */
    diffuseColor?: Color3;

    /**
     * Specular produces a highlight color on an object
     *
     * Note: This is not affecting PBR materials
     * @default Color3.Black
     */
    specularColor?: Color3;

    /**
     * Type of light, must be 'ambient'
     */
    type: 'ambient';
}

/**
 * Directional light properties
 */
export interface DirectionalLightProperty extends LightingBaseProperty {
    /**
     * The light direction of directional light
     * @default Vector3(0, 0, -1)
     */
    direction?: Vector3;

    /**
     * Diffuse gives the basic color to an object
     * @default Color3.White
     */
    diffuseColor?: Color3;

    /**
     * Specular produces a highlight color on an object
     *
     * Note: This is not affecting PBR materials
     * @default Color3.White
     */
    specularColor?: Color3;

    /**
     * Type of light, must be 'directional'
     */
    type: 'directional';
}

/**
 * A super set of different kinds of light property
 */
export type LightingProperty = EnvironmentProperty | AmbientLightProperty | DirectionalLightProperty;

/**
 * The Lighting Configuration groups the different settings of lights.
 *
 * Each light is defined in key-value pair, where key is the light name and value is {@link LightingProperty}.
 *
 * Note: Key must be unique
 */
export interface LightingConfig {
    [lightingName: string]: LightingProperty;
}
