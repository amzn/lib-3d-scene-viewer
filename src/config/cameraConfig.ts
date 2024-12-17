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

import { Vector3 } from '@babylonjs/core/Maths/math.vector';

import { CameraAnimationConfig } from './cameraAnimationConfig';

/**
 * A list of camera property that does not belong to
 * animatable property, special animatable property, and non-animatable property
 */
export const CAMERA_PROPERTIES_TO_IGNORE_DURING_EXTRACTION: Array<string> = [
    'attachControl',
    'autoRotationBehavior',
    'cameraAnimationConfig',
    'enable',
    'framingBehavior',
    'type',
    'minimizeRotation',
];

/**
 * Arc rotate camera limit property type
 */
export type ArcRotateCameraLimitProperty =
    | 'lowerAlphaLimit'
    | 'upperAlphaLimit'
    | 'lowerBetaLimit'
    | 'upperBetaLimit'
    | 'lowerRadiusLimit'
    | 'upperRadiusLimit';

/**
 * A list of arc rotate camera limit property
 */
export const ARC_ROTATE_CAMERA_LIMIT_PROPERTIES: Array<ArcRotateCameraLimitProperty> = [
    'lowerAlphaLimit',
    'upperAlphaLimit',
    'lowerBetaLimit',
    'upperBetaLimit',
    'lowerRadiusLimit',
    'upperRadiusLimit',
];

/**
 * Arc rotate camera non animatable property type
 */
export type ArcRotateCameraNonAnimatableProperty =
    | ArcRotateCameraLimitProperty
    | 'minZ'
    | 'maxZ'
    | 'wheelPrecision'
    | 'pinchPrecision'
    | 'wheelDeltaPercentage'
    | 'pinchDeltaPercentage'
    | 'angularSensibilityX'
    | 'angularSensibilityY'
    | 'panningSensibility'
    | 'speed'
    | 'panningInertia'
    | 'inertia';

/**
 * Base properties of all types of cameras
 */
export interface CameraBaseProperty {
    /**
     * The amount of time (in seconds) to carry out the animation. 0 means no animation enabled.
     * @default 0
     */
    animationDuration?: number;

    /**
     * Minimize the amount of rotation animation on arcCamera's 'alpha' and 'beta' keys.
     *
     * For alpha and beta values, we want to minimize the amount of rotation in the animation.
     * User interactions can cause the alpha and beta to be arbitrarily large or small and thus
     * cause the camera to spin around an unpredictable amount to reach the desired alpha and beta.
     * We can avoid this by animating to the current alpha(or beta) + the delta angle between the
     * current and desired alphas and betas
     * @default false
     */
    minimizeRotation?: boolean;

    /**
     * The Camera Animation Configuration groups the different settings used to define the camera animation behavior
     * @default {@link DEFAULT_CAMERA_ANIMATION_CONFIG}
     */
    cameraAnimationConfig?: CameraAnimationConfig;

    /**
     * Whether to attach the input controls to a specific dom element to get the input from
     * @default true
     */
    attachControl?: boolean;

    /**
     * Whether to enable the camera
     * @default true
     */
    enable?: boolean;

    /**
     * Field Of View set in Degrees
     * @default 45.84 (i.e. 0.8 in Radians)
     */
    fovInDegrees?: number;

    /**
     * Define the overall inertia of the camera.
     * This helps to give a smooth feeling to the camera movement.
     * @default 0.9
     */
    inertia?: number;

    /**
     * Define the minimum distance the camera can see from
     * @default: 1
     */
    minZ?: number;

    /**
     * Define the maximum distance the camera can see to
     * @default 10000
     */
    maxZ?: number;

    /**
     * Define the current speed of the camera
     * @default 2
     */
    speed?: number;

    /**
     * Defines the target point of the camera.
     * The camera looks towards it form the radius distance.
     * @default Vector3.Zero
     */
    target?: Vector3;
}

/**
 * Arc rotate camera properties
 */
export interface ArcRotateCameraProperty extends CameraBaseProperty {
    /**
     * Type must be 'arcRotateCamera'
     */
    type: 'arcRotateCamera';

    /**
     * Defines the rotation angle of the camera along the longitudinal axis in Degrees
     * @default 0
     */
    alphaInDegrees?: number;

    /**
     * Defines a smooth rotation of an ArcRotateCamera when there is no user interaction
     */
    autoRotationBehavior?: {
        /**
         * Whether to enable ArcRotation camera's autoRotation behavior
         * @default false
         */
        enabled?: boolean;

        /**
         * Speed at which the camera rotates around the mesh
         * @default 1
         */
        idleRotationSpeed?: number;

        /**
         * Time (in milliseconds) to wait after user interaction before the camera starts rotating
         * @default 100
         */
        idleRotationWaitTime?: number;

        /**
         * Time (milliseconds) to take to spin up to the full idle rotation speed
         * @default 100
         */
        idleRotationSpinupTime?: number;

        /**
         * Flag that indicates if user zooming should stop animation
         * @default false
         */
        zoomStopsAnimation?: boolean;
    };

    /**
     * Defines framingBehavior of an ArcRotateCamera.
     * Must be configured before loading models.
     */
    framingBehavior?: {
        /**
         * Whether to enable ArcRotation camera's framing behavior
         * @default false
         */
        enabled?: boolean;

        /**
         * Define the transition time when framing the mesh, in milliseconds
         * @default 0
         */
        framingTime?: number;

        /**
         * Define the scale applied to the radius
         * @default 1
         */
        radiusScale?: number;
    };

    /**
     * Minimum allowed angle on the longitudinal axis in Degrees.
     * This can help limiting how the Camera is able to move in the scene.
     * @default 0
     */
    lowerAlphaLimitInDegrees?: number;

    /**
     * Maximum allowed angle on the longitudinal axis in Degrees.
     * This can help limiting how the Camera is able to move in the scene.
     * @default 0
     */
    upperAlphaLimitInDegrees?: number;

    /**
     * Defines the rotation angle of the camera along the latitudinal axis in Degrees
     * @default 0
     */
    betaInDegrees?: number;

    /**
     * Minimum allowed angle on the latitudinal axis in Degrees.
     * This can help limiting how the Camera is able to move in the scene.
     * @default 0.573 (i.e. 0.01 in Radians)
     */
    lowerBetaLimitInDegrees?: number;

    /**
     * Maximum allowed angle on the latitudinal axis in Degrees.
     * This can help limiting how the Camera is able to move in the scene.
     * @default 179.6 (i.e. 3.1316 in Radians)
     */
    upperBetaLimitInDegrees?: number;

    /**
     * Defines the radius of the camera from it s target point
     * @default 1
     */
    radius?: number;

    /**
     * Minimum allowed distance of the camera to the target (The camera can not get closer).
     * This can help limiting how the Camera is able to move in the scene.
     * @default 0
     */
    lowerRadiusLimit?: number;

    /**
     * Maximum allowed distance of the camera to the target (The camera can not get further).
     * This can help limiting how the Camera is able to move in the scene.
     * @default 0
     */
    upperRadiusLimit?: number;

    /**
     * Control how fast is the camera zooming. The lower, the faster.
     * @default 3
     */
    wheelPrecision?: number;

    /**
     * Control how fast is the camera zooming. The lower, the faster.
     * @default 12
     */
    pinchPrecision?: number;

    /**
     * Control how fast is the camera zooming. The higher, the faster.
     * It will be used instead of wheelPrecision if different from 0.
     * It defines the percentage of current {@link radius} to use as delta when wheel zoom is used.
     * @default 0
     */
    wheelDeltaPercentage?: number;

    /**
     * Control how fast is the camera zooming. The higher, the faster.
     * It will be used instead of pinchPrecision if different from 0.
     * It defines the percentage of current {@link radius} to use as delta when pinch zoom is used.
     * @default 0
     */
    pinchDeltaPercentage?: number;

    /**
     * Control the pointer angular sensibility along the X axis or how fast is the camera rotating
     * @default 1000
     */
    angularSensibilityX?: number;

    /**
     * Control the pointer angular sensibility along the Y axis or how fast is the camera rotating
     * @default 1000
     */
    angularSensibilityY?: number;

    /**
     * Control the pointer panning sensibility or how fast is the camera moving
     * @default 1000
     */
    panningSensibility?: number;

    /**
     * Defines the value of the inertia used during panning.
     * 0 would mean stop inertia and one would mean no deceleration at all.
     * @default 0.9
     */
    panningInertia?: number;
}

/**
 * A super set of different kinds of camera property
 */
export type CameraProperty = ArcRotateCameraProperty;

/**
 * The Camera Configuration groups the different settings of cameras.
 *
 * Each camera is defined in key-value pair, where key is the camera name and value is {@link CameraProperty}.
 *
 * Note: Key must be unique
 */
export interface CameraConfig {
    [cameraName: string]: CameraProperty;
}
