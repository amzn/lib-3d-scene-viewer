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

import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { AssetContainer } from '@babylonjs/core/assetContainer';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { BoundingBox } from '@babylonjs/core/Culling/boundingBox';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Space } from '@babylonjs/core/Maths/math.axis';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { GroundMesh } from '@babylonjs/core/Meshes/groundMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Logger } from '@babylonjs/core/Misc/logger';
import { Node } from '@babylonjs/core/node';
import { BlurPostProcess } from '@babylonjs/core/PostProcesses/blurPostProcess';
import { IDisposable } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';
import { ShadowOnlyMaterial } from '@babylonjs/materials/shadowOnly/shadowOnlyMaterial';

import { ObservableManager } from '../manager/observableManager';
import { SceneManager } from '../manager/sceneManager';
import { DepthPluginMaterial } from '../material/depthMaterial';
import { Constant } from '../util';

/**
 * Represent a group of nodes within the scene that are associated with each other
 */
export class Model implements IDisposable {
    private readonly _name: string;

    private readonly _sceneManager: SceneManager;

    private _observableManager: ObservableManager;

    private readonly _container: AssetContainer;

    private readonly _rootMesh: Mesh;

    private _removedFromScene: boolean;

    private _shadowLight: DirectionalLight;

    private _shadowGenerator: ShadowGenerator;

    private _shadowMaterial: ShadowOnlyMaterial;

    private _shadowPlane: GroundMesh;

    private _depthMapShadowCamera: FreeCamera;

    private _depthMapShadowMaterial: StandardMaterial;

    private _depthMapRenderTargetTexture: RenderTargetTexture;

    private _depthMapRTTMaterial: StandardMaterial;

    private _depthMapShadowPlane: GroundMesh;

    // Map of mesh.uniqueId --> mesh.material.uniqueId before matcap
    private readonly _matcapPriorMaterialMap: Map<number, number>;

    private _matcapTextureUrl: string;

    private _matcapMaterial: Material;

    private _boundingBoxMesh: Mesh;

    /**
     * Instantiate a new {@link Model}
     * @param sceneManager - an instance of {@link SceneManager}
     * @param observableManager - an instance of {@link ObservableManager}
     * @param container - container with a set of assets that can be added or removed from a scene
     * @param name - the name of this model
     */
    public constructor(
        sceneManager: SceneManager,
        observableManager: ObservableManager,
        container: AssetContainer,
        name?: string,
    ) {
        this._sceneManager = sceneManager;
        this._observableManager = observableManager;
        this._container = container;
        this._rootMesh = this._container.createRootMesh();
        this._removedFromScene = false;
        this._matcapPriorMaterialMap = new Map<number, number>();
        if (name) {
            this._name = name;
        }
    }

    /**
     * The name of this model
     */
    public get name(): string {
        if (this._name) {
            return this._name;
        } else {
            return this.uniqueId;
        }
    }

    /**
     * The unique id of the model
     */
    public get uniqueId(): string {
        return `${this.rootMesh.uniqueId}`;
    }

    /**
     * Asset container root mesh of this model.
     * It's the ancestor of all meshes in this model, including bounding box meshes, shadow plane meshes, etc.
     */
    public get rootMesh(): Mesh {
        return this._rootMesh;
    }

    /**
     * Get all child-meshes of the root mesh
     * @param predicate - defines an optional predicate that will be called on every evaluated child,
     *                    the predicate must return true for a given child to be part of the result,
     *                    otherwise it will be ignored.
     *                    By default, excludes bounding box meshes, shadow plane meshes, etc.
     * @returns an array of AbstractMesh that pass the test
     */
    public getChildMeshes(predicate?: ((mesh: AbstractMesh) => boolean) | undefined): AbstractMesh[] {
        return this.rootMesh.getChildMeshes().filter(predicate ?? this._getModelMeshPredicate());
    }

    /**
     * Get a BABYLON object of the overall bounding box.
     * If the model has already been removed from scene, it returns BoundingBox(Vector3.Zero(), Vector3.Zero()).
     * @returns bounding box information in BoundingBox
     */
    public getOverallBoundingBox(): BoundingBox {
        if (this.isRemovedFromScene()) {
            return new BoundingBox(Vector3.Zero(), Vector3.Zero());
        }

        const boundaries = this.rootMesh.getHierarchyBoundingVectors(true, this._getModelMeshPredicate());
        return new BoundingBox(boundaries.min, boundaries.max);
    }

    /**
     * Get overall bounding box's world's x, y, z dimensions.
     * If the model has already been removed from scene, it returns Vector3.Zero().
     * @returns x, y, z dimensions in Vector3
     */
    public getOverallBoundingBoxDimensions(): Vector3 {
        if (this.isRemovedFromScene()) {
            return Vector3.Zero();
        }

        const boundingBox = this.getOverallBoundingBox();
        const vector = boundingBox.minimumWorld.subtract(boundingBox.maximumWorld);
        const dimensionX = Math.abs(vector.x);
        const dimensionY = Math.abs(vector.y);
        const dimensionZ = Math.abs(vector.z);
        return new Vector3(dimensionX, dimensionY, dimensionZ);
    }

    /**
     * Check whether the model is removed from the scene
     * @returns `true` if the model is removed from the scene, else `false`
     */
    public isRemovedFromScene(): boolean {
        return this._removedFromScene;
    }

    /**
     * Remove all the resources held by {@link Model} from the scene
     */
    public removeFromScene(): void {
        if (this.isRemovedFromScene()) {
            return;
        }

        this.removeShadowOnGround();

        this.removeShadowOnGroundDepthMap();

        this._boundingBoxMesh?.dispose();

        this._container?.removeAllFromScene();

        if (this._sceneManager) {
            this._sceneManager.models.delete(this.name);
        }

        this._removedFromScene = true;

        this._matcapPriorMaterialMap.clear();

        this._matcapMaterial?.dispose(undefined, true, undefined);

        this._observableManager.onModelRemovedObservable.notifyObservers(this);
    }

    /**
     * Turn on/off wireframe mode
     * @param forceEnabled - force the wireframe mode to be enabled or disabled
     */
    public toggleWireframe(forceEnabled?: boolean): void {
        if (this.isRemovedFromScene()) {
            return;
        }

        const materialUniqueIdSet: Set<number> = new Set<number>();

        this.rootMesh
            .getChildMeshes()
            .filter(this._getModelMeshPredicate())
            .forEach((mesh) => {
                if (!mesh.material || materialUniqueIdSet.has(mesh.material.uniqueId)) {
                    return;
                }
                mesh.material.wireframe = forceEnabled === undefined ? !mesh.material.wireframe : forceEnabled;
                materialUniqueIdSet.add(mesh.material.uniqueId);
            });
    }

    /**
     * Toggle the visibility of the model
     * @param visible - force the model to be visible or invisible
     */
    public toggleVisibility(visible?: boolean): void {
        if (this.isRemovedFromScene()) {
            return;
        }

        if (this._container) {
            this._container.meshes.forEach((mesh: AbstractMesh) => {
                const enable = visible === undefined ? !mesh.isEnabled(false) : visible;
                mesh.setEnabled(enable);
            });
        }
    }

    /**
     * Turn on/off matcap mode
     * @param matcapTextureUrl - url of matcap texture to be used
     * @param forceEnabled - force the matcap mode to be enabled or disabled
     */
    public toggleMatcapMode(matcapTextureUrl: string, forceEnabled?: boolean): void {
        if (this.isRemovedFromScene()) {
            return;
        }

        if (!this._matcapMaterial || !this._matcapTextureUrl || this._matcapTextureUrl !== matcapTextureUrl) {
            this._createMatcapMaterial(matcapTextureUrl);
        }

        if (!this._matcapPriorMaterialMap || this._matcapPriorMaterialMap.size === 0) {
            if (forceEnabled !== undefined && !forceEnabled) {
                return;
            }
            // Matcap Mode is off, turn it on
            this.rootMesh
                .getChildMeshes()
                .filter(this._getModelMeshPredicate())
                .forEach((mesh) => {
                    if (mesh.material) {
                        this._matcapPriorMaterialMap.set(mesh.uniqueId, mesh.material.uniqueId);
                        const wireFrameSetting = mesh.material.wireframe;
                        mesh.material = this._matcapMaterial;
                        mesh.material.wireframe = wireFrameSetting;
                    }
                });
        } else {
            if (forceEnabled) {
                return;
            }
            // Matcap Mode is on, turn it off
            this.rootMesh
                .getChildMeshes()
                .filter(this._getModelMeshPredicate())
                .forEach((mesh) => {
                    if (mesh.material) {
                        const oldMaterialUniqueId = this._matcapPriorMaterialMap.get(mesh.uniqueId);
                        if (oldMaterialUniqueId === undefined) {
                            Logger.Warn('Matcap Old Material Unique Id not found.');
                        } else {
                            const wireFrameSetting = mesh.material.wireframe;
                            mesh.material = this._sceneManager.scene.getMaterialByUniqueID(oldMaterialUniqueId);
                            if (mesh.material) {
                                mesh.material.wireframe = wireFrameSetting;
                            }
                        }
                    }
                });
            this._matcapPriorMaterialMap.clear();
        }
    }

    /**
     * Toggle the visibility of the bounding box mesh
     * @param visible - force the bounding box mesh to be visible or invisible
     */
    public toggleBoundingBox(visible?: boolean): void {
        if (this.isRemovedFromScene()) {
            return;
        }

        if (!this._boundingBoxMesh) {
            this._createBoundingBoxMesh();
        }

        const enable = visible === undefined ? !this._boundingBoxMesh.isEnabled(false) : visible;
        this._boundingBoxMesh.setEnabled(enable);
    }

    /**
     * Add soft shadow on ground using shadow light from top down.
     * @param shadowValue - Range from 0 to 1. The value will be applied to shadow color's R, G, B.
     * @param blurKernel - Kernel size of the blur pass.
     * @param shadowLightAtBoundingBoxTop - Set up the init position of shadow light.
     *                                      True: place shadow light at the max Y of the overall bounding box.
     *                                      False: place shadow light at the min Y of the overall bounding box.
     * @param shadowLightHeightOffset - Additional Y direction offset for shadow light from the init position.
     * @param depthScale - The depth scale factor used to improve the shadow quality by adjusting depth precision.
     * @param bias - A small bias value applied to the shadow map to reduce shadow acne (unwanted shadow artifacts).
     * @param normalBias - A bias value applied in the direction of the geometry's normals to further reduce self-shadowing artifacts.
     *
     * @example
     * ```
     * // Example usage
     * model.showShadowOnGround(0.3, 120, true, 0.15, 1);
     * ```
     */
    public showShadowOnGround(
        shadowValue: number = 0.3,
        blurKernel: number = 128,
        shadowLightAtBoundingBoxTop: boolean = true,
        shadowLightHeightOffset: number = 0.0,
        depthScale: number = 50,
        bias: number = 0.0005,
        normalBias: number = 0.0,
    ): void {
        if (this.isRemovedFromScene()) {
            return;
        }

        // Removes the depth map-based ground contact shadow if it exists in the scene
        this.removeShadowOnGroundDepthMap();

        const boundingBox = this.getOverallBoundingBox();
        const boundingBoxDimensions = this.getOverallBoundingBoxDimensions();
        const shadowLightInitHeight = shadowLightAtBoundingBoxTop
            ? boundingBox.maximumWorld.y
            : boundingBox.minimumWorld.y;
        const shadowLightHeight = shadowLightInitHeight + shadowLightHeightOffset;
        shadowValue = Math.max(0, Math.min(1, shadowValue));

        // Shadow Light
        this._shadowLight = new DirectionalLight(
            Constant.DIRECTIONAL_SHADOW_LIGHT,
            new Vector3(0, -1, 0),
            this._sceneManager.scene,
        );
        this._shadowLight.position.y = shadowLightHeight;
        this._shadowLight.intensity = 0;
        this._shadowLight.shadowMinZ = 0;
        this._shadowLight.parent = this.rootMesh;

        // Shadow Generator
        this._shadowGenerator = new ShadowGenerator(1024, this._shadowLight);
        this._container.meshes.forEach((mesh) => {
            this._shadowGenerator.addShadowCaster(mesh);
        });
        this._shadowGenerator.forceBackFacesOnly = true;
        this._shadowGenerator.useBlurExponentialShadowMap = true;
        this._shadowGenerator.useKernelBlur = true;
        this._shadowGenerator.blurKernel = blurKernel;
        this._shadowGenerator.depthScale = depthScale;
        this._shadowGenerator.bias = bias;
        this._shadowGenerator.normalBias = normalBias;

        // Shadow Material
        this._shadowMaterial = new ShadowOnlyMaterial(Constant.SHADOW_ONLY_MATERIAL, this._sceneManager.scene);
        this._shadowMaterial.shadowColor = new Color3(shadowValue, shadowValue, shadowValue);
        this._shadowMaterial.activeLight = this._shadowLight;

        // Shadow Plane Mesh
        const shadowPlaneSize = 2 * Math.max(boundingBoxDimensions.x, boundingBoxDimensions.z);
        this._shadowPlane = MeshBuilder.CreateGround(
            Constant.SHADOW_PLANE,
            {
                width: shadowPlaneSize,
                height: shadowPlaneSize,
            },
            this._sceneManager.scene,
        );
        this._shadowPlane.position.x = boundingBox.centerWorld.x;
        this._shadowPlane.position.y = boundingBox.minimumWorld.y;
        this._shadowPlane.position.z = boundingBox.centerWorld.z;
        this._shadowPlane.material = this._shadowMaterial;
        this._shadowPlane.receiveShadows = true;
        this._shadowPlane.setParent(this.rootMesh);
    }

    /**
     * Removes all elements associated with the shadow light-based ground contact shadow
     */
    public removeShadowOnGround(): void {
        this._shadowPlane?.dispose();
        this._shadowMaterial?.dispose();
        this._shadowGenerator?.dispose();
        this._shadowLight?.dispose();
    }

    /**
     * Creates and displays a contact shadow on the ground using a depth map from bottom up
     * The shadow can be blurred to create a softer effect.
     *
     * @param options Optional parameters to configure the shadow rendering.
     * @param options.bottomUpCalculationRatio
     *                The ratio used to calculate the camera's maxZ for the depth map rendering.
     *                Defaults to `1.0`.
     * @param options.darkness
     *                The darkness of the shadow, with `1.0` being fully dark and `0.0` being fully transparent.
     *                Defaults to `1.15`.
     * @param options.gamma
     *                The gamma correction applied to the depth map for the shadow.
     *                Defaults to `0.4`.
     * @param options.blurriness
     *                The amount of blurriness applied to the shadow. Higher values create a softer shadow.
     *                Defaults to `110`.
     * @param options.shadowMapResolution
     *                The resolution of shadow texture map on ground. If the shadow map resolution is changed,
     *                the blurriness value will need to be adjusted proportionally.
     *                Defaults to `1024`.
     *
     * @example
     * ```
     * // Example usage
     * model.showShadowOnGroundDepthMap({
     *     bottomUpCalculationRatio: 1.0,
     *     darkness: 1.15,
     *     gamma: 0.4,
     *     blurriness: 110,
     *     shadowMapResolution: 1024,
     * });
     * ```
     */
    public showShadowOnGroundDepthMap(
        options: {
            bottomUpCalculationRatio?: number;
            darkness?: number;
            gamma?: number;
            blurriness?: number;
            shadowMapResolution?: number;
        } = {},
    ): void {
        if (this.isRemovedFromScene()) {
            return;
        }

        // Removes the shadow light-based ground contact shadow if it exists in the scene
        this.removeShadowOnGround();

        // Extract options with default values
        const {
            bottomUpCalculationRatio = 1.0,
            darkness = 1.15,
            gamma = 0.4,
            blurriness = 110,
            shadowMapResolution = 1024,
        } = options;

        // Fetch model bounding box data
        const boundingBox = this.getOverallBoundingBox();
        const boundingBoxDimensions = this.getOverallBoundingBoxDimensions();

        // Create shadow plane mesh
        const shadowPlaneSize = 2 * Math.max(boundingBoxDimensions.x, boundingBoxDimensions.z);
        this._depthMapShadowPlane = MeshBuilder.CreateGround(
            Constant.DEPTH_MAP_SHADOW_PLANE,
            {
                width: shadowPlaneSize,
                height: shadowPlaneSize,
            },
            this._sceneManager.scene,
        );
        this._depthMapShadowPlane.position.x = boundingBox.centerWorld.x;
        this._depthMapShadowPlane.position.y = boundingBox.minimumWorld.y;
        this._depthMapShadowPlane.position.z = boundingBox.centerWorld.z;
        this._depthMapShadowPlane.setParent(this.rootMesh);

        // Create bottom camera for ground depth shadow
        const depthCamZOffset = boundingBoxDimensions.y * 0.005;
        this._depthMapShadowCamera = new FreeCamera(
            Constant.DEPTH_MAP_SHADOW_CAMERA,
            new Vector3(
                boundingBox.centerWorld.x,
                boundingBox.minimumWorld.y - depthCamZOffset,
                boundingBox.centerWorld.z,
            ),
            this._sceneManager.scene,
        );
        this._depthMapShadowCamera.rotation = new Vector3(-0.5 * Math.PI, 0, 0);
        this._depthMapShadowCamera.minZ = 0;
        this._depthMapShadowCamera.maxZ = bottomUpCalculationRatio * boundingBoxDimensions.y + depthCamZOffset;
        this._depthMapShadowCamera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        this._depthMapShadowCamera.orthoLeft = -shadowPlaneSize / 2;
        this._depthMapShadowCamera.orthoRight = shadowPlaneSize / 2;
        this._depthMapShadowCamera.orthoTop = shadowPlaneSize / 2;
        this._depthMapShadowCamera.orthoBottom = -shadowPlaneSize / 2;
        this._depthMapShadowCamera.parent = this.rootMesh;

        // Create Render Target Texture for ground shadow
        this._depthMapRenderTargetTexture = new RenderTargetTexture(
            Constant.DEPTH_MAP_RENDER_TARGET_TEXTURE,
            shadowMapResolution,
            this._sceneManager.scene,
            { generateMipMaps: false },
        );
        this._depthMapRenderTargetTexture.clearColor = new Color4(0, 0, 0, 0);
        this._depthMapRenderTargetTexture.activeCamera = this._depthMapShadowCamera;
        this._depthMapRenderTargetTexture.uScale = this._sceneManager.scene.useRightHandedSystem ? -1 : 1;
        this._depthMapRenderTargetTexture.vScale = -1;
        this._depthMapRenderTargetTexture.useCameraPostProcesses = true;
        if (!this._depthMapRenderTargetTexture.renderList) {
            this._depthMapRenderTargetTexture.renderList = [];
        }
        this._sceneManager.scene.customRenderTargets.push(this._depthMapRenderTargetTexture);

        // Create depth map Render Target Texture (RTT) material,
        // this material is used for calculating depth map from this._depthShadowCamera
        this._depthMapRTTMaterial = new StandardMaterial(Constant.DEPTH_MAP_RTT_MATERIAL, this._sceneManager.scene);
        const meshList: AbstractMesh[] = [];
        const depthPluginMaterial = new DepthPluginMaterial(this._depthMapRTTMaterial);
        (this._depthMapRTTMaterial as any).depthMaterial = depthPluginMaterial;
        depthPluginMaterial.enabled = true;
        depthPluginMaterial.darkness = darkness;
        depthPluginMaterial.gamma = gamma;

        // Loop through all meshes of given asset to calculate depth map
        this.getChildMeshes().forEach((mesh) => {
            meshList.push(mesh);
            this._depthMapRenderTargetTexture.renderList?.push(mesh);
        });
        this._depthMapRenderTargetTexture.setMaterialForRendering(meshList, this._depthMapRTTMaterial);

        // Create shadow plane material
        this._depthMapShadowMaterial = new StandardMaterial(
            Constant.DEPTH_MAP_SHADOW_MATERIAL,
            this._sceneManager.scene,
        );
        this._depthMapShadowMaterial.disableLighting = true;
        this._depthMapShadowPlane.material = this._depthMapShadowMaterial;

        // Assign shadow render target texture to shadow material
        this._depthMapShadowMaterial.opacityTexture = this._depthMapRenderTargetTexture;

        // Blur shadow
        const blurH = new BlurPostProcess(
            'blurH',
            new Vector2(1, 0),
            blurriness,
            1,
            this._depthMapShadowCamera,
            0,
            this._sceneManager.scene.getEngine(),
        );
        blurH.autoClear = false;
        const blurV = new BlurPostProcess(
            'blurV',
            new Vector2(0, 1),
            blurriness,
            1,
            this._depthMapShadowCamera,
            0,
            this._sceneManager.scene.getEngine(),
        );
        blurV.autoClear = false;
    }

    /**
     * Removes all elements associated with the depth map-based ground contact shadow
     */
    public removeShadowOnGroundDepthMap(): void {
        this._depthMapShadowCamera?.dispose();
        this._depthMapShadowMaterial?.dispose();
        this._depthMapRenderTargetTexture?.dispose();
        this._depthMapRTTMaterial?.dispose();
        this._depthMapShadowPlane?.dispose();
    }

    /**
     * Move entire scene element's root node from the overall bounding box center to a given coordinate in World space.
     * Default is moving to World origin.
     * @param targetCoordinate - target coordinate. Default: Vector3.Zero()
     */
    public moveCenterToTargetCoordinate(targetCoordinate: Vector3 = Vector3.Zero()): void {
        if (this.isRemovedFromScene()) {
            return;
        }

        const boundingBox = this.getOverallBoundingBox();
        const direction = targetCoordinate.subtract(boundingBox.centerWorld).normalize();
        const distance = Vector3.Distance(targetCoordinate, boundingBox.centerWorld);
        this.rootMesh.translate(direction, distance, Space.WORLD);
    }

    /**
     * Check if this model contains the provided mesh
     * @param mesh - the provided mesh
     * @returns true if this model contains the provided mesh, else false
     */
    public hasMesh(mesh: AbstractMesh): boolean {
        return this.hasNode(mesh);
    }

    /**
     * Check if this model contains the provided node
     * @param node - the provided node
     * @returns true if this model contains the provided node, else false
     */
    public hasNode(node: Node): boolean {
        for (const nodeInContainer of this._container.getNodes()) {
            if (nodeInContainer.uniqueId === node.uniqueId) {
                return true;
            }
        }

        return false;
    }

    /**
     * Release all the resources held by {@link Model}
     */
    public dispose(): void {
        this.removeFromScene();

        if (this._container) {
            this._container.dispose();
        }
    }

    private _getModelMeshPredicate(enabledOnly: boolean = true): (mesh: AbstractMesh) => boolean {
        return (mesh: AbstractMesh) => {
            let node: Nullable<Node> = mesh;
            while (node) {
                // Filter out meshes that are not descendants of '__root__' node
                if (node.name === '__root__') {
                    return true;
                }
                // Filter out nodes that are not enabled
                if (enabledOnly && !node.isEnabled(true)) {
                    return false;
                }
                node = node.parent;
            }
            return false;
        };
    }

    private _createBoundingBoxMesh(): void {
        const boundingBox = this.getOverallBoundingBox();
        this._boundingBoxMesh = new Mesh('BoundingBox', this._sceneManager.scene);
        this._boundingBoxMesh.setBoundingInfo(new BoundingInfo(boundingBox.minimumWorld, boundingBox.maximumWorld));
        this._boundingBoxMesh.showBoundingBox = true;
        this._boundingBoxMesh.isPickable = false;
        this._boundingBoxMesh.setParent(this.rootMesh);
        this._boundingBoxMesh.setEnabled(false);
    }

    private _createMatcapMaterial(matcapTextureUrl: string) {
        this._matcapMaterial?.dispose(undefined, true, undefined);

        const matcap = new StandardMaterial(Constant.MATERIAL_CAPTURE_MATERIAL, this._sceneManager.scene);
        matcap.disableLighting = true;
        const matcapTexture = new Texture(matcapTextureUrl, this._sceneManager.scene);
        matcapTexture.coordinatesMode = Texture.SPHERICAL_MODE;
        matcap.reflectionTexture = matcapTexture;
        this._matcapMaterial = matcap;
        this._matcapTextureUrl = matcapTextureUrl;
    }
}
