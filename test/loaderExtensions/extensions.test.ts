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

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Logger } from '@babylonjs/core/Misc/logger';
import { Scene } from '@babylonjs/core/scene';
import { GLTFLoader } from '@babylonjs/loaders/glTF/2.0/glTFLoader';
import { IGLTF, INode, IScene } from '@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces';
import { GLTFFileLoader } from '@babylonjs/loaders/glTF/glTFFileLoader';

import { KHR_interactivity } from '../../src/loaderExtensions/KHR_interactivity';

Logger.LogLevels = Logger.ErrorLogLevel;

const engine = new NullEngine();
const scene: any = new Scene(engine);

class MockLoader extends GLTFLoader {
    get gltf(): IGLTF {
        return { asset: { version: '1' }, nodes: [{ index: 0 }, { index: 1 }, { index: 2 }] };
    }

    isExtensionUsed = (name: string): boolean => {
        return true;
    };
    loadNodeAsync = (
        context: string,
        node: INode,
        assign?: (babylonTransformNode: TransformNode) => void,
    ): Promise<TransformNode> => {
        return new Promise((resolve) => {
            const transformNode: TransformNode = new TransformNode('test', scene);
            transformNode.metadata = {};
            resolve(transformNode);
        });
    };
    loadSceneAsync = (context: string, scene: IScene): Promise<void> => {
        return new Promise((resolve) => {
            resolve();
        });
    };
}

class MockBehaviorLoader extends MockLoader {
    get gltf(): IGLTF {
        return {
            asset: { version: '1' },
            extensions: {
                KHR_interactivity: {
                    graph: {
                        nodes: [
                            {
                                id: '0',
                                type: 'lifecycle/start',
                                metadata: {
                                    positionX: '243',
                                    positionY: '190',
                                },
                                flows: {
                                    out: {
                                        nodeId: '1',
                                        socket: 'in',
                                    },
                                },
                            },
                        ],
                        variables: [],
                        customEvents: [],
                        types: [],
                    },
                },
            },
        };
    }
    get babylonScene(): Scene {
        return scene;
    }
}

describe('Extensions', () => {
    let khrInteractivity: KHR_interactivity;

    beforeAll(() => {
        khrInteractivity = new KHR_interactivity(new MockBehaviorLoader(new GLTFFileLoader()));
    });

    it('should add behaviors to scene extras', async () => {
        const loadScene: IScene = {
            index: 0,
            nodes: [],
        };
        await khrInteractivity.loadSceneAsync('test', loadScene);
        expect(scene.extras.behaveGraph).not.toBeUndefined();
        const behavior = scene.extras.behaveGraph;
        expect(behavior.nodes.length).toBe(1);
        expect(behavior.customEvents.length).toBe(0);
        expect(behavior.variables.length).toBe(0);
    });
});
