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

import { Nullable } from '@babylonjs/core/types';

import { Config } from '../config/config';
import { DEFAULT_CONFIG } from '../config/preset/defaultConfig';

import { AbstractScene } from './abstractScene';

/**
 * DefaultScene for general use-cases
 */
class DefaultScene extends AbstractScene {
    /**
     * Instantiate a new {@link DefaultScene}
     * @param canvas - defines the canvas to use for rendering. If NullEngine is used, set the canvas as null.
     * @param presetConfig - pre-defined configuration. By default, use {@link DEFAULT_CONFIG}.
     * @param configOverride - used to override parameters in pre-defined configuration
     */
    public constructor(
        canvas: Nullable<HTMLCanvasElement>,
        presetConfig: Config = DEFAULT_CONFIG,
        configOverride: Config = {},
    ) {
        super(canvas, presetConfig, configOverride);
    }
}

export { DefaultScene };
