# lib-3d-scene-viewer

![npm version](https://img.shields.io/badge/npm_package-1.0.0-green)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**lib-3d-scene-viewer** is a package based on [Babylon.js](https://www.babylonjs.com/).
It provides preset configurations for quickly setting up a 3D scene viewer.


## Getting Started

### Installation

The package can be installed from [npm](https://npmjs.org/):

```shell
npm install @amazon/lib-3d-scene-viewer
```


### Usage

[Take a look at an example](src/dev/v3dViewer.ts)

```ts
// Needed for BabylonJS debug layer
import '@babylonjs/inspector';
import { Config } from '@amazon/lib-3d-scene-viewer/config/config';
import { Model } from '@amazon/lib-3d-scene-viewer/model/model';
import { Scene } from '@babylonjs/core/scene';
import { V3D_CONFIG } from '@amazon/lib-3d-scene-viewer/config/preset/v3dConfig';
import { V3DScene } from '@amazon/lib-3d-scene-viewer/scene/v3dScene';

(async function () {
    /////////////////////////////////////////
    // Step 0: create a canvas DOM element //
    /////////////////////////////////////////
    
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    ////////////////////////////////////////////
    // Step 1: create an instance of V3DScene //
    ////////////////////////////////////////////
    
    // V3D_CONFIG is a preset config
    const v3dScene = new V3DScene(canvas, V3D_CONFIG, {
        // Override file paths if needed
        lightingConfig: {
            StudioSide3Top1: {
                type: 'env',
                filePath: 'public/ibl/Studio_Side3Top1_256.env',
            },
        },
        basisTranscoder: {
            urlConfig: {
                jsModuleUrl: 'public/js/basis/basis_transcoder.js',
                wasmModuleUrl: 'public/js/basis/basis_transcoder.wasm',
            },
        },
        ktx2Decoder: {
            urlConfig: {
                jsDecoderModule: 'public/js/ktx2/babylon.ktx2Decoder.js',
                jsMSCTranscoder: 'public/js/ktx2/msc_basis_transcoder.js',
                wasmMSCTranscoder: 'public/js/ktx2/msc_basis_transcoder.wasm',
                wasmUASTCToASTC: 'public/js/ktx2/uastc_astc.wasm',
                wasmUASTCToBC7: 'public/js/ktx2/uastc_bc7.wasm',
                wasmUASTCToR8_UNORM: null,
                wasmUASTCToRG8_UNORM: null,
                wasmUASTCToRGBA_SRGB: 'public/js/ktx2/uastc_rgba8_srgb_v2.wasm',
                wasmUASTCToRGBA_UNORM: 'public/js/ktx2/uastc_rgba8_unorm_v2.wasm',
                wasmZSTDDecoder: 'public/js/ktx2/zstddec.wasm',
            },
        },
        dracoCompression: {
            decoders: {
                wasmBinaryUrl: 'public/js/draco/draco_decoder_gltf.wasm',
                wasmUrl: 'public/js/draco/draco_decoder_gltf_nodejs.js',
                fallbackUrl: 'public/js/draco/draco_decoder_gltf.js',
            },
        },
        meshoptCompression: {
            decoder: {
                url: 'public/js/meshopt/meshopt_decoder.js',
            },
        },
        enableDragAndDrop: true,
    });

    /////////////////////////////////////////////////////////////////////
    // Step 2: register any observers using V3DScene.observableManager //
    /////////////////////////////////////////////////////////////////////
    
    v3dScene.observableManager.onConfigChangedObservable.add((config: Config) => {
        console.log('Updated config:', config);
    });

    v3dScene.observableManager.onModelLoadedObservable.add((model) => {
        model.showShadowOnGroundDepthMap();
        model.moveCenterToTargetCoordinate();

        const radius = 2 * Math.max(...model.getOverallBoundingBoxDimensions().asArray());
        v3dScene.updateConfig({
            cameraConfig: {
                ArcRotateCamera: {
                    type: 'arcRotateCamera',
                    radius: radius,
                    lowerRadiusLimit: radius * 0.05,
                    upperRadiusLimit: radius * 5,
                    minZ: radius * 0.02,
                    maxZ: radius * 40,
                },
            },
        });
    });
    
    //////////////////////////////////
    // Step 3: call init() function //
    //////////////////////////////////
    
    await v3dScene.init();

    /////////////////////////////////
    // Step 4: load glTF/glb model //
    /////////////////////////////////
    
    const model: Model = await v3dScene.loadGltf('public/model/mannequin.glb', true);
    console.log('Bounding box dimensions:', model.getOverallBoundingBoxDimensions());

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Step 5 (Optional): call updateConfig() to update scene setup and/or handle user interactions //
    //////////////////////////////////////////////////////////////////////////////////////////////////
    
    await v3dScene.updateConfig({
        sceneConfig: {
            useLoadingUI: true,
        },
    });

    // Access BabylonJS scene object
    const babylonScene: Scene = v3dScene.scene;
    console.log('Active Cameras:', babylonScene.activeCameras);

    // Toggle BabylonJS debug layer
    document.addEventListener('keydown', async (event) => {
        const key = event.key;
        // Pressing '?' should show/hide the debug layer
        if (key === '?') {
            v3dScene.toggleDebugMode();
        }
    });
})();
```


### Resource

This package provides a few resources including IBL files, decoder/transcoder files, and 3D models.
These resources can be found in [public](public) folder or `@amazon/lib-3d-scene-viewer/public` via npm.


### Config

This packages uses [Config](src/config/config.ts) to set up engine, scene, camera, lighting, decoder files, etc.

The full config parameters and default values can be found in [Config](src/config/config.ts).

It also provides preset config files in [preset](src/config/preset) folder 
or `@amazon/lib-3d-scene-viewer/config/preset`.


## Development

When developing the project, first install 
[git](https://git-scm.com), 
[Node.js](https://nodejs.org) 
and [npm](https://www.npmjs.com/).

Then, follow the steps to set up the development environment:

```shell
git clone git@github.com:amzn/lib-3d-scene-viewer.git
cd lib-3d-scene-viewer
npm install
```

The following scripts are available:

| Command                  | Description                                                                                 |
|--------------------------|---------------------------------------------------------------------------------------------|
| `npm install`            | Install dependencies                                                                        |
| `npm run build`          | Run the build step for all sub-projects                                                     |
| `npm run clean`          | Remove all built artifacts                                                                  |
| `npm run docs`           | Create API documentation                                                                    |
| `npm run lint`           | Run ESLint                                                                                  |
| `npm run pack:dist`      | Build the project and create an npm tarball under `dist` folder                             |
| `npm run publish:dist`   | Publish the npm tarball                                                                     |
| `npm run server`         | Run a web server and open a new browser tab pointed to [src/dev/index.ts](src/dev/index.ts) |
| `npm run test`           | Run tests                                                                                   |
| `npm run update-bjs-ver` | Update BabylonJS dependencies to a specific version                                         |


## Contributing

For more information take a look at [CONTRIBUTING.md](CONTRIBUTING.md).


## License

This library is licensed under the [Apache 2.0](LICENSE) License. 
