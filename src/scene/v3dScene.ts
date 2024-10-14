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

import { Engine } from '@babylonjs/core/Engines/engine';
import { Nullable } from '@babylonjs/core/types';

import { Config } from '../config/config';
import { V3D_CONFIG } from '../config/preset/v3dConfig';

import { AbstractScene } from './abstractScene';

/**
 * V3DScene is used by View-in-3D viewer
 */
export class V3DScene extends AbstractScene {
    /**
     * Instantiate a new {@link V3DScene}
     * @param canvas - defines the canvas to use for rendering. If NullEngine is used, set the canvas as null.
     * @param presetConfig - pre-defined configuration. By default, use {@link V3D_CONFIG}.
     * @param configOverride - used to override parameters in pre-defined configuration
     */
    public constructor(
        canvas: Nullable<HTMLCanvasElement>,
        presetConfig: Config = V3D_CONFIG,
        configOverride: Config = {},
    ) {
        super(canvas, presetConfig, configOverride);

        // Override the hardware scaling level
        this.observableManager.onEngineCreatedObservable.add((engine: Engine) => {
            engine.setHardwareScalingLevel((1 / window.devicePixelRatio) * 0.75);
            return Promise.resolve(engine);
        });
    }

    /**
     * Register a callback that will be invoked after camera first interaction
     * @param callback - will be invoked after camera first interaction
     */
    public setOnCameraFirstInteraction(callback: () => void) {
        this.observableManager.onCameraFirstInteractionObservable.addOnce(() => {
            callback();
        });
    }
}
