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
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Logger } from '@babylonjs/core/Misc/logger';
import { Node } from '@babylonjs/core/node';
import { Scene } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';

import { ObservableManager } from '../../src/manager/observableManager';
import { SceneManager } from '../../src/manager/sceneManager';
import { Model } from '../../src/model/model';
import { ModelLoader } from '../../src/model/modelLoader';
import { Constant } from '../../src/util/index';

Logger.LogLevels = Logger.ErrorLogLevel;

describe('Model', () => {
    let engine: Nullable<NullEngine> = null;
    let scene: Nullable<Scene> = null;
    let sceneManager: Nullable<SceneManager> = null;
    let observableManager: Nullable<ObservableManager> = null;
    let modelLoader: Nullable<ModelLoader> = null;
    let model: Nullable<Model> = null;
    const modelName = 'mannequin';

    beforeEach(async () => {
        engine = new NullEngine();
        scene = new Scene(engine);
        observableManager = new ObservableManager();
        sceneManager = new SceneManager(engine, {}, observableManager);
        await sceneManager.createScene(scene);
        modelLoader = new ModelLoader(sceneManager, observableManager);
        const data = fs.readFileSync('public/model/mannequin.glb').toString('base64');
        model = await modelLoader!.loadGltf(`data:model/gltf-binary;base64,${data}`, true, modelName);
    });

    afterEach(() => {
        model?.dispose();
        modelLoader?.dispose();
        sceneManager?.dispose();
        observableManager?.dispose();
        engine?.dispose();
    });

    test('getName', async () => {
        expect(model!.name).toEqual(modelName);
    });

    test('removeFromScene', async () => {
        model?.showShadowOnGround();

        model?.removeFromScene();

        expect(sceneManager?.models.size).toBe(0);
        expect(sceneManager?.scene.meshes.length).toBe(0);
    });

    test('toggleWireframe', async () => {
        // Turn on wireframe mode
        model!.toggleWireframe(true);
        let meshesWithWireframeOn = model!.rootMesh
            .getChildMeshes()
            .filter((mesh) => mesh.material && mesh.material.wireframe);
        expect(meshesWithWireframeOn.length).toBeGreaterThan(0);

        // Turn off wireframe mode
        model!.toggleWireframe(false);
        meshesWithWireframeOn = model!.rootMesh
            .getChildMeshes()
            .filter((mesh) => mesh.material && mesh.material.wireframe);
        expect(meshesWithWireframeOn.length).toBe(0);
    });

    test('toggleVisibility', async () => {
        // Turn off visibility
        model?.toggleVisibility(false);
        expect(model?.rootMesh.isEnabled()).toBe(false);

        // Turn on visibility
        model?.toggleVisibility();
        expect(model?.rootMesh.isEnabled()).toBe(true);
    });

    test('toggleMatcapMode', async () => {
        // One pixel of #00000000
        const matcapTextureUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NgAAIAAAUAAR4f7BQAAAAASUVORK5CYII=';

        // Turn off matcap mode
        model?.toggleMatcapMode(matcapTextureUrl, false);
        let modelMaterials = model?.rootMesh
            .getChildMeshes()
            .filter((mesh) => mesh.material)
            .map((mesh) => mesh.material!.name);
        expect(modelMaterials!.includes(Constant.MATERIAL_CAPTURE_MATERIAL)).toBe(false);

        // Turn on matcap mode
        model?.toggleMatcapMode(matcapTextureUrl);
        modelMaterials = model?.rootMesh
            .getChildMeshes()
            .filter((mesh) => mesh.material)
            .map((mesh) => mesh.material!.name);
        expect(modelMaterials!.includes(Constant.MATERIAL_CAPTURE_MATERIAL)).toBe(true);
        let modelTextures = model?.rootMesh
            .getChildMeshes()
            .filter((mesh) => mesh.material)
            .map((mesh) => mesh.material!.getActiveTextures()[0].getInternalTexture()!.url);
        expect(modelTextures!.includes(matcapTextureUrl)).toBe(true);

        // Turn on matcap mode with forceEnabled
        model?.toggleMatcapMode(matcapTextureUrl, true);
        modelMaterials = model?.rootMesh
            .getChildMeshes()
            .filter((mesh) => mesh.material)
            .map((mesh) => mesh.material!.name);
        expect(modelMaterials!.includes(Constant.MATERIAL_CAPTURE_MATERIAL)).toBe(true);

        // Turn off matcap mode
        model?.toggleMatcapMode(matcapTextureUrl);
        modelMaterials = model?.rootMesh
            .getChildMeshes()
            .filter((mesh) => mesh.material)
            .map((mesh) => mesh.material!.name);
        expect(modelMaterials!.includes(Constant.MATERIAL_CAPTURE_MATERIAL)).toBe(false);

        // Test that the matcapTextureUrl can be swapped
        const fakeMatcapTextureUrl = 'fakeMatcapTextureUrl';
        model?.toggleMatcapMode(fakeMatcapTextureUrl);
        modelTextures = model?.rootMesh
            .getChildMeshes()
            .filter((mesh) => mesh.material)
            .map((mesh) => mesh.material!.getActiveTextures()[0].getInternalTexture()!.url);
        expect(modelTextures!.includes('fakeMatcapTextureUrl')).toBe(true);
    });

    test('toggleBoundingBox', async () => {
        // Turn on bounding box
        model!.toggleBoundingBox(true);
        let enabledBoundingBoxMeshes = model!.rootMesh
            .getChildMeshes()
            .filter((mesh) => mesh.name === 'BoundingBox' && mesh.isEnabled(false));
        expect(enabledBoundingBoxMeshes.length).toBeGreaterThan(0);

        // Turn off bounding box
        model!.toggleBoundingBox(false);
        enabledBoundingBoxMeshes = model!.rootMesh
            .getChildMeshes()
            .filter((mesh) => mesh.name === 'BoundingBox' && mesh.isEnabled(false));
        expect(enabledBoundingBoxMeshes.length).toBe(0);
    });

    test('getOverallBoundingBox', async () => {
        const epsilon = 0.0001;
        const expectedMaximumWorld = new Vector3(0.2735, 1.773, 0.1647);
        const expectedMinimumWorld = new Vector3(-0.2735, 0, -0.1245);

        const overallBoundingBox = model!.getOverallBoundingBox();

        expect(overallBoundingBox.maximumWorld.equalsWithEpsilon(expectedMaximumWorld, epsilon)).toBeTruthy();
        expect(overallBoundingBox.minimumWorld.equalsWithEpsilon(expectedMinimumWorld, epsilon)).toBeTruthy();
    });

    test('getOverallBoundingBoxDimensions', async () => {
        const epsilon = 0.0001;
        const expectedDimensions = new Vector3(0.5469, 1.773, 0.2891);

        const overallBoundingBoxDimensions = model!.getOverallBoundingBoxDimensions();

        expect(overallBoundingBoxDimensions.equalsWithEpsilon(expectedDimensions, epsilon)).toBeTruthy();
    });

    test('showShadowOnGround', async () => {
        model?.showShadowOnGround();

        expect(sceneManager?.scene.getLightByName(Constant.DIRECTIONAL_SHADOW_LIGHT)).toBeTruthy();
        expect(sceneManager?.scene.getMaterialByName(Constant.SHADOW_ONLY_MATERIAL)).toBeTruthy();
        expect(sceneManager?.scene.getMeshByName(Constant.SHADOW_PLANE)).toBeTruthy();
    });

    test('showShadowOnGroundDepthMap', async () => {
        model?.showShadowOnGroundDepthMap();

        expect(sceneManager?.scene.getCameraByName(Constant.DEPTH_MAP_SHADOW_CAMERA)).toBeTruthy();
        expect(sceneManager?.scene.getMaterialByName(Constant.DEPTH_MAP_SHADOW_MATERIAL)).toBeTruthy();
        expect(sceneManager?.scene.getMeshByName(Constant.DEPTH_MAP_SHADOW_PLANE)).toBeTruthy();
    });

    test('moveCenterToTargetCoordinate', async () => {
        model?.moveCenterToTargetCoordinate(Vector3.Zero());
        const overallBoundingBox = model!.getOverallBoundingBox();

        expect(
            overallBoundingBox.maximumWorld.add(overallBoundingBox.minimumWorld).equalsWithEpsilon(Vector3.Zero()),
        ).toBeTruthy();
    });

    test('hasMesh', async () => {
        expect(model?.hasMesh(new Mesh('mesh'))).toBeFalsy();
        expect(model?.hasMesh(model?.rootMesh)).toBeTruthy();
    });

    test('hasNode', async () => {
        expect(model?.hasNode(new Node('node'))).toBeFalsy();
        expect(model?.hasNode(model?.rootMesh)).toBeTruthy();
    });
});
