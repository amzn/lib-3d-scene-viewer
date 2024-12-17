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

import 'jest-canvas-mock';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '@babylonjs/core/Misc/logger';
import { Scene } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';

import { Config } from '../../src/config/config';
import { Constant } from '../../src/index';
import { ObservableManager } from '../../src/manager/observableManager';
import { SceneManager } from '../../src/manager/sceneManager';

Logger.LogLevels = Logger.ErrorLogLevel;

describe('SceneManager', () => {
    let engine: Nullable<NullEngine> = null;
    let scene: Nullable<Scene> = null;
    let sceneManager: Nullable<SceneManager> = null;
    let observableManager: Nullable<ObservableManager> = null;
    let camera: Nullable<ArcRotateCamera> = null;

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
        observableManager = new ObservableManager();
        sceneManager = new SceneManager(engine, {}, observableManager);
        camera = new ArcRotateCamera('camera', 0, 0, 10, Vector3.Zero(), scene);
    });

    afterEach(() => {
        camera?.dispose();
        sceneManager?.dispose();
        observableManager?.dispose();
        engine?.dispose();
    });

    describe('createScene', () => {
        it('should use provided scene instead of creating a new scene', async () => {
            sceneManager = new SceneManager(engine!, {}, observableManager!);
            scene = new Scene(engine!);

            await sceneManager.createScene();
            await sceneManager.createScene(scene);

            expect(sceneManager.scene).toEqual(scene);
        });

        it('should be able to create a new scene', async () => {
            const config: Config = {
                engineConfig: {
                    engineOptions: {
                        disableWebGL2Support: true,
                    },
                },
            };
            sceneManager = new SceneManager(engine!, config, observableManager!);

            await sceneManager.createScene();
            await new Promise((resolve) => {
                setTimeout(resolve, 500);
            });

            expect(sceneManager.scene).toBeTruthy();
        });
    });

    describe('updateConfig', () => {
        it('should be able to configure scene', async () => {
            sceneManager = new SceneManager(engine!, {}, observableManager!);
            await sceneManager.createScene();
            const config: Config = {
                sceneConfig: {
                    clearColor: Color4.FromColor3(Color3.Black()),
                },
            };

            await sceneManager.updateConfig(config);

            expect(sceneManager.scene.clearColor).toEqual(Color4.FromColor3(Color3.Black()));
        });

        it('should be able to configure lighting', async () => {
            sceneManager = new SceneManager(engine!, {}, observableManager!);
            await sceneManager.createScene();
            const config: Config = {
                engineConfig: {
                    antialiasing: true,
                    engineOptions: {
                        disableWebGL2Support: false,
                    },
                },
                lightingConfig: {
                    NewDirectionalLight: {
                        type: 'directional',
                    },
                },
            };

            await sceneManager.updateConfig(config);

            expect(sceneManager.scene.getLightByName('NewDirectionalLight')).toBeTruthy();
        });

        it('should be able to configure camera', async () => {
            sceneManager = new SceneManager(engine!, {}, observableManager!);
            await sceneManager.createScene();
            const config: Config = {
                cameraConfig: {
                    NewArcRotateCamera: {
                        type: 'arcRotateCamera',
                    },
                },
            };

            await sceneManager.updateConfig(config);

            expect(sceneManager.scene.getCameraByName('NewArcRotateCamera')).toBeTruthy();
        });

        it('should be able to configure rendering pipeline', async () => {
            sceneManager = new SceneManager(engine!, {}, observableManager!);
            await sceneManager.createScene();
            const config: Config = {
                renderingPipelineConfig: {
                    defaultRenderingPipeline: {
                        enable: true,
                        imageProcessing: {
                            enable: true,
                            exposure: 0.8,
                        },
                    },
                },
            };

            await sceneManager.updateConfig(config);

            expect(sceneManager.scene.imageProcessingConfiguration.exposure).toBe(0.8);
        });
    });

    test('loadTextureAsset', async () => {
        sceneManager = new SceneManager(engine!, {}, observableManager!);

        const scene = sceneManager.loadTextureAsset('data:image/gif;base64,R0lGODlhAQABAAAAACw=');
        await new Promise((resolve) => {
            setTimeout(resolve, 500);
        });

        expect(scene.getTextureByName('data:image/gif;base64,R0lGODlhAQABAAAAACw=')).toBeTruthy();
        expect(scene.getMeshByName('Plane')).toBeTruthy();
        expect(scene.getMaterialByName('UnlitPBRMaterial')).toBeTruthy();
    });

    test('runRenderLoop', async () => {
        sceneManager = new SceneManager(engine!, {}, observableManager!);
        await sceneManager.createScene();
        expect(engine!.activeRenderLoops.length).toEqual(0);

        sceneManager.runRenderLoop();
        await sceneManager.scene.whenReadyAsync();
        expect(engine!.activeRenderLoops.length).toEqual(1);

        sceneManager.runRenderLoop();
        await sceneManager.scene.whenReadyAsync();
        expect(engine!.activeRenderLoops.length).toEqual(1);
    });

    test('stopRenderLoop', async () => {
        sceneManager = new SceneManager(engine!, {}, observableManager!);
        await sceneManager.createScene();
        expect(engine!.activeRenderLoops.length).toEqual(0);

        sceneManager.runRenderLoop();
        await sceneManager.scene.whenReadyAsync();
        expect(engine!.activeRenderLoops.length).toEqual(1);

        sceneManager.stopRenderLoop();
        expect(engine!.activeRenderLoops.length).toEqual(0);
    });

    test('should be able to configure SSAO rendering pipeline', async () => {
        // Suppress the error message 'PrePassRenderer needs WebGL 2 support'
        Logger.LogLevels = Logger.NoneLogLevel;

        sceneManager = new SceneManager(engine!, {}, observableManager!);
        await sceneManager.createScene();
        const config: Config = {
            engineConfig: {
                antialiasing: true,
                engineOptions: {
                    disableWebGL2Support: false,
                },
            },
            renderingPipelineConfig: {
                ssao2RenderingPipeline: {
                    enable: true,
                },
            },
        };

        await sceneManager.updateConfig(config);

        expect(sceneManager.config.renderingPipelineConfig!.ssao2RenderingPipeline!.enable).toBe(true);

        Logger.LogLevels = Logger.ErrorLogLevel;
    });

    test('Check active cameras if scene as one active camera', async () => {
        sceneManager = new SceneManager(engine!, {}, observableManager!);
        await sceneManager.createScene();
        const config: Config = {
            renderingPipelineConfig: {
                defaultRenderingPipeline: {
                    enable: true,
                    samples: 4,
                    imageProcessing: {
                        enable: true,
                        contrast: 2,
                    },
                },
            },
        };
        sceneManager.scene.activeCamera = camera;
        await sceneManager.updateConfig(config);
        if (sceneManager.scene.activeCameras?.length) {
            expect(sceneManager.scene.activeCameras[0]?.name).toBe(Constant.BACKGROUND_CAMERA);
            expect(sceneManager.scene.activeCameras[1]?.name).toBe('camera');
        }
    });

    test('Check active cameras if scene as multiple active cameras', async () => {
        const camera1 = new ArcRotateCamera('camera1', 0, 0, 10, Vector3.Zero(), scene!);
        const camera2 = new ArcRotateCamera('camera2', 0, 0, 10, Vector3.Zero(), scene!);
        sceneManager = new SceneManager(engine!, {}, observableManager!);
        await sceneManager.createScene();
        const config: Config = {
            renderingPipelineConfig: {
                defaultRenderingPipeline: {
                    enable: true,
                    samples: 4,
                    imageProcessing: {
                        enable: true,
                        contrast: 2,
                    },
                },
            },
        };
        sceneManager.scene.activeCameras = [camera1, camera2];
        await sceneManager.updateConfig(config);

        if (sceneManager.scene.activeCameras?.length) {
            expect(sceneManager.scene.activeCameras[0].name).toBe(Constant.BACKGROUND_CAMERA);
            expect(sceneManager.scene.activeCameras[1].name).toBe('camera1');
            expect(sceneManager.scene.activeCameras[2].name).toBe('camera2');
        }
    });
});
