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

    /**
     * Timeout in milliseconds for model loading. Defaults to 30000 (30 seconds).
     * @default 30000
     */
    timeout?: number;

    /**
     * Whether to show detailed loading progress. Defaults to false.
     * @default false
     */
    showProgress?: boolean;

    /**
     * Callback function for loading progress updates (0-100).
     */
    onProgress?: (progress: number) => void;
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
     * @throws Error if model loading times out
     * @throws Error if model loading fails
     */
    public async loadGltf(
        url: string,
        disableAnimation?: boolean,
        modelName?: string,
        options?: LoadGltfOptions,
    ): Promise<Model> {
        if (!url) {
            throw new Error('No glTF content or url provided');
        }

        // Validate URL format for better error messages
        if (!url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('http')) {
            throw new Error(`Invalid URL format: ${url}. URL must start with 'data:', 'blob:', or 'http'`);
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

        // Set up timeout if specified
        const timeout = options?.timeout || 30000;
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Model loading timed out after ${timeout}ms`));
            }, timeout);
        });

        // Set up progress tracking if requested
        if (options?.showProgress && options?.onProgress) {
            // Simulate progress updates (Babylon.js doesn't provide detailed progress)
            const progressInterval = setInterval(() => {
                const currentProgress = Math.min(90, Math.random() * 90); // Cap at 90% until complete
                options.onProgress!(currentProgress);
            }, 100);

            // Clear interval when loading completes
            const clearProgress = () => clearInterval(progressInterval);
            timeoutPromise.catch(clearProgress);
        }

        let container: AssetContainer;
        try {
            // Race between loading and timeout
            container = await Promise.race([
                LoadAssetContainerAsync(url, this._sceneManager.scene, loadAssetContainerOptions),
                timeoutPromise,
            ]);
        } catch (error) {
            // Fallback to full download on range request failure
            if (error instanceof Error && error.message.includes('RangeError')) {
                loadAssetContainerOptions.pluginOptions!.gltf!.useRangeRequests = false;
                container = await Promise.race([
                    LoadAssetContainerAsync(url, this._sceneManager.scene, loadAssetContainerOptions),
                    timeoutPromise,
                ]);
            } else {
                throw error;
            }
        }

        // Complete progress tracking
        if (options?.onProgress) {
            options.onProgress(100);
        }

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
