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

import '@babylonjs/core/Misc/observable.extensions';
import { Camera as BabylonCamera } from '@babylonjs/core/Cameras/camera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Observable } from '@babylonjs/core/Misc/observable';
import { IDisposable, Scene } from '@babylonjs/core/scene';

import { Camera } from '../camera/camera';
import { CameraConfig } from '../config/cameraConfig';
import { Config } from '../config/config';
import { LightingConfig } from '../config/lightingConfig';
import { SceneConfig } from '../config/sceneConfig';
import { Lighting } from '../lighting/lighting';
import { Model } from '../model/model';
import { AbstractScene } from '../scene/abstractScene';

import { SceneManager } from './sceneManager';

/**
 * This interface describes the structure of the variable sent with the config observables of the scene manager.
 *
 * O - the type of object we are dealing with (Lighting, Camera, Scene, etc.')
 *
 * C - the config type
 */
export interface PostConfigurationCallback<O, C> {
    newConfig: C;
    sceneManager: SceneManager;
    object: O;
}

/**
 * ObservableManager manages all observables
 */
export class ObservableManager implements IDisposable {
    /**
     * Will notify when Config changed.
     */
    private readonly _onConfigChangedObservable: Observable<Config>;

    /**
     * Will notify when the viewer init started (after config was loaded).
     */
    private readonly _onViewerInitStartedObservable: Observable<AbstractScene>;

    /**
     * Observers registered here will be executed when the entire load process has finished.
     */
    private readonly _onViewerInitDoneObservable: Observable<AbstractScene>;

    /**
     * Will notify when the scene was created.
     */
    private readonly _onSceneCreatedObservable: Observable<Scene>;

    /**
     * Will notify when the engine was created
     */
    private readonly _onEngineCreatedObservable: Observable<Engine>;

    /**
     * Will notify when a new model was added to the scene.
     * Note that added does not necessarily mean loaded!
     */
    private readonly _onModelAddedObservable: Observable<Model>;

    /**
     * Will notify after every model load.
     */
    private readonly _onModelLoadedObservable: Observable<Model>;

    /**
     * Will notify when any model load failed.
     */
    private readonly _onModelLoadErrorObservable: Observable<{ message: string; exception: unknown }>;

    /**
     * Will notify when a model was removed from the scene.
     */
    private readonly _onModelRemovedObservable: Observable<Model>;

    /**
     * Functions added to this observable will be executed on each frame rendered.
     */
    private readonly _onFrameRenderedObservable: Observable<unknown>;

    /**
     * Will notify at the first time when camera changed its view matrix.
     */
    private readonly _onCameraFirstInteractionObservable: Observable<void>;

    /**
     * Will notify after the scene was configured. Can be used to further configure the scene.
     */
    private readonly _onSceneConfiguredObservable: Observable<PostConfigurationCallback<Scene, SceneConfig>>;

    /**
     * Will notify after the cameras ware configured. Can be used to further configure the camera.
     */
    private readonly _onCamerasConfiguredObservable: Observable<PostConfigurationCallback<Camera, CameraConfig>>;

    /**
     * Will notify after the camera was created.
     */
    private readonly _onCameraCreatedObservable: Observable<BabylonCamera>;

    /**
     * Will notify after the lights were configured. Can be used to further configure lights.
     */
    private readonly _onLightingConfiguredObservable: Observable<PostConfigurationCallback<Lighting, LightingConfig>>;

    /**
     * Will notify after the error was emitted.
     */
    private readonly _onErrorObservable: Observable<Error>;

    /**
     * Instantiate a new ObservableManager
     */
    public constructor() {
        this._onConfigChangedObservable = new Observable();
        this._onViewerInitStartedObservable = new Observable();
        this._onViewerInitDoneObservable = new Observable();
        this._onSceneCreatedObservable = new Observable();
        this._onEngineCreatedObservable = new Observable();
        this._onModelLoadedObservable = new Observable();
        this._onModelLoadErrorObservable = new Observable();
        this._onModelAddedObservable = new Observable();
        this._onModelRemovedObservable = new Observable();
        this._onFrameRenderedObservable = new Observable();
        this._onCameraFirstInteractionObservable = new Observable();
        this._onSceneConfiguredObservable = new Observable();
        this._onCamerasConfiguredObservable = new Observable();
        this._onCameraCreatedObservable = new Observable();
        this._onLightingConfiguredObservable = new Observable();
        this._onErrorObservable = new Observable();
    }

    /**
     * Will notify when Config changed
     */
    public get onConfigChangedObservable(): Observable<Config> {
        return this._onConfigChangedObservable;
    }

    /**
     * Will notify when the viewer init started (after config was loaded)
     */
    public get onViewerInitStartedObservable(): Observable<AbstractScene> {
        return this._onViewerInitStartedObservable;
    }

    /**
     * Observers registered here will be executed when the entire load process has finished
     */
    public get onViewerInitDoneObservable(): Observable<AbstractScene> {
        return this._onViewerInitDoneObservable;
    }

    /**
     * Will notify when the scene was created
     */
    public get onSceneCreatedObservable(): Observable<Scene> {
        return this._onSceneCreatedObservable;
    }

    /**
     * Will notify when the engine was created
     */
    public get onEngineCreatedObservable(): Observable<Engine> {
        return this._onEngineCreatedObservable;
    }

    /**
     * Will notify when a new model was added to the scene.
     * Note that added does not necessarily mean loaded!
     */
    public get onModelAddedObservable(): Observable<Model> {
        return this._onModelAddedObservable;
    }

    /**
     * Will notify after every model load
     */
    public get onModelLoadedObservable(): Observable<Model> {
        return this._onModelLoadedObservable;
    }

    /**
     * Will notify when any model load failed
     */
    public get onModelLoadErrorObservable(): Observable<{ message: string; exception: unknown }> {
        return this._onModelLoadErrorObservable;
    }

    /**
     * Will notify when a model was removed from the scene
     */
    public get onModelRemovedObservable(): Observable<Model> {
        return this._onModelRemovedObservable;
    }

    /**
     * Functions added to this observable will be executed on each frame rendered
     */
    public get onFrameRenderedObservable(): Observable<unknown> {
        return this._onFrameRenderedObservable;
    }

    /**
     * Will notify at the first time when camera changed its view matrix
     */
    public get onCameraFirstInteractionObservable(): Observable<void> {
        return this._onCameraFirstInteractionObservable;
    }

    /**
     * Will notify after the scene was configured. Can be used to further configure the scene.
     */
    public get onSceneConfiguredObservable(): Observable<PostConfigurationCallback<Scene, SceneConfig>> {
        return this._onSceneConfiguredObservable;
    }

    /**
     * Will notify after the cameras ware configured. Can be used to further configure the camera.
     */
    public get onCamerasConfiguredObservable(): Observable<PostConfigurationCallback<Camera, CameraConfig>> {
        return this._onCamerasConfiguredObservable;
    }

    /**
     * Will notify after the camera was created.
     */
    public get onCameraCreatedObservable(): Observable<BabylonCamera> {
        return this._onCameraCreatedObservable;
    }

    /**
     * Will notify after the lights were configured. Can be used to further configure lights.
     */
    public get onLightingConfiguredObservable(): Observable<PostConfigurationCallback<Lighting, LightingConfig>> {
        return this._onLightingConfiguredObservable;
    }

    /**
     * Will notify after the error was emitted.
     */
    public get onErrorObservable(): Observable<Error> {
        return this._onErrorObservable;
    }

    /**
     * Release the current resources held by ObservableManager
     */
    public dispose() {
        this.onConfigChangedObservable.clear();
        this.onViewerInitStartedObservable.clear();
        this.onViewerInitDoneObservable.clear();
        this.onSceneCreatedObservable.clear();
        this.onEngineCreatedObservable.clear();
        this.onModelLoadedObservable.clear();
        this.onModelLoadErrorObservable.clear();
        this.onModelAddedObservable.clear();
        this.onModelRemovedObservable.clear();
        this.onFrameRenderedObservable.clear();
        this.onCameraFirstInteractionObservable.clear();
        this.onSceneConfiguredObservable.clear();
        this.onCamerasConfiguredObservable.clear();
        this.onCameraCreatedObservable.clear();
        this.onLightingConfiguredObservable.clear();
        this.onErrorObservable.clear();
    }
}
