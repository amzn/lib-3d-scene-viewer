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

import { Nullable } from '@babylonjs/core/types.js';
import { GLTFLoader, IGLTFLoaderExtension } from '@babylonjs/loaders/glTF/2.0';
import { IScene } from '@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces';

export const KHR_INTERACTIVITY_EXTENSION_NAME: string = 'KHR_interactivity';
export class KHR_interactivity implements IGLTFLoaderExtension {
    name: string = KHR_INTERACTIVITY_EXTENSION_NAME;
    enabled: boolean;
    private _loader: any;

    constructor(loader: GLTFLoader) {
        this._loader = loader;
        this.enabled = this._loader.isExtensionUsed(this.name);
    }

    dispose(): void {
        this._loader = null;
    }

    loadSceneAsync(context: string, scene: IScene): Nullable<Promise<void>> {
        scene.extensions = this._loader.gltf.extensions;
        return GLTFLoader.LoadExtensionAsync(context, scene, this.name, (extensionContext, extension) => {
            const promises = new Array<Promise<any>>();
            promises.push(this._loader.loadSceneAsync(context, scene));
            if (scene.extensions && scene.extensions.KHR_interactivity && scene.extensions.KHR_interactivity.graph) {
                const p = async () => {
                    this._loader.babylonScene.extras = this._loader.babylonScene.extras || {};
                    this._loader.babylonScene.extras.behaveGraph = scene.extensions!.KHR_interactivity.graph;
                };
                promises.push(p());
            }

            return Promise.all(promises).then(() => {});
        });
    }
}
