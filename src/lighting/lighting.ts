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

import '@babylonjs/core/Materials/Textures/Loaders/envTextureLoader';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Light } from '@babylonjs/core/Lights/light';
import { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { IDisposable, Scene } from '@babylonjs/core/scene';

import {
    AmbientLightProperty,
    DirectionalLightProperty,
    EnvironmentProperty,
    LightingConfig,
} from '../config/lightingConfig';
import { SceneManager } from '../manager/sceneManager';

/**
 * {@link Lighting} holds and manages all BabylonJS lights and scene environment defined in {@link LightingConfig}
 */
export class Lighting implements IDisposable {
    private readonly _scene: Scene;

    private _lights: Map<string, Light>;

    private _cubeTextures: Map<string, BaseTexture>;

    /**
     * Instantiate a new Lighting
     * @param sceneManager - an instance of {@link SceneManager}
     */
    public constructor(sceneManager: SceneManager) {
        this._scene = sceneManager.scene;
        this._lights = new Map<string, Light>();
        this._cubeTextures = new Map<string, BaseTexture>();
    }

    /**
     * Create and/or update lights and environment in the scene based on {@link LightingConfig}
     * @param lightingConfig - an instance of {@link LightingConfig} that defines all lights and environment in the scene
     */
    public async updateLighting(lightingConfig: LightingConfig): Promise<void> {
        Object.entries(lightingConfig).forEach(([lightingName, lightingProperty]) => {
            lightingProperty.enable = lightingProperty.enable ?? true;

            switch (lightingProperty.type) {
                case 'hdr':
                case 'env':
                    this._updateEnvironmentTexture(lightingProperty as EnvironmentProperty, lightingName);
                    break;
                case 'ambient':
                    this._updateAmbientLight(lightingProperty as AmbientLightProperty, lightingName);
                    break;
                case 'directional':
                    this._updateDirectionalLight(lightingProperty as DirectionalLightProperty, lightingName);
                    break;
            }
        });

        await this._scene.whenReadyAsync();
    }

    /**
     * Destroy the lighting and release the current resources held by it
     */
    public dispose(): void {
        this._lights.forEach((light: Light) => {
            light.dispose();
            this._scene.removeLight(light);
        });
        this._lights.clear();

        this._cubeTextures.forEach((texture: BaseTexture) => {
            texture.dispose();
        });
        this._cubeTextures.clear();

        this._scene.environmentTexture?.dispose();
        this._scene.environmentTexture = null;
    }

    private _updateEnvironmentTexture(lightingProperty: EnvironmentProperty, lightingName: string): void {
        if (!lightingProperty.enable) {
            if (this._scene.environmentTexture?.name === lightingName) {
                this._scene.environmentTexture = null;
            }
            return;
        }

        if (!lightingProperty.filePath) {
            throw Error(`The filePath is empty or undefined for the lighting ${lightingName}`);
        }

        const key = `${lightingName}__${lightingProperty.filePath}`;
        let texture = this._cubeTextures.get(key);
        if (!texture) {
            if (lightingProperty.type === 'hdr') {
                texture = new HDRCubeTexture(lightingProperty.filePath, this._scene, lightingProperty.size ?? 128);
            } else {
                texture = CubeTexture.CreateFromPrefilteredData(
                    lightingProperty.filePath,
                    this._scene,
                    `.${lightingProperty.type}`,
                );
            }
            texture.name = lightingName;
            texture.gammaSpace = lightingProperty.gammaSpace ?? true;
            this._cubeTextures.set(key, texture);
        }

        const textureMatrix = lightingProperty.textureMatrix ?? Matrix.Identity();
        if (texture instanceof HDRCubeTexture || texture instanceof CubeTexture) {
            texture.setReflectionTextureMatrix(textureMatrix);
        }

        this._scene.environmentTexture = texture;
        this._scene.environmentIntensity = lightingProperty.intensity ?? 1;
    }

    private _updateAmbientLight(lightingProperty: AmbientLightProperty, lightingName: string): void {
        let light = this._lights.get(lightingName);
        if (!light && lightingProperty.enable) {
            light = new HemisphericLight(lightingName, new Vector3(0, 0, -1), this._scene);
            this._lights.set(lightingName, light);
        }

        if (light) {
            const ambientLight = light as HemisphericLight;

            if (lightingProperty.enable) {
                ambientLight.direction = lightingProperty.direction ?? new Vector3(0, 0, -1);
                ambientLight.intensity = lightingProperty.intensity ?? 1;
                ambientLight.diffuse = lightingProperty.diffuseColor ?? Color3.White();
                ambientLight.specular = lightingProperty.specularColor ?? Color3.Black();
            } else {
                light.dispose();
                this._scene.removeLight(light);
                this._lights.delete(light.name);
            }
        }
    }

    private _updateDirectionalLight(lightingProperty: DirectionalLightProperty, lightingName: string): void {
        let light = this._lights.get(lightingName);
        if (!light && lightingProperty.enable) {
            light = new DirectionalLight(lightingName, new Vector3(0, 0, -1), this._scene);
            this._lights.set(lightingName, light);
        }

        if (light) {
            const directionalLight = light as DirectionalLight;

            if (lightingProperty.enable) {
                directionalLight.direction = lightingProperty.direction ?? new Vector3(0, 0, -1);
                directionalLight.position = Vector3.Zero();
                directionalLight.intensity = lightingProperty.intensity ?? 1;
                directionalLight.diffuse = lightingProperty.diffuseColor ?? Color3.White();
                directionalLight.specular = lightingProperty.specularColor ?? Color3.White();
            } else {
                light.dispose();
                this._scene.removeLight(light);
                this._lights.delete(light.name);
            }
        }
    }
}
