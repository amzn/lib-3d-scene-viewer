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

import { Animation } from '@babylonjs/core/Animations/animation';
import {
    BackEase,
    BezierCurveEase,
    BounceEase,
    CircleEase,
    CubicEase,
    ElasticEase,
    ExponentialEase,
    PowerEase,
    QuadraticEase,
    QuarticEase,
    QuinticEase,
    SineEase,
} from '@babylonjs/core/Animations/easing';

/**
 * @see https://doc.babylonjs.com/typedoc/classes/BABYLON.Animation#ANIMATIONLOOPMODE_CONSTANT
 */
export type AnimationLoopMode = 'ANIMATIONLOOPMODE_RELATIVE' | 'ANIMATIONLOOPMODE_CYCLE' | 'ANIMATIONLOOPMODE_CONSTANT';

/**
 * @see https://doc.babylonjs.com/typedoc/classes/BABYLON.EasingFunction#EASINGMODE_EASEIN
 */
export type EasingMode = 'EASINGMODE_EASEIN' | 'EASINGMODE_EASEOUT' | 'EASINGMODE_EASEINOUT';

/**
 * @see https://doc.babylonjs.com/typedoc/classes/BABYLON.EasingFunction
 */
export type EasingFunction =
    | CircleEase
    | BackEase
    | BounceEase
    | CubicEase
    | ElasticEase
    | ExponentialEase
    | PowerEase
    | QuadraticEase
    | QuarticEase
    | QuinticEase
    | SineEase
    | BezierCurveEase;

/**
 * Camera animatable property type
 */
export type CAMERA_ANIMATABLE_PROPERTY = 'fov' | 'target' | 'alpha' | 'beta' | 'radius';

/**
 * Mapping of the type of change for each animatable property
 */
export const CAMERA_ANIMATION_TYPE_MAP: Record<CAMERA_ANIMATABLE_PROPERTY, number> = {
    fov: Animation.ANIMATIONTYPE_FLOAT,
    target: Animation.ANIMATIONTYPE_VECTOR3,
    alpha: Animation.ANIMATIONTYPE_FLOAT,
    beta: Animation.ANIMATIONTYPE_FLOAT,
    radius: Animation.ANIMATIONTYPE_FLOAT,
};

/**
 * The Camera Animation Configuration groups the different settings used to define the camera animation behavior
 */
export interface CameraAnimationConfig {
    /**
     * A custom mathematical formula for animation
     * @default {@link https://doc.babylonjs.com/typedoc/classes/BABYLON.CubicEase CubicEase}
     */
    easingFunction: EasingFunction;

    /**
     * The easing mode of the easing function
     * @default {@link https://doc.babylonjs.com/typedoc/classes/BABYLON.EasingFunction#EASINGMODE_EASEINOUT EASINGMODE_EASEINOUT}
     */
    easingMode: EasingMode;

    /**
     * The loop mode of the animation
     * @default {@link https://doc.babylonjs.com/typedoc/classes/BABYLON.Animation#ANIMATIONLOOPMODE_CONSTANT ANIMATIONLOOPMODE_CONSTANT}
     */
    loopMode: AnimationLoopMode;

    /**
     * The frames per second of the animation
     * @default 60
     */
    maxFPS: number;
}

/**
 * Default camera animation configuration
 */
export const DEFAULT_CAMERA_ANIMATION_CONFIG: CameraAnimationConfig = {
    easingFunction: new CubicEase(),
    easingMode: 'EASINGMODE_EASEINOUT',
    loopMode: 'ANIMATIONLOOPMODE_CONSTANT',
    maxFPS: 60,
};
