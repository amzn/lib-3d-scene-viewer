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

import * as fs from 'fs';

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Logger } from '@babylonjs/core/Misc/logger';
import { Scene } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';

import { Config } from '../../src/config/config';
import { DefaultScene } from '../../src/scene/defaultScene';
import { CartesianMeasurement, Constant, Util } from '../../src/util/index';

Logger.LogLevels = Logger.ErrorLogLevel;

describe('Lighting', () => {
    describe('isTextureAsset', () => {
        it('should return true if file extension is .png', () => {
            const filename = 'http://localhost/test.png?param';

            const isTextureAsset = Util.isTextureAsset(filename);

            expect(isTextureAsset).toBeTruthy();
        });

        it('should return false if file extension is .glb', () => {
            const filename = 'test.glb';

            const isTextureAsset = Util.isTextureAsset(filename);

            expect(isTextureAsset).toBeFalsy();
        });
    });
});

describe('Mesh', () => {
    let engine: Nullable<NullEngine> = null;
    let scene: Nullable<Scene> = null;

    beforeEach(async () => {
        engine = new NullEngine();
        scene = new Scene(engine);
    });

    it('should get the mesh dimensions', () => {
        const mesh: AbstractMesh = MeshBuilder.CreateBox('box', { width: 10, height: 12, depth: 3 }, scene);
        const dimensions: CartesianMeasurement = Util.measureMeshSizeInCentimeters(mesh);

        expect(dimensions.width).toBe(1000);
        expect(dimensions.depth).toBe(300);
        expect(dimensions.height).toBe(1200);
    });

    it('should return max dimension', () => {
        const cartesianMeasurement: CartesianMeasurement = { width: 100, height: 200, depth: 300 };
        const maxDimension = Util.getMaxAssetMeasurementLength(cartesianMeasurement);
        expect(maxDimension).toBe(300);
    });
});

describe('Util.createMetallicSphere', () => {
    const data = fs.readFileSync('public/model/mannequin.glb').toString('base64');
    let defaultScene: Nullable<DefaultScene> = null;

    beforeEach(() => {
        const presetConfig: Config = {
            engineConfig: {
                useNullEngine: true,
            },
        };
        defaultScene = new DefaultScene(null, presetConfig);
    });

    afterEach(() => {
        defaultScene?.dispose();
    });

    it('should be able to create metallic sphere mesh', async () => {
        await defaultScene!.init();
        await defaultScene!.loadGltf(`data:model/gltf-binary;base64,${data}`, true);

        Util.createMetallicSphere(defaultScene!);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(defaultScene!.sceneManager.scene.getMeshByName(Constant.LIGHTING_REFLECTION_SPHERE)).toBeTruthy();
        expect(defaultScene!.sceneManager.scene.getMaterialByName(Constant.METALLIC_SPHERE_MATERIAL)).toBeTruthy();
    });
});

describe('Util.hotspotFunctions', () => {
    const data = fs.readFileSync('public/model/mannequin.glb').toString('base64');
    let defaultScene: Nullable<DefaultScene> = null;

    beforeEach(() => {
        const presetConfig: Config = {
            engineConfig: {
                useNullEngine: true,
            },
        };
        defaultScene = new DefaultScene(null, presetConfig);
    });

    afterEach(() => {
        defaultScene?.dispose();
    });

    it('should return null when no point clicked off of mesh', async () => {
        await defaultScene!.init();
        await defaultScene!.loadGltf(`data:model/gltf-binary;base64,${data}`, true);

        const clickedPoint = Util.clickedPointOnMesh(111, 16, defaultScene!.scene);
        expect(clickedPoint).toBeNull();
    });

    it('camera position return 2 values', async () => {
        await defaultScene!.init();
        await defaultScene!.loadGltf(`data:model/gltf-binary;base64,${data}`, true);

        const cameraPosition = Util.cameraPositionAndView(defaultScene!.scene);
        expect(cameraPosition.length).toEqual(2);
        const positionVector = new Vector3(0.0001, 1, 0);
        expect(cameraPosition[0]).toEqual(positionVector);
        const upVector = new Vector3(0, 1, 0);
        expect(cameraPosition[1]).toEqual(upVector);
    });
});
