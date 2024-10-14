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
import { AssetContainer } from '@babylonjs/core/assetContainer';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { IDisposable } from '@babylonjs/core/scene';
import { GLTFFileLoader, GLTFLoaderAnimationStartMode } from '@babylonjs/loaders/glTF/glTFFileLoader';

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

        let rootUrl = url;
        let contents = '';
        let pluginExtension = '.glb';
        let isBase64 = false;
        let isBlobUrl = false;
        const extensionRegEx = /\.(glb|gltf|babylon|obj|stl)$/;

        if (url.startsWith('data:')) {
            rootUrl = '';
            contents = url;
            isBase64 = true;
        } else if (url.startsWith('blob:')) {
            isBlobUrl = true;
        } else if (extensionRegEx.test(url.toLowerCase())) {
            pluginExtension = url.toLowerCase().match(extensionRegEx)?.at(0) ?? pluginExtension;
        }

        SceneLoader.OnPluginActivatedObservable.addOnce(function (loader) {
            if (loader.name === 'gltf' && loader instanceof GLTFFileLoader) {
                // Use HTTP range requests to load the glTF binary (GLB) in parts.
                loader.useRangeRequests = !isBase64 && !isBlobUrl;

                /* For debugging MSFT_lod extension */
                // loader.loggingEnabled = true;
                // loader.onExtensionLoadedObservable.add(function (extension) {
                //     if (extension.name === 'MSFT_lod' && extension instanceof MSFT_lod) {
                //         extension.maxLODsToLoad = 1;
                //     }
                // });

                if (disableAnimation) {
                    loader.animationStartMode = GLTFLoaderAnimationStartMode.NONE;
                }

                if (options?.targetFps) {
                    loader.targetFps = options.targetFps;
                }
            }
        });

        if (this._sceneManager.config.sceneConfig?.useLoadingUI) {
            this._sceneManager.scene.getEngine().displayLoadingUI();
        }

        const sceneLoaderAsyncResult = await SceneLoader.ImportMeshAsync(
            '',
            rootUrl,
            contents,
            this._sceneManager.scene,
            undefined,
            pluginExtension,
        );

        if (this._sceneManager.config.sceneConfig?.useLoadingUI) {
            this._sceneManager.scene.getEngine().hideLoadingUI();
        }

        const container = new AssetContainer(this._sceneManager.scene);
        container.meshes = sceneLoaderAsyncResult.meshes;
        container.lights = sceneLoaderAsyncResult.lights;
        container.geometries = sceneLoaderAsyncResult.geometries;
        container.skeletons = sceneLoaderAsyncResult.skeletons;
        container.particleSystems = sceneLoaderAsyncResult.particleSystems;
        container.animationGroups = sceneLoaderAsyncResult.animationGroups;
        container.transformNodes = sceneLoaderAsyncResult.transformNodes;

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
