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

import '@babylonjs/core/Materials/Textures/Loaders/basisTextureLoader';
import '@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader';
import '@babylonjs/loaders/glTF';
import { LoadAssetContainerAsync, LoadAssetContainerOptions } from '@babylonjs/core/Loading/sceneLoader';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { IDisposable } from '@babylonjs/core/scene';
import { GLTFLoaderAnimationStartMode } from '@babylonjs/loaders/glTF/glTFFileLoader';

import { ObservableManager } from '../manager/observableManager';
import { SceneManager } from '../manager/sceneManager';

import { Model } from './model';

export interface LoadGltfOptions {
    /**
     * When loading glTF animations, which are defined in seconds, target them to this FPS. Defaults to 60.
     */
    targetFps?: number;
}

/**
 * Responsible for loading models
 */
export class ModelLoader implements IDisposable {
    private readonly _sceneManager: SceneManager;
    private readonly _observableManager: ObservableManager;

    /**
     * Instantiate a new {@link ModelLoader}
     * @param sceneManager - an instance of {@link SceneManager}
     * @param observableManager - an instance of {@link ObservableManager}
     */
    public constructor(sceneManager: SceneManager, observableManager: ObservableManager) {
        this._sceneManager = sceneManager;
        this._observableManager = observableManager;
    }

    /**
     * Import a glTF or glb file into the scene.
     * Either a URL path to the file must be provided, or the base64 based string of a glb file (starts with 'data:').
     *
     * @param url - URL path to the glTF or glb file, or base64 based string (starts with 'data:')
     * @param disableAnimation - whether disable animation of the loaded model (default: false)
     * @param modelName - if provided, set the model name
     * @param options - optional config, {@link LoadGltfOptions}
     * @returns A promise of {@link Model}
     *
     * @throws Error if no glTF content or url provided
     */
    public async loadGltf(
        url: string,
        disableAnimation?: boolean,
        modelName?: string,
        options?: LoadGltfOptions,
    ): Promise<Model> {
        if (!url) {
            throw Error('No glTF content or url provided');
        }

        let pluginExtension = '.glb';
        let isBase64 = false;
        let isBlobUrl = false;
        const extensionRegEx = /\.(glb|gltf|babylon|obj|stl)$/;

        if (url.startsWith('data:')) {
            isBase64 = true;
        } else if (url.startsWith('blob:')) {
            isBlobUrl = true;
        } else if (extensionRegEx.test(url.toLowerCase())) {
            pluginExtension = url.toLowerCase().match(extensionRegEx)?.at(0) ?? pluginExtension;
        }

        const loadAssetContainerOptions: LoadAssetContainerOptions = {
            pluginOptions: {
                gltf: {
                    // Use HTTP range requests to load the glTF binary (GLB) in parts.
                    useRangeRequests: !isBase64 && !isBlobUrl,
                    extensionOptions: {
                        /* For debugging MSFT_lod extension */
                        // MSFT_lod: {
                        //     maxLODsToLoad: 1,
                        // },
                    },
                },
            },
            pluginExtension: pluginExtension,
        };

        if (disableAnimation) {
            loadAssetContainerOptions.pluginOptions!.gltf!.animationStartMode = GLTFLoaderAnimationStartMode.NONE;
        }

        if (options?.targetFps) {
            loadAssetContainerOptions.pluginOptions!.gltf!.targetFps = options.targetFps;
        }

        /* For debugging MSFT_lod extension */
        // SceneLoader.OnPluginActivatedObservable.addOnce(function (loader) {
        //     if (loader.name === 'gltf' && loader instanceof GLTFFileLoader) {
        //         loader.loggingEnabled = true;
        //     }
        // });

        if (this._sceneManager.config.sceneConfig?.useLoadingUI) {
            this._sceneManager.scene.getEngine().displayLoadingUI();
        }

        const container = await LoadAssetContainerAsync(url, this._sceneManager.scene, loadAssetContainerOptions);

        // Add everything from the container into the scene
        container.addAllToScene();

        if (this._sceneManager.config.sceneConfig?.useLoadingUI) {
            this._sceneManager.scene.getEngine().hideLoadingUI();
        }

        // Avoid frustum clipping for all meshes
        container.meshes.forEach((mesh: AbstractMesh) => {
            mesh.alwaysSelectAsActiveMesh = true;
        });

        const model = new Model(this._sceneManager, this._observableManager, container, modelName);
        this._sceneManager.models.set(model.name, model);

        this._observableManager.onModelLoadedObservable.notifyObservers(model);

        return Promise.resolve(model);
    }

    /**
     * Release all resources held by {@link ModelLoader}
     */
    public dispose(): void {}
}
