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
import { Logger } from '@babylonjs/core/Misc/logger';
import { Scene } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';
// @ts-ignore
import nock from 'nock';

import { ObservableManager } from '../../src/manager/observableManager';
import { SceneManager } from '../../src/manager/sceneManager';
import { ModelLoader } from '../../src/model/modelLoader';

Logger.LogLevels = Logger.ErrorLogLevel;

describe('ModelLoader', () => {
    let engine: Nullable<NullEngine> = null;
    let scene: Nullable<Scene> = null;
    let sceneManager: Nullable<SceneManager> = null;
    let observableManager: Nullable<ObservableManager> = null;
    let modelLoader: Nullable<ModelLoader> = null;

    beforeEach(async () => {
        engine = new NullEngine();
        scene = new Scene(engine);
        observableManager = new ObservableManager();
        sceneManager = new SceneManager(engine, {}, observableManager);
        await sceneManager.createScene(scene);
        modelLoader = new ModelLoader(sceneManager, observableManager);
    });

    afterEach(() => {
        modelLoader?.dispose();
        sceneManager?.dispose();
        observableManager?.dispose();
        engine?.dispose();
    });

    it('should throw an error if empty url is provided', async () => {
        await expect(modelLoader?.loadGltf('', true)).rejects.toThrow();
    });

    it('should be able to load gltf asset using base64 data', async () => {
        const data = fs.readFileSync('public/model/mannequin.glb').toString('base64');

        await modelLoader?.loadGltf(`data:model/gltf-binary;base64,${data}`, true);

        expect(sceneManager?.models.size).toBe(1);
    });

    it('should be able to load glb asset using HTTP range requests', async () => {
        const data = fs.readFileSync('public/model/mannequin.glb');
        nock('http://localhost')
            .get('/public/model/mannequin.glb')
            .matchHeader('range', 'bytes=0-19')
            .reply(206, data.subarray(0, 20), {
                'content-Range': 'bytes 0-19/760664',
                'content-length': '20',
            })
            .get('/public/model/mannequin.glb')
            .matchHeader('range', 'bytes=20-2667')
            .reply(206, data.subarray(20, 2668), {
                'content-Range': 'bytes 20-2667/760664',
                'content-length': '2648',
            })
            .get('/public/model/mannequin.glb')
            .matchHeader('range', 'bytes=2668-760663')
            .reply(206, data.subarray(2668, 760664), {
                'content-Range': 'bytes 2668-760663/760664',
                'content-length': '757996',
            });

        await modelLoader?.loadGltf('http://localhost/public/model/mannequin.glb', true);

        expect(sceneManager?.models.size).toBe(1);
        nock.restore();
    });
});
