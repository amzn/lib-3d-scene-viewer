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

import '@babylonjs/core/Rendering/boundingBoxRenderer';
import '@babylonjs/core/Rendering/prePassRendererSceneComponent';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Layer } from '@babylonjs/core/Layers/layer';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
import { PostProcessRenderEffect } from '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderEffect';
import { PostProcessRenderPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipeline';
import { IDisposable, Scene } from '@babylonjs/core/scene';
import { deepmerge } from 'deepmerge-ts';

import { Camera } from '../camera/camera';
import { CameraConfig } from '../config/cameraConfig';
import { Config } from '../config/config';
import { LightingConfig } from '../config/lightingConfig';
import { RenderingPipelineConfig } from '../config/renderingPipelineConfig';
import { SceneConfig } from '../config/sceneConfig';
import { Lighting } from '../lighting/lighting';
import { Model } from '../model/model';
import { Constant } from '../util';

import { ObservableManager } from './observableManager';

/**
 * SceneManager manages all resources in the scene
 */
export class SceneManager implements IDisposable {
    private _DEFAULT_RENDERING_PIPELINE_NAME: string = 'DefaultRenderingPipeline';

    private _scene: Scene;

    private _config: Config;

    private readonly _engine: Engine;

    private _lighting: Lighting | null;

    private _camera: Camera | null;

    private readonly _observableManager: ObservableManager;

    private _renderingPipelines: Map<string, PostProcessRenderPipeline> = new Map<string, PostProcessRenderPipeline>();

    private readonly _models: Map<string, Model>;

    private _renderLoopStarted: boolean;

    private _backgroundColorWithSeparateCameraEnabled: boolean;

    /**
     * Instantiate a new SceneManager
     * @param engine - Babylon Engine that is responsible for interfacing with all lower-level APIs such as WebGL and Audio
     * @param config - an instance of {@link Config} that holds all configurable parameters for the viewer
     * @param observableManager - an instance of {@link ObservableManager}
     */
    public constructor(engine: Engine, config: Config, observableManager: ObservableManager) {
        this._engine = engine;

        this._config = deepmerge({}, config);

        this._observableManager = observableManager;

        this._observableManager.onSceneCreatedObservable.add(() => {
            this.updateConfig(this.config).then();
        });

        this._observableManager.onModelLoadedObservable.add(() => {
            this.runRenderLoop();
        });

        this._models = new Map<string, Model>();

        this._renderLoopStarted = false;

        this._backgroundColorWithSeparateCameraEnabled = false;
    }

    /**
     * Represents a BabylonJS scene to be rendered by the engine
     */
    public get scene(): Scene {
        return this._scene;
    }

    /**
     * The latest state of {@link Config}
     */
    public get config(): Config {
        return this._config;
    }

    /**
     * A map of {@link Model} that are loaded.
     * Key - model name
     * Value - model
     */
    public get models(): Map<string, Model> {
        return this._models;
    }

    /**
     * Create the scene. Calling this function again will dispose the old scene, if exists.
     * @param newScene - if provided, use it instead of creating a new Scene
     * @returns a promise of Scene
     */
    public createScene(newScene?: Scene): Promise<Scene> {
        // If the scene exists, dispose it.
        if (this.scene) {
            this.dispose();
        }

        this._renderLoopStarted = false;

        if (newScene) {
            // If newScene provided, use it.
            this._scene = newScene;
        } else {
            // Create a new scene
            this._scene = new Scene(this._engine);
        }

        this._engine.clearInternalTexturesCache();
        this._scene.skipFrustumClipping = true;

        this._observableManager.onSceneCreatedObservable.notifyObservers(this.scene);
        return Promise.resolve(this.scene);
    }

    /**
     * This will update the scene's configuration, including camera, lights, environment, etc.
     * @param newConfig - defines the delta that should be configured. This includes only the changes.
     */
    public async updateConfig(newConfig: Partial<Config>): Promise<void> {
        this._config = deepmerge(this.config, newConfig);
        this._observableManager.onConfigChangedObservable.notifyObservers(this.config);

        // Update scene
        if (newConfig.sceneConfig) {
            this._configureScene(this.config.sceneConfig!);
        }

        // Update lighting
        if (newConfig.lightingConfig) {
            this._configureLighting(this.config.lightingConfig!);
        }

        // Update camera
        if (!this._camera) {
            this._camera = new Camera(this, this._observableManager);
        }
        if (newConfig.cameraConfig) {
            if (this._camera.willAddOrRemoveCameras(newConfig.cameraConfig)) {
                this._renderingPipelines.forEach((renderingPipeline: PostProcessRenderPipeline) => {
                    renderingPipeline.dispose();
                });
                this._renderingPipelines.clear();
            }

            await this._configureCamera(this.config.cameraConfig!);
        }

        // Update rendering pipelines
        if (this.config.renderingPipelineConfig) {
            this._configRenderingPipelines(this.config.renderingPipelineConfig);
        }
    }

    /**
     * Load texture asset from URL into a newly created Scene
     * @param url - defines the url of the picture to load as a texture
     * @returns a new Scene
     */
    public loadTextureAsset(url: string): Scene {
        const scene = new Scene(this._engine);
        const plane = MeshBuilder.CreatePlane('Plane', { size: 1 }, scene);
        plane.isPickable = false;

        const texture = new Texture(
            url,
            scene,
            undefined,
            undefined,
            Texture.NEAREST_LINEAR,
            () => {
                const size = texture.getBaseSize();
                if (size.width > size.height) {
                    plane.scaling.y = size.height / size.width;
                } else {
                    plane.scaling.x = size.width / size.height;
                }

                texture.gammaSpace = true;
                texture.hasAlpha = true;
                texture.wrapU = Texture.CLAMP_ADDRESSMODE;
                texture.wrapV = Texture.CLAMP_ADDRESSMODE;
            },
            null,
        );

        const material = new PBRMaterial('UnlitPBRMaterial', scene);
        material.unlit = true;
        material.albedoTexture = texture;
        material.alphaMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
        plane.material = material;

        return scene;
    }

    /**
     * Register and execute a render loop
     */
    public runRenderLoop(): void {
        if (!this.scene || this._renderLoopStarted) {
            return;
        }

        this.scene.whenReadyAsync().then(() => {
            this._engine.runRenderLoop(() => {
                // WebGL canvas does not receive 'resize' event properly.
                // In every rendering frame, try to resize.
                if (this.config.engineConfig?.engineOptions?.disableWebGL2Support) {
                    const hardwareScalingLevel = this._engine.getHardwareScalingLevel();
                    const canvas = this._engine.getRenderingCanvas();
                    if (canvas) {
                        const realWidth = canvas.clientWidth / hardwareScalingLevel;
                        const realHeight = canvas.clientHeight / hardwareScalingLevel;
                        canvas.width = realWidth;
                        canvas.height = realHeight;
                    }
                }

                this.scene.render();
                this._observableManager.onFrameRenderedObservable.notifyObservers(null);
            });
        });

        this._renderLoopStarted = true;
    }

    /**
     * Stop executing a render loop
     */
    public stopRenderLoop(): void {
        if (!this.scene || !this._renderLoopStarted) {
            return;
        }

        this._engine.stopRenderLoop();
        this._renderLoopStarted = false;
    }

    /**
     * Release all the resources held by {@link SceneManager}
     */
    public dispose(): void {
        if (this._lighting) {
            this._lighting.dispose();
            this._lighting = null;
        }

        if (this._camera) {
            this._camera.dispose();
            this._camera = null;
        }

        if (this._renderingPipelines) {
            this._renderingPipelines.forEach((renderingPipeline: PostProcessRenderPipeline) => {
                renderingPipeline.dispose();
            });
            this.scene?.postProcessRenderPipelineManager?.dispose();
            this._renderingPipelines.clear();
        }

        this._backgroundColorWithSeparateCameraEnabled = false;

        if (this.models) {
            this.models.forEach((model: Model) => {
                model.removeFromScene();
                model.dispose();
            });
            this.models.clear();
        }

        if (this.scene) {
            this.scene.dispose();
        }
    }

    private _configureScene(sceneConfig: SceneConfig): void {
        if (!this.scene) {
            return;
        }

        // Clear color
        this.scene.clearColor = sceneConfig.clearColor ?? Color4.FromColor3(Color3.White());

        // Bounding box color
        this.scene.getBoundingBoxRenderer().frontColor =
            sceneConfig.boundingBoxFrontColor ?? Color3.FromHexString('#EBA832');
        this.scene.getBoundingBoxRenderer().backColor = sceneConfig.boundingBoxBackColor ?? Color3.Magenta();

        this._observableManager.onSceneConfiguredObservable.notifyObservers({
            sceneManager: this,
            object: this.scene,
            newConfig: sceneConfig,
        });
    }

    private _configureLighting(lightingConfig: LightingConfig): void {
        if (!this._lighting) {
            this._lighting = new Lighting(this);
        }

        this._lighting.updateLighting(lightingConfig).then(() => {
            if (!this._lighting) {
                return;
            }

            this._observableManager.onLightingConfiguredObservable.notifyObservers({
                sceneManager: this,
                object: this._lighting,
                newConfig: lightingConfig,
            });
        });
    }

    private async _configureCamera(cameraConfig: CameraConfig): Promise<void> {
        if (!this._camera) {
            return;
        }

        await this._camera.updateCameras(cameraConfig);

        this._observableManager.onCamerasConfiguredObservable.notifyObservers({
            sceneManager: this,
            object: this._camera,
            newConfig: cameraConfig,
        });
    }

    private _configRenderingPipelines(renderingPipelineConfig: RenderingPipelineConfig): void {
        this._configDefaultRenderingPipeline(renderingPipelineConfig);
        this._configSSAO2RenderingPipeline(renderingPipelineConfig);
    }

    private _configDefaultRenderingPipeline(renderingPipelineConfig: RenderingPipelineConfig): void {
        const defaultRenderingPipelineConfig = renderingPipelineConfig.defaultRenderingPipeline || {};
        let renderingPipeline = this._renderingPipelines.get(this._DEFAULT_RENDERING_PIPELINE_NAME);

        if (defaultRenderingPipelineConfig.enable ?? true) {
            if (!renderingPipeline) {
                renderingPipeline = new DefaultRenderingPipeline(
                    this._DEFAULT_RENDERING_PIPELINE_NAME,
                    true,
                    this.scene,
                    this.scene.cameras.filter((camera) => camera.name !== Constant.DEPTH_MAP_SHADOW_CAMERA),
                );
                this._renderingPipelines.set(this._DEFAULT_RENDERING_PIPELINE_NAME, renderingPipeline);
            }

            const defaultRenderingPipeline = renderingPipeline as DefaultRenderingPipeline;

            if (defaultRenderingPipeline.isSupported) {
                defaultRenderingPipeline.imageProcessingEnabled =
                    defaultRenderingPipelineConfig.imageProcessing?.enable ?? true;
                if (defaultRenderingPipeline.imageProcessingEnabled) {
                    const imageProcessingConfig = defaultRenderingPipelineConfig.imageProcessing || {};
                    defaultRenderingPipeline.imageProcessing.contrast = imageProcessingConfig.contrast ?? 1;
                    defaultRenderingPipeline.imageProcessing.exposure = imageProcessingConfig.exposure ?? 1;
                    defaultRenderingPipeline.imageProcessing.toneMappingEnabled =
                        imageProcessingConfig.toneMappingEnabled ?? false;
                    defaultRenderingPipeline.imageProcessing.toneMappingType =
                        imageProcessingConfig.toneMappingType ?? 0;
                }
            }

            defaultRenderingPipeline.fxaaEnabled = defaultRenderingPipelineConfig.fxaaEnabled ?? false;
            defaultRenderingPipeline.samples = defaultRenderingPipelineConfig.samples ?? 1;

            // Must be executed before this._enableBackgroundColorWithSeparateCamera()
            this.scene.postProcessRenderPipelineManager.addPipeline(defaultRenderingPipeline);

            if (defaultRenderingPipeline.imageProcessingEnabled) {
                this._enableBackgroundColorWithSeparateCamera();
            }
        } else {
            renderingPipeline?.dispose();
        }
    }

    private _configSSAO2RenderingPipeline(renderingPipelineConfig: RenderingPipelineConfig): void {
        const ssao2RenderingPipelineConfig = renderingPipelineConfig.ssao2RenderingPipeline || {};
        let renderingPipeline = this._renderingPipelines.get('SSAO2RenderingPipeline');

        if (ssao2RenderingPipelineConfig.enable ?? false) {
            if (!renderingPipeline) {
                let ratio: unknown = ssao2RenderingPipelineConfig.ratio ?? 0.5;
                if (
                    ssao2RenderingPipelineConfig.ssaoRatio &&
                    ssao2RenderingPipelineConfig.blurRatio &&
                    ssao2RenderingPipelineConfig.combineRatio
                ) {
                    ratio = {
                        ssaoRatio: ssao2RenderingPipelineConfig.ssaoRatio,
                        blurRatio: ssao2RenderingPipelineConfig.blurRatio,
                        combineRatio: ssao2RenderingPipelineConfig.combineRatio,
                    };
                }
                renderingPipeline = new SSAO2RenderingPipeline(
                    'SSAO2RenderingPipeline',
                    this.scene,
                    ratio,
                    this.scene.cameras.filter((camera) => camera.name !== Constant.DEPTH_MAP_SHADOW_CAMERA),
                    ssao2RenderingPipelineConfig.forceGeometryBuffer ?? false,
                );
                this._renderingPipelines.set('SSAO2RenderingPipeline', renderingPipeline);
            }
            const ssao2RenderingPipeline = renderingPipeline as SSAO2RenderingPipeline;

            ssao2RenderingPipeline.textureSamples = ssao2RenderingPipelineConfig.textureSamples ?? 1;
            ssao2RenderingPipeline.samples = ssao2RenderingPipelineConfig.samples ?? 1;
            ssao2RenderingPipeline.expensiveBlur = ssao2RenderingPipelineConfig.expensiveBlur ?? true;
            this.scene.postProcessRenderPipelineManager.addPipeline(ssao2RenderingPipeline);
        } else {
            renderingPipeline?.dispose();
        }
    }

    /**
     * Retrieves the last post process from the given rendering pipeline.
     *
     * @param renderingPipelineName - The rendering pipeline to retrieve the post process from.
     * @returns the last post process in the pipeline, or null if none exists.
     */
    private _getLastPostProcess(renderingPipelineName: string): PostProcess | null {
        const renderPipeline = this._renderingPipelines.get(renderingPipelineName);
        if (!renderPipeline) {
            return null;
        }

        const renderEffects = (renderPipeline as any)._renderEffects;

        const effectKeys = Object.keys(renderEffects);
        if (effectKeys.length === 0) {
            return null;
        }

        // Get the post processes for the last effect key
        const lastEffect = renderEffects[effectKeys[effectKeys.length - 1]];
        if (!lastEffect) {
            return null;
        }

        const postProcesses = lastEffect.getPostProcesses();
        if (!postProcesses || postProcesses.length === 0) {
            return null;
        }

        return postProcesses[postProcesses.length - 1];
    }

    /**
     * Enables the `forceAutoClearInAlphaMode` property on all post-process effects
     * within the specified rendering pipeline. This ensures that each post-process
     * automatically clears the texture buffer, helping to prevent visual streaking
     * issues during rendering.
     *
     * @param renderingPipelineName - The rendering pipeline to retrieve the post process from.
     */
    private _setPostProcessForceAutoClearInAlphaMode(renderingPipelineName: string): void {
        const renderPipeline = this._renderingPipelines.get(renderingPipelineName);
        if (!renderPipeline) {
            return;
        }

        const renderEffects = (renderPipeline as any)._renderEffects;

        for (const renderEffect of Object.values(renderEffects)) {
            (renderEffect as PostProcessRenderEffect)?.getPostProcesses()?.forEach((postProcess: PostProcess) => {
                postProcess.forceAutoClearInAlphaMode = true;
            });
        }
    }

    /**
     * Enables a separate camera for rendering the background color.
     * If no post-processing pipeline or last post-process is found, the function will log an error or warning.
     */
    private _enableBackgroundColorWithSeparateCamera(): void {
        if (this._backgroundColorWithSeparateCameraEnabled) {
            return;
        }

        this._backgroundColorWithSeparateCameraEnabled = true;

        // Set background color
        const bgLayer: Layer = new Layer('BackgroundLayer', null, this.scene, true);
        bgLayer.texture = RawTexture.CreateRGBATexture(
            new Uint8Array([255, 255, 255, 255]),
            1,
            1,
            this.scene,
            false,
            false,
            Constants.TEXTURE_NEAREST_SAMPLINGMODE,
        );
        const bgColor = this.config.sceneConfig?.clearColor ?? new Color4(1, 1, 1, 1);
        bgLayer.color = bgColor;
        this.scene.clearColor = new Color4(bgColor.r, bgColor.g, bgColor.b, 0);

        // Get background camera, if the camera doesn't exist, create it
        let bgCamera = this.scene.getCameraByName(Constant.BACKGROUND_CAMERA);
        if (!bgCamera) {
            bgCamera = new ArcRotateCamera(Constant.BACKGROUND_CAMERA, 0, 0, 1, Vector3.Zero(), this.scene);
        }

        // Set layer mask
        bgCamera.layerMask = 0x10000000;
        bgLayer.layerMask = 0x10000000;

        // Set active cameras
        // BackgroundCamera must be the first active camera
        if (this.scene.activeCameras?.length) {
            this.scene.activeCameras = [bgCamera, ...this.scene.activeCameras];
        } else if (this.scene.activeCamera) {
            this.scene.activeCameras = [bgCamera, this.scene.activeCamera];
        }

        // Enables the `forceAutoClearInAlphaMode` property on all post-process effects
        this._setPostProcessForceAutoClearInAlphaMode(this._DEFAULT_RENDERING_PIPELINE_NAME);

        // Get last post process
        const lastPostProcess = this._getLastPostProcess(this._DEFAULT_RENDERING_PIPELINE_NAME);

        // Blend render camera post process with background layer
        if (lastPostProcess) {
            lastPostProcess.alphaMode = Constants.ALPHA_COMBINE;
        }
    }
}
