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

import '@babylonjs/core/Culling/ray';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/core/Misc/screenshotTools';
import { AssetContainer, KeepAssets } from '@babylonjs/core/assetContainer';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { ThinEngine } from '@babylonjs/core/Engines/thinEngine';
import { DefaultLoadingScreen } from '@babylonjs/core/Loading/loadingScreen';
import { ISceneLoaderPlugin, ISceneLoaderPluginAsync, SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { DracoCompression } from '@babylonjs/core/Meshes/Compression/dracoCompression';
import { MeshoptCompression } from '@babylonjs/core/Meshes/Compression/meshoptCompression';
import { BasisTools } from '@babylonjs/core/Misc/basis';
import { FilesInput } from '@babylonjs/core/Misc/filesInput';
import { IScreenshotSize } from '@babylonjs/core/Misc/interfaces/screenshotSize';
import { KhronosTextureContainer2 } from '@babylonjs/core/Misc/khronosTextureContainer2';
import { Tools } from '@babylonjs/core/Misc/tools';
import { IDisposable } from '@babylonjs/core/scene';
import { Scene } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';
import { GLTFFileLoader } from '@babylonjs/loaders/glTF/glTFFileLoader';
import { deepmerge } from 'deepmerge-ts';

import { Config } from '../config/config';
import { ObservableManager } from '../manager/observableManager';
import { SceneManager } from '../manager/sceneManager';
import { Model } from '../model/model';
import { LoadGltfOptions, ModelLoader } from '../model/modelLoader';
import { Util } from '../util';

/**
 * Abstract class used to provide common properties and functions for creating and managing the viewer
 */
export abstract class AbstractScene implements IDisposable {
    protected _engine: Engine;

    protected _sceneManager: SceneManager;

    protected _observableManager: ObservableManager;

    protected _modelLoader: ModelLoader;

    protected _filesInput: Nullable<FilesInput>;

    protected _canvas: Nullable<HTMLCanvasElement>;

    protected readonly _initialConfig: Config;

    /**
     * Instantiate a new {@link AbstractScene}
     * @param canvas - defines the canvas to use for rendering. If NullEngine is used, set the canvas as null.
     * @param presetConfig - pre-defined configuration
     * @param configOverride - used to override parameters in pre-defined configuration
     */
    protected constructor(canvas: Nullable<HTMLCanvasElement>, presetConfig: Config, configOverride: Config = {}) {
        this._canvas = canvas;

        this._observableManager = new ObservableManager();

        this._initialConfig = deepmerge(presetConfig, configOverride);
    }

    /**
     * The engine class is responsible for interfacing with all lower-level APIs such as WebGL and Audio
     */
    public get engine(): Engine {
        return this._engine;
    }

    /**
     * SceneManager manages all resources in the scene
     */
    public get sceneManager(): SceneManager {
        return this._sceneManager;
    }

    /**
     * Represent a scene to be rendered by the engine
     */
    public get scene(): Scene {
        return this._sceneManager.scene;
    }

    /**
     * ObservableManager manages all observables
     */
    public get observableManager(): ObservableManager {
        return this._observableManager;
    }

    /**
     * Define the canvas to use for rendering
     */
    public get canvas(): Nullable<HTMLCanvasElement> {
        return this._canvas;
    }

    /**
     * Hold all configurable parameters for the viewer
     */
    public get config(): Config {
        return this.sceneManager.config;
    }

    /**
     * Class used to help managing file picking and drag-n-drop
     */
    public get filesInput(): Nullable<FilesInput> {
        return this._filesInput;
    }

    /**
     * Gets a camera using its name
     * @param cameraName defines the camera's name
     * @returns the camera or null if none found.
     */
    public getCamera(cameraName: string): Nullable<Camera> {
        return this.scene.getCameraByName(cameraName);
    }

    /**
     * Asynchronously prepare Babylon engine and scene manager
     */
    public async init(): Promise<void> {
        this._setupBasisTextureLoader();
        this._setupBasisTranscoder();
        this._setupDracoCompression();
        this._setupKTX2Decoder();
        this._setupMeshoptCompression();
        this._registerGLTFLoaderExtensions();

        this.observableManager.onViewerInitStartedObservable.notifyObservers(this);

        await this._createEngine();
        this.observableManager.onEngineCreatedObservable.notifyObservers(this.engine);

        this._sceneManager = new SceneManager(this.engine, this._initialConfig, this.observableManager);

        this._filesInput = this._createFilesInput(this._initialConfig);

        if (!this.sceneManager.scene) {
            await this.sceneManager.createScene();
        }

        this._modelLoader = new ModelLoader(this.sceneManager, this.observableManager);

        this.observableManager.onViewerInitDoneObservable.notifyObservers(this);
    }

    /**
     * Asynchronously update the scene's configuration, including camera, lights, environment, etc.
     * @param newConfig the delta that should be configured. This includes only the changes.
     */
    public async updateConfig(newConfig: Partial<Config>): Promise<void> {
        if (this.sceneManager) {
            await this.sceneManager.updateConfig(newConfig);
        }
    }

    /**
     * Asynchronously import a glTF or glb file into the scene.
     * Either a URL path to the file must be provided, or the base64 based string of a glb file (starts with 'data:').
     *
     * @param url - URL path to the glTF or glb file, or base64 based string (starts with 'data:')
     * @param disableAnimation - whether disable animation of the loaded model (default: false)
     * @param modelName - the name of model
     * @param options - optional config
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
        return this._modelLoader.loadGltf(url, disableAnimation, modelName, options).catch((reason) => {
            const error = new Error(reason.message);
            this.observableManager.onErrorObservable.notifyObservers(error);
            throw error;
        });
    }

    /**
     * Import a glTF or glb model from files into the scene.
     *
     * Notes: The loaded model can be found:
     *        1) in AbstractScene.sceneManager.models map
     *        2) by adding an observer to AbstractScene.observableManager.onModelLoadedObservable
     *
     * @param files - A list of files, which can be a GLB file or
     *                a GLTF file along with multiple texture files and bin files
     */
    public loadGltfFromFiles(files: File[]): void {
        this._filesInput?.loadFiles({
            dataTransfer: {
                files: files,
            },
        });
    }

    /**
     * Turn on/off debug layer
     * @param forceHide - if it's set to `true`, always hide the debug mode
     */
    public toggleDebugMode(forceHide?: boolean): void {
        if (!this.sceneManager.scene) {
            return;
        }

        if (forceHide || this.sceneManager.scene.debugLayer.isVisible()) {
            this.sceneManager.scene.debugLayer.hide();
        } else {
            this.sceneManager.scene.debugLayer.show().then();
        }
    }

    /**
     * Capture a screenshot of the current rendering
     * @param size - This parameter can be set to a single number or to an object with the following
     *               (optional) properties: precision, width, height. If a single number is passed,
     *               it will be used for both width and height. If an object is passed,
     *               the screenshot size will be derived from the parameters.
     *               The precision property is a multiplier allowing rendering at a higher or lower resolution
     * @param usingRenderTarget - whether to use CreateScreenshotUsingRenderTarget function. Default: false
     * @returns base64 encoded string
     * @see https://doc.babylonjs.com/features/featuresDeepDive/scene/renderToPNG
     */
    public async takeScreenshot(size: number | IScreenshotSize, usingRenderTarget: boolean = false): Promise<string> {
        await this.sceneManager.scene.whenReadyAsync(true);

        if (usingRenderTarget) {
            this.sceneManager.scene.render();
            return Tools.CreateScreenshotUsingRenderTargetAsync(
                this.engine,
                this.sceneManager.scene.activeCamera!,
                size,
                'image/png',
                this.engine.getCaps().maxMSAASamples,
                false,
            );
        } else {
            return Tools.CreateScreenshotAsync(this.engine, this.sceneManager.scene.activeCamera!, size, 'image/png');
        }
    }

    /**
     * Turn on/off a specific lighting rig
     * @param lightingName - the name of lighting, i.e. the key in {@link LightingConfig}
     * @param visible - force the lighting to be visible or invisible
     */
    public toggleLighting(lightingName: string, visible?: boolean): void {
        if (!this.config.lightingConfig) {
            return;
        }

        const lighting = this.config.lightingConfig[lightingName];
        if (!lighting) {
            return;
        }
        const isEnable = lighting.enable ?? true; // Previous state
        lighting.enable = visible === undefined ? !isEnable : visible;

        this.updateConfig({
            lightingConfig: {
                [lightingName]: lighting,
            },
        }).then();
    }

    /**
     * Register a new action to be preformed after a gltf/glb scene file has been loaded
     *
     * @param action a function which takes a scene as input and preforms some process after it has been loaded
     * then returns void
     */
    public registerPostSceneFileLoadedAction = (action: (scene: Scene) => void) => {
        if (this.filesInput) {
            const superFileInputLoadAsync = this.filesInput.loadAsync;
            this.filesInput.loadAsync = (sceneFile, onProgress) => {
                return superFileInputLoadAsync(sceneFile, onProgress).then((scene) => {
                    action(scene);
                    return scene;
                });
            };
        }
    };

    /**
     * Adjust camara zoom-in level on models.
     * Only works for ArcRotateCamera with FramingBehavior enabled.
     * FramingBehavior must be configured before loading models.
     * @param models - A list of models used to determine camera zoom-in level
     */
    public zoomOnModelsWithFramingBehavior(models: Model[]): void {
        const camera = this.sceneManager.scene.activeCamera;
        if (!camera || !(camera instanceof ArcRotateCamera) || !camera.framingBehavior) {
            return;
        }

        const meshes: AbstractMesh[] = [];
        for (const model of models) {
            meshes.push(...model.getChildMeshes());
        }
        camera.framingBehavior.zoomOnMeshesHierarchy(meshes);
    }

    /**
     * Release all resources held by {@link AbstractScene}
     */
    public dispose() {
        if (this._filesInput) {
            this._filesInput.dispose();
        }

        if (this._modelLoader) {
            this._modelLoader.dispose();
        }

        if (this.sceneManager) {
            this.sceneManager.dispose();
        }

        if (this.observableManager) {
            this.observableManager.dispose();
        }

        if (this.engine) {
            this.engine.dispose();
        }
    }

    /**
     * Registers gltfLoaderExtensions which are enabled in the extensionConfig
     */
    protected _registerGLTFLoaderExtensions() {}

    /**
     * Create the engine. Returns a promise in case async calls are needed.
     *
     * @returns a promise of Babylon Engine
     */
    protected _createEngine(): Promise<Engine> {
        const engineConfig = this._initialConfig.engineConfig || {};
        const engineOptions = engineConfig.engineOptions || {};
        const sceneConfig = this._initialConfig.sceneConfig || {};

        // By default, disable canvas WebGL context cleanup
        // Refer to https://github.com/BabylonJS/Babylon.js/pull/14422
        if (engineOptions.loseContextOnDispose === undefined) {
            engineOptions.loseContextOnDispose = false;
        }

        if (this._initialConfig['3dCommerceCertified'] ?? true) {
            engineOptions.forceSRGBBufferSupportState = true;
            const loader = SceneLoader.GetPluginForExtension('.gltf');
            if (loader) {
                (loader as GLTFFileLoader).transparencyAsCoverage = true;
            }
            SceneLoader.OnPluginActivatedObservable.add((plugin: ISceneLoaderPlugin | ISceneLoaderPluginAsync) => {
                if (plugin.name === 'gltf') {
                    const loader = plugin as GLTFFileLoader;
                    loader.transparencyAsCoverage = true;
                }
            });
        }

        if (this._initialConfig.engineConfig?.useNullEngine) {
            this._engine = new NullEngine();
        } else {
            this._engine = new Engine(this.canvas, engineConfig.antialiasing ?? true, engineOptions);
            this.engine.loadingUIBackgroundColor = '#FFFFFF';
            DefaultLoadingScreen.DefaultLogoUrl =
                sceneConfig.loadingUILogoUrl ??
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NgAAIAAAUAAR4f7BQAAAAASUVORK5CYII=';
            DefaultLoadingScreen.DefaultSpinnerUrl =
                sceneConfig.loadingUISpinnerUrl ??
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NgAAIAAAUAAR4f7BQAAAAASUVORK5CYII=';
        }

        if (!engineConfig.disableResize && !engineOptions.disableWebGL2Support) {
            window.addEventListener('resize', this._resize);
        }

        return Promise.resolve(this.engine);
    }

    /**
     * Resize the view according to the canvas' size
     */
    protected _resize = (): void => {
        // Only resize if canvas is in the DOM
        if (!this.canvas || this.canvas.getRootNode() !== document) {
            return;
        }

        if (this.canvas.clientWidth <= 0 || this.canvas.clientHeight <= 0) {
            return;
        }

        if (this._initialConfig.engineConfig?.disableResize) {
            return;
        }

        this.engine.resize();
    };

    // The BasisTextureLoader is depending on the file/url extension.
    // However, it won't work if we are loading the gltf content directly
    // without name/url. With this override, the loader can be used if image url
    // is something like 'https://.../xyz.basis' or if we add mimeType: 'image/basis'
    // to the image json block {mimeType: 'image/basis', uri: 'anything'}.
    private _setupBasisTextureLoader(): void {
        const originalMethod = ThinEngine.prototype.createTexture;

        Reflect.set(ThinEngine.prototype, 'createTexture', function (...args) {
            // args[10]: forcedExtension
            // args[11]: mimeType
            if (args && args.length && args.length > 11 && args[11] === 'image/basis') {
                args[10] = '.basis';
            }

            // @ts-ignore
            return Reflect.apply(originalMethod, this, args);
        });
    }

    private _setupBasisTranscoder(): void {
        const basisTranscoder = this._initialConfig.basisTranscoder ?? {};

        BasisTools.JSModuleURL = Tools.GetBabylonScriptURL(basisTranscoder.urlConfig?.jsModuleUrl ?? '', true);
        BasisTools.WasmModuleURL = basisTranscoder.urlConfig?.wasmModuleUrl ?? '';
    }

    private _setupDracoCompression(): void {
        const dracoCompression = this._initialConfig.dracoCompression ?? {};

        const decoders = dracoCompression.decoders ?? {
            wasmUrl: '',
            wasmBinaryUrl: '',
            fallbackUrl: '',
        };

        if (Object.keys(decoders).length) {
            DracoCompression.Configuration = {
                decoder: decoders,
            };
        }

        if (dracoCompression.defaultNumWorkers && dracoCompression.defaultNumWorkers >= 0) {
            DracoCompression.DefaultNumWorkers = dracoCompression.defaultNumWorkers;
        }
    }

    private _setupKTX2Decoder(): void {
        const ktx2Decoder = this._initialConfig.ktx2Decoder ?? {};

        KhronosTextureContainer2.URLConfig = ktx2Decoder.urlConfig ?? {
            jsDecoderModule: '',
            jsMSCTranscoder: '',
            wasmMSCTranscoder: '',
            wasmUASTCToASTC: '',
            wasmUASTCToBC7: '',
            wasmUASTCToR8_UNORM: null,
            wasmUASTCToRG8_UNORM: null,
            wasmUASTCToRGBA_SRGB: '',
            wasmUASTCToRGBA_UNORM: '',
            wasmZSTDDecoder: '',
        };

        if (ktx2Decoder.defaultNumWorkers && ktx2Decoder.defaultNumWorkers >= 0) {
            KhronosTextureContainer2.DefaultNumWorkers = ktx2Decoder.defaultNumWorkers;
        }
    }

    private _setupMeshoptCompression(): void {
        const meshoptCompression = this._initialConfig.meshoptCompression ?? {};

        const decoder = meshoptCompression.decoder ?? {
            url: '',
        };

        if (Object.keys(decoder).length) {
            MeshoptCompression.Configuration = {
                decoder: decoder,
            };
        }
    }

    private _createFilesInput(config: Config): FilesInput {
        const filesInput = new FilesInput(
            this.engine,
            null,
            (sceneFile: File, scene: Scene) => {
                this.sceneManager.createScene(scene).then(() => {
                    const keepAssets = new KeepAssets();
                    keepAssets.cameras = scene.cameras;

                    const container = new AssetContainer(scene);
                    container.moveAllFromScene(keepAssets);

                    // Avoid frustum clipping for all meshes
                    container.meshes.forEach((mesh: AbstractMesh) => {
                        mesh.alwaysSelectAsActiveMesh = true;
                    });

                    // Add everything from the container into the scene
                    container.addAllToScene();

                    const model = new Model(this.sceneManager, this.observableManager, container);
                    this.sceneManager.models.set(model.name, model);

                    this.observableManager.onModelLoadedObservable.notifyObservers(model);
                });
            },
            null,
            null,
            null,
            null,
            null,
            (sceneFile, scene, message) => {
                this.observableManager.onErrorObservable.notifyObservers(new Error(message));
            },
        );

        filesInput.onProcessFileCallback = (
            file: File,
            name: string,
            extension: string,
            setSceneFileToLoad: (sceneFile: File) => void,
        ) => {
            if (filesInput.filesToLoad && filesInput.filesToLoad.length === 1 && extension) {
                switch (extension.toLowerCase()) {
                    case 'dds':
                    case 'env':
                    case 'hdr': {
                        FilesInput.FilesToLoad[name] = file;
                        return false;
                    }
                    default: {
                        if (Util.isTextureAsset(name)) {
                            setSceneFileToLoad(file);
                        }
                    }
                }
            }

            return true;
        };

        filesInput.loadAsync = (sceneFile, onProgress) => {
            this.toggleDebugMode(true);

            this.sceneManager.dispose();

            const filesToLoad = filesInput.filesToLoad;
            if (filesToLoad.length === 1) {
                const fileName = (filesToLoad[0] as any).correctName;
                if (Util.isTextureAsset(fileName)) {
                    return Promise.resolve(this.sceneManager.loadTextureAsset(`file:${fileName}`));
                }
            }

            return SceneLoader.LoadAsync('file:', sceneFile, this.engine, onProgress).then();
        };

        if (config.enableDragAndDrop && this.canvas) {
            filesInput.monitorElementForDragNDrop(this.canvas);
        }

        filesInput.displayLoadingUI = !!config.sceneConfig?.useLoadingUI;

        return filesInput;
    }
}
