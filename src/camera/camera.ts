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

import '@babylonjs/core/Animations/animatable';
import { Animation } from '@babylonjs/core/Animations/animation';
import { EasingFunction } from '@babylonjs/core/Animations/easing';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Camera as BabylonCamera } from '@babylonjs/core/Cameras/camera';
import { DeltaAngle } from '@babylonjs/core/Maths/math.scalar.functions';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Observer } from '@babylonjs/core/Misc/observable';
import { Tools } from '@babylonjs/core/Misc/tools';
import { IDisposable } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';

import {
    CAMERA_ANIMATABLE_PROPERTY,
    CAMERA_ANIMATION_TYPE_MAP,
    CameraAnimationConfig,
    DEFAULT_CAMERA_ANIMATION_CONFIG,
} from '../config/cameraAnimationConfig';
import {
    ARC_ROTATE_CAMERA_LIMIT_PROPERTIES,
    ArcRotateCameraLimitProperty,
    ArcRotateCameraNonAnimatableProperty,
    ArcRotateCameraProperty,
    CAMERA_PROPERTIES_TO_IGNORE_DURING_EXTRACTION,
    CameraConfig,
} from '../config/cameraConfig';
import { ObservableManager } from '../manager/observableManager';
import { SceneManager } from '../manager/sceneManager';

/**
 * {@link Camera} holds and manages all BabylonJS cameras defined in {@link CameraConfig}
 */
export class Camera implements IDisposable {
    private static CAMERA_DEFAULT_NAME = 'DefaultCamera';

    private readonly _sceneManager: SceneManager;

    private _observableManager: ObservableManager;

    private _cameraMap: Map<string, BabylonCamera>;

    // Maintain a running index for the latest camera update
    private _latestUpdateIndexMap: Map<string, number>;

    private _firstCameraInteractionMap: Map<string, boolean>;

    private _firstCameraInteractionObserverMap: Map<string, Nullable<Observer<BabylonCamera>>>;

    private _cameraViewMatrixMap: Map<string, Matrix | null>;

    /**
     * Instantiate a new Camera
     * @param sceneManager - an instance of {@link SceneManager}
     * @param observableManager - an instance of {@link ObservableManager}
     */
    public constructor(sceneManager: SceneManager, observableManager: ObservableManager) {
        this._sceneManager = sceneManager;
        this._observableManager = observableManager;

        this._latestUpdateIndexMap = new Map<string, number>();
        this._firstCameraInteractionMap = new Map<string, boolean>();
        this._firstCameraInteractionObserverMap = new Map<string, Nullable<Observer<BabylonCamera>>>();
        this._cameraViewMatrixMap = new Map<string, Matrix | null>();
        this._cameraMap = new Map<string, BabylonCamera>();

        const defaultCamera = new ArcRotateCamera(
            Camera.CAMERA_DEFAULT_NAME,
            0,
            0,
            1,
            Vector3.Zero(),
            this._sceneManager.scene,
        );
        defaultCamera.attachControl();
        this._cameraMap.set(Camera.CAMERA_DEFAULT_NAME, defaultCamera);
    }

    /**
     * Asynchronously create and/or update cameras in the scene based on {@link CameraConfig}
     * @param cameraConfig - an instance of {@link CameraConfig} that defines all cameras in the scene
     */
    public async updateCameras(cameraConfig: CameraConfig): Promise<void> {
        const entries = Object.entries(cameraConfig);
        if (!cameraConfig || entries.length === 0) {
            return Promise.resolve();
        }

        this._removeCamera(Camera.CAMERA_DEFAULT_NAME);

        for (const [cameraName, cameraProperty] of entries) {
            switch (cameraProperty.type) {
                case 'arcRotateCamera':
                    await this._updateArcRotateCamera(cameraProperty as ArcRotateCameraProperty, cameraName);
                    break;
            }
        }
    }

    /**
     * Check whether there is at least one camera that will be added or removed
     * @param cameraConfig - an instance of {@link CameraConfig} that defines all cameras in the scene
     * @returns `false` if no camera will be added or removed, else `true`
     */
    public willAddOrRemoveCameras(cameraConfig: CameraConfig): boolean {
        for (const [cameraName, cameraProperty] of Object.entries(cameraConfig)) {
            const enable = cameraProperty.enable ?? true;

            if (!enable) {
                return true;
            }

            if (!this._cameraMap.has(cameraName)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Destroy the camera and release the current resources held by it
     */
    public dispose(): void {
        this._cameraMap.forEach((camera) => {
            camera.animations.forEach((animation: Animation) => {
                this._sceneManager.scene.stopAnimation(camera, animation.name);
            });
            camera.animations = [];

            camera.dispose();
        });
        this._cameraMap.clear();

        this._firstCameraInteractionMap.clear();
        this._latestUpdateIndexMap.clear();
        this._cameraViewMatrixMap.clear();
    }

    private async _updateArcRotateCamera(cameraProperty: ArcRotateCameraProperty, cameraName: string): Promise<void> {
        // Remove camera if it's disabled
        cameraProperty.enable = cameraProperty.enable ?? true;
        if (!cameraProperty.enable) {
            this._removeCamera(cameraName);
            return;
        }

        // Get or create camera
        let arcRotateCamera = this._cameraMap.get(cameraName);
        if (!arcRotateCamera) {
            arcRotateCamera = this._createCamera(cameraProperty, cameraName);
        }
        const camera = arcRotateCamera as ArcRotateCamera;

        // Attach or detach control
        if (cameraProperty.attachControl ?? true) {
            camera.attachControl();
        } else {
            camera.detachControl();
        }

        // AutoRotation behavior
        if (cameraProperty.autoRotationBehavior) {
            camera.useAutoRotationBehavior = cameraProperty.autoRotationBehavior.enabled ?? false;
            if (camera.autoRotationBehavior) {
                camera.autoRotationBehavior.idleRotationSpeed =
                    cameraProperty.autoRotationBehavior.idleRotationSpeed ?? 1;
                camera.autoRotationBehavior.idleRotationWaitTime =
                    cameraProperty.autoRotationBehavior.idleRotationWaitTime ?? 100;
                camera.autoRotationBehavior.idleRotationSpinupTime =
                    cameraProperty.autoRotationBehavior.idleRotationSpinupTime ?? 100;
                camera.autoRotationBehavior.zoomStopsAnimation =
                    cameraProperty.autoRotationBehavior.zoomStopsAnimation ?? false;
            }
        }

        // Framing behavior
        if (cameraProperty.framingBehavior) {
            camera.useFramingBehavior = cameraProperty.framingBehavior.enabled ?? false;
            if (camera.framingBehavior) {
                camera.framingBehavior.elevationReturnTime = -1;
                camera.framingBehavior.framingTime = cameraProperty.framingBehavior.framingTime ?? 0;
                camera.framingBehavior.radiusScale = cameraProperty.framingBehavior.radiusScale ?? 1;
                camera.framingBehavior.autoCorrectCameraLimitsAndSensibility = true;
            }
            camera.overrideCloneAlphaBetaRadius = cameraProperty.framingBehavior.enabled ?? false;
        }

        // Increment the index of the latest update and store it.
        // This can be used at the end of the animation to check if any other updates have been initiated after this one.
        this._latestUpdateIndexMap.set(cameraName, this._latestUpdateIndexMap.get(cameraName)! + 1);
        const updateIndexAtStart = this._latestUpdateIndexMap.get(cameraName)!;

        // Stop and remove all camera animations
        camera.animations.forEach((anim: Animation) => {
            this._sceneManager.scene.stopAnimation(camera, anim.name);
        });
        camera.animations = [];

        // Separate out animatable, special animatable, and non-animatable values
        const { animatableValuesToUpdate, specialAnimatableValuesToUpdate, nonAnimatableValuesToUpdate } =
            this._extractConfigProperties(cameraProperty);

        const cameraAnimationConfig = cameraProperty.cameraAnimationConfig || DEFAULT_CAMERA_ANIMATION_CONFIG;
        const animationDuration = cameraProperty.animationDuration ?? 0;

        // Determine the last frame from the specified duration.
        // Need to have a difference of at least 1 frame between start and end for the animation to work
        const lastFrame = animationDuration > 0 ? animationDuration * 60 : 1;

        // Loop through the animatable update values and create animations for them
        animatableValuesToUpdate.forEach((value: unknown, key: CAMERA_ANIMATABLE_PROPERTY) => {
            // Create and link animation to the camera
            camera.animations.push(
                this._createArcRotateCameraAnimation(
                    key,
                    value,
                    lastFrame,
                    camera,
                    cameraAnimationConfig,
                    cameraProperty.minimizeRotation,
                ),
            );
        });

        // Create an animation to the target position.
        // Need to use unshift since target can change the other values (alpha, beta, radius).
        const target = specialAnimatableValuesToUpdate.get('target') ?? Vector3.Zero();
        camera.animations.unshift(
            this._createArcRotateCameraAnimation(
                'target',
                target,
                lastFrame,
                camera,
                cameraAnimationConfig,
                cameraProperty.minimizeRotation,
            ),
        );

        // Before we begin the animation we need to get rid of camera property limits
        // so the animation is not constrained
        const oldCameraLimits = new Map<string, unknown>();
        for (const cameraLimitProperty of ARC_ROTATE_CAMERA_LIMIT_PROPERTIES) {
            // Save the values for later so that they can be merged with the nonAnimatableValuesToUpdate
            oldCameraLimits.set(cameraLimitProperty, camera[cameraLimitProperty as ArcRotateCameraLimitProperty]);

            // Clear the limits
            camera[cameraLimitProperty as ArcRotateCameraLimitProperty] = null;
        }

        // Remove old observer
        if (this._firstCameraInteractionObserverMap.has(cameraName)) {
            camera.onViewMatrixChangedObservable.remove(this._firstCameraInteractionObserverMap.get(cameraName)!);
        }

        if (animationDuration > 0) {
            // Begin the animation and await it
            await this._sceneManager.scene.beginAnimation(camera, 0, lastFrame).waitAsync();
            cameraProperty.animationDuration = 0;
        } else {
            // If there is no duration, set the values on the camera directly
            camera.animations.forEach((animation: Animation) => {
                camera[animation.targetProperty as CAMERA_ANIMATABLE_PROPERTY] =
                    animation.getKeys()[animation.getKeys().length - 1].value;
            });
        }

        // Only do post-animation operations if no subsequent camera updates have been initiated,
        // otherwise they will interfere with the other updates and cause unpredictable behavior.
        if (updateIndexAtStart == this._latestUpdateIndexMap.get(cameraName)) {
            // Clear the list of animations
            camera.animations = [];

            // Update non-animatable values and put back the camera limits
            for (const [key, value] of Object.entries({
                ...Object.fromEntries(oldCameraLimits),
                ...Object.fromEntries(nonAnimatableValuesToUpdate),
            })) {
                if (value === undefined) {
                    continue;
                }

                camera[key as ArcRotateCameraNonAnimatableProperty] = value as number;
            }

            // Notify when the first camera interaction made by user is observed
            if (!this._firstCameraInteractionMap.get(cameraName)) {
                const observer = camera.onViewMatrixChangedObservable.add((camera) => {
                    const cameraViewMatrix = this._cameraViewMatrixMap.get(cameraName);
                    if (cameraViewMatrix && !cameraViewMatrix.equals(camera.getViewMatrix())) {
                        this._observableManager.onCameraFirstInteractionObservable.notifyObservers();
                        this._observableManager.onCameraFirstInteractionObservable.clear();
                        this._firstCameraInteractionMap.set(cameraName, true);
                    }
                    this._cameraViewMatrixMap.set(cameraName, camera.getViewMatrix().clone());
                });
                this._firstCameraInteractionObserverMap.set(cameraName, observer);
            }
        }
    }

    private _convertDegreesToRadians(key: string, value: number): [string, number] {
        const newKey = key.split('InDegrees')[0];
        const newValue = Tools.ToRadians(value);
        return [newKey, newValue];
    }

    private _extractConfigProperties(cameraProperty: ArcRotateCameraProperty): {
        animatableValuesToUpdate: Map<CAMERA_ANIMATABLE_PROPERTY, unknown>;
        specialAnimatableValuesToUpdate: Map<string, unknown>;
        nonAnimatableValuesToUpdate: Map<ArcRotateCameraNonAnimatableProperty, unknown>;
    } {
        const animatableValuesToUpdate = new Map<CAMERA_ANIMATABLE_PROPERTY, unknown>();
        const specialAnimatableValuesToUpdate = new Map<string, unknown>();
        const nonAnimatableValuesToUpdate = new Map<ArcRotateCameraNonAnimatableProperty, unknown>();

        for (const cameraConfigKey in cameraProperty) {
            if (CAMERA_PROPERTIES_TO_IGNORE_DURING_EXTRACTION.includes(cameraConfigKey)) {
                continue;
            }

            let key = cameraConfigKey;
            let value = cameraProperty[key as keyof typeof cameraProperty];

            if (cameraConfigKey.includes('InDegrees')) {
                [key, value] = this._convertDegreesToRadians(key, value as number);
            }

            if (key === 'target') {
                specialAnimatableValuesToUpdate.set(key, value);
                continue;
            }

            if (key in CAMERA_ANIMATION_TYPE_MAP) {
                animatableValuesToUpdate.set(key as CAMERA_ANIMATABLE_PROPERTY, value);
            } else {
                nonAnimatableValuesToUpdate.set(key as ArcRotateCameraNonAnimatableProperty, value);
            }
        }

        return {
            animatableValuesToUpdate: animatableValuesToUpdate,
            specialAnimatableValuesToUpdate: specialAnimatableValuesToUpdate,
            nonAnimatableValuesToUpdate: nonAnimatableValuesToUpdate,
        };
    }

    private _createArcRotateCameraAnimation(
        key: CAMERA_ANIMATABLE_PROPERTY,
        value: unknown,
        lastFrame: number,
        camera: ArcRotateCamera,
        cameraAnimationConfig: CameraAnimationConfig,
        minimizeRotation?: boolean,
    ): Animation {
        // Create an animation object
        const cameraAnimation = new Animation(
            `Camera-${key}-${value}-Animation`,
            key,
            cameraAnimationConfig.maxFPS,
            CAMERA_ANIMATION_TYPE_MAP[key],
            Animation[cameraAnimationConfig.loopMode],
        );

        let startVal = camera[key];
        let endVal = value;

        // For alpha and beta values, we want to minimize the amount of rotation in the animation.
        // User interactions can cause the alpha and beta to be arbitrarily large or small and thus
        // cause the camera to spin around an unpredictable amount to reach the desired alpha and beta.
        // We can avoid this by animating to the current alpha(or beta) + the delta angle between the
        // current and desired alphas and betas.
        if (minimizeRotation) {
            if (typeof endVal === 'number' && (key === 'alpha' || key === 'beta')) {
                startVal = startVal as number;
                endVal = startVal + Tools.ToRadians(DeltaAngle(Tools.ToDegrees(startVal), Tools.ToDegrees(endVal)));
            }
        }

        // Generate animation key frames
        const cameraAnimationKeys = [
            {
                frame: 0,
                value: startVal,
            },
            {
                frame: lastFrame,
                value: endVal,
            },
        ];

        // Add animation array to the animation object
        cameraAnimation.setKeys(cameraAnimationKeys);

        // Create and set an easing function
        const easingFunction = cameraAnimationConfig.easingFunction;
        easingFunction.setEasingMode(EasingFunction[cameraAnimationConfig.easingMode]);
        cameraAnimation.setEasingFunction(easingFunction);

        return cameraAnimation;
    }

    private _createCamera(cameraProperty: ArcRotateCameraProperty, cameraName: string): BabylonCamera {
        let camera;
        switch (cameraProperty.type) {
            case 'arcRotateCamera':
                camera = new ArcRotateCamera(cameraName, 0, 0, 1, Vector3.Zero(), this._sceneManager.scene);
                break;
        }

        this._sceneManager.scene.activeCamera = camera;

        this._cameraMap.set(cameraName, camera);
        this._latestUpdateIndexMap.set(cameraName, 0);
        this._firstCameraInteractionMap.set(cameraName, false);
        this._cameraViewMatrixMap.set(cameraName, null);

        this._observableManager.onCameraCreatedObservable.notifyObservers(camera);
        return camera;
    }

    private _removeCamera(cameraName: string): void {
        const cameraToRemove = this._cameraMap.get(cameraName);
        if (cameraToRemove) {
            this._sceneManager.scene.removeCamera(cameraToRemove);
            this._cameraMap.delete(cameraName);
            this._latestUpdateIndexMap.delete(cameraName);
            this._firstCameraInteractionMap.delete(cameraName);
            this._cameraViewMatrixMap.delete(cameraName);
            cameraToRemove.dispose();
        }
    }
}
