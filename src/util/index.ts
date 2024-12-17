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

import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StringTools } from '@babylonjs/core/Misc/stringTools';
import { Nullable } from '@babylonjs/core/types';

import { AbstractScene } from '../scene/abstractScene';

export * from './convexHull';

/**
 * Class used to store all common util functions
 */
export class Util {
    /**
     * Check if the file is a texture asset
     * @param name - file name
     * @returns `true` if the file is a texture asset, else `false`
     */
    public static isTextureAsset(name: string): boolean {
        const extensions = ['.ktx', '.ktx2', '.png', '.jpg', '.jpeg', '.basis'];

        const queryStringIndex = name.indexOf('?');
        if (queryStringIndex !== -1) {
            name = name.substring(0, queryStringIndex);
        }

        return extensions.some((extension: string) => StringTools.EndsWith(name, extension));
    }

    /**
     * Create a metallic sphere to the scene
     * @param scene - an instance of class which extends {@link AbstractScene}
     * @param sphereProportionOfScreen - controls the size of sphere
     * @param borderOffsetPx - canvas boarder offset in pixel
     * @param placement - controls where to place the sphere, default: 'top-right'
     */
    public static createMetallicSphere(
        scene: AbstractScene,
        sphereProportionOfScreen: number = 0.15,
        borderOffsetPx: number = 25,
        placement: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'top-right',
    ): Nullable<AbstractMesh> {
        const sceneManager = scene.sceneManager;
        if (!sceneManager?.scene) {
            return null;
        }

        const meshName = Constant.LIGHTING_REFLECTION_SPHERE;
        const existingMesh = sceneManager.scene.getMeshByName(meshName);
        if (existingMesh) {
            return existingMesh;
        }

        const pbr = new PBRMaterial(Constant.METALLIC_SPHERE_MATERIAL, sceneManager.scene);
        pbr.metallic = 1.0;
        pbr.roughness = 0;
        pbr.subSurface.isRefractionEnabled = false;

        const metallicSphere = MeshBuilder.CreateSphere(meshName, { segments: 32, diameter: 1 }, sceneManager.scene);
        metallicSphere.material = pbr;
        metallicSphere.renderingGroupId = 1;
        metallicSphere.isPickable = false;

        const camera = sceneManager.scene.activeCamera;
        if (!camera || !(camera instanceof ArcRotateCamera)) {
            return metallicSphere;
        }

        // Update metallic sphere position and scale
        sceneManager.scene.onBeforeRenderObservable.add(() => {
            const arcRotateCamera = camera as ArcRotateCamera;

            // Make sure lighting sphere is positioned properly given window size
            arcRotateCamera.getViewMatrix();

            const placementSignX = placement.indexOf('left') == -1 ? 1 : -1;
            const placementSignY = placement.indexOf('bottom') == -1 ? 1 : -1;
            const invertedCameraViewProjectionMatrix = Matrix.Invert(arcRotateCamera.getTransformationMatrix());
            const screenWidth = sceneManager.scene.getEngine().getRenderWidth(true);
            const screenHeight = sceneManager.scene.getEngine().getRenderHeight(true);
            const nearPlaneHeight = 4 * arcRotateCamera.minZ * Math.tan(arcRotateCamera.fov / 2);
            const scalingDeterminant = nearPlaneHeight * sphereProportionOfScreen;
            const aspectRatio = screenWidth / screenHeight;
            const point = new Vector3(placementSignX * 1, placementSignY * 1, 0);
            metallicSphere.scalingDeterminant = scalingDeterminant;
            point.x += -1 * placementSignX * (sphereProportionOfScreen / aspectRatio + borderOffsetPx / screenWidth);
            // No y-adjustment necessary due to the fovMode of the camera being FOV_MODE_VERTICAL_FIXED by default
            point.y += -1 * placementSignY * (sphereProportionOfScreen + borderOffsetPx / screenHeight);
            // Positions mesh according to the camera's matrix transformation
            metallicSphere.position = Vector3.TransformCoordinates(point, invertedCameraViewProjectionMatrix);
        });

        return metallicSphere;
    }
}

export class Constant {
    public static BACKGROUND_CAMERA: string = 'BackgroundCamera';
    public static DEPTH_MAP_RENDER_TARGET_TEXTURE: string = 'DepthMapRenderTargetTexture';
    public static DEPTH_MAP_RTT_MATERIAL: string = 'DepthMapRTTMaterial';
    public static DEPTH_MAP_SHADOW_CAMERA: string = 'DepthMapShadowCamera';
    public static DEPTH_MAP_SHADOW_MATERIAL: string = 'DepthMapShadowMaterial';
    public static DEPTH_MAP_SHADOW_PLANE: string = 'DepthMapShadowPlane';
    public static DIRECTIONAL_SHADOW_LIGHT: string = 'DirectionalShadowLight';
    public static LIGHTING_REFLECTION_SPHERE: string = 'LightingReflectionSphere';
    public static MATERIAL_CAPTURE_MATERIAL: string = 'MatCapMaterial';
    public static METALLIC_SPHERE_MATERIAL: string = 'MetallicSphereMaterial';
    public static SHADOW_ONLY_MATERIAL: string = 'ShadowOnlyMaterial';
    public static SHADOW_PLANE: string = 'ShadowPlane';
}
