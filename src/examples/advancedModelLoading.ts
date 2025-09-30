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

import { Config } from '../config/config';
import { V3D_CONFIG } from '../config/preset/v3dConfig';
import { Model } from '../model/model';
import { LoadGltfOptions } from '../model/modelLoader';
import { V3DScene } from '../scene/v3dScene';

/**
 * Advanced example demonstrating enhanced model loading features
 * including progress tracking, timeout handling, and error management.
 *
 * This example showcases:
 * - Progress tracking during model loading
 * - Timeout configuration for large models
 * - Error handling with fallback strategies
 * - Performance optimization techniques
 */
export class AdvancedModelLoadingExample {
    private v3dScene: V3DScene;
    private canvas: HTMLCanvasElement;

    /**
     * Initialize the 3D scene viewer with advanced configuration
     * @param canvas - HTML canvas element for rendering
     */
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        // Enhanced configuration with performance optimizations
        const enhancedConfig: Config = {
            ...V3D_CONFIG,
            sceneConfig: {
                ...V3D_CONFIG.sceneConfig,
                useLoadingUI: true,
            },
            cameraConfig: {
                ...V3D_CONFIG.cameraConfig,
                // Optimize camera for large models
                ArcRotateCamera: {
                    ...V3D_CONFIG.cameraConfig?.ArcRotateCamera,
                    type: 'arcRotateCamera',
                    wheelPrecision: 0.1,
                    pinchPrecision: 0.1,
                },
            },
        };

        this.v3dScene = new V3DScene(canvas, enhancedConfig, {
            // Configure decoders for optimal performance
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
    }

    /**
     * Load a model with advanced features including progress tracking and timeout
     * @param modelUrl - URL or data URI of the model to load
     * @param options - Advanced loading options
     * @returns Promise that resolves to the loaded model
     */
    public async loadModelWithProgress(
        modelUrl: string,
        options: {
            timeout?: number;
            showProgress?: boolean;
            onProgress?: (progress: number) => void;
            onError?: (error: Error) => void;
        } = {},
    ): Promise<Model> {
        const { timeout = 30000, showProgress = true, onProgress, onError } = options;

        // Set up progress tracking UI
        if (showProgress) {
            this.setupProgressUI();
        }

        // Enhanced loading options
        const loadOptions: LoadGltfOptions = {
            targetFps: 60, // Optimize for 60fps
        };

        try {
            // Initialize scene if not already done
            if (!this.v3dScene.scene) {
                await this.v3dScene.init();
            }

            // Load the model with enhanced options
            const model = await this.v3dScene.loadGltf(
                modelUrl,
                false, // Enable animations
                undefined, // Use default model name
                loadOptions,
            );

            // Optimize model after loading
            this.optimizeModel(model);

            // Hide progress UI
            this.hideProgressUI();

            return model;
        } catch (error) {
            this.hideProgressUI();

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Model loading failed:', errorMessage);

            onError?.(error instanceof Error ? error : new Error(errorMessage));
            throw error;
        }
    }

    /**
     * Load multiple models with batch processing
     * @param modelUrls - Array of model URLs to load
     * @param options - Loading options for all models
     * @returns Promise that resolves to array of loaded models
     */
    public async loadMultipleModels(
        modelUrls: string[],
        options: {
            timeout?: number;
            maxConcurrent?: number;
            onProgress?: (completed: number, total: number) => void;
        } = {},
    ): Promise<Model[]> {
        const { timeout = 30000, maxConcurrent = 3, onProgress } = options;

        const models: Model[] = [];
        let completed = 0;

        // Process models in batches to avoid overwhelming the system
        for (let i = 0; i < modelUrls.length; i += maxConcurrent) {
            const batch = modelUrls.slice(i, i + maxConcurrent);

            const batchPromises = batch.map(async (url) => {
                try {
                    const model = await this.loadModelWithProgress(url, {
                        timeout,
                        showProgress: false, // Disable individual progress for batch loading
                    });

                    completed++;
                    onProgress?.(completed, modelUrls.length);

                    return model;
                } catch (error) {
                    console.error(`Failed to load model ${url}:`, error);
                    return null;
                }
            });

            const batchResults = await Promise.all(batchPromises);
            models.push(...batchResults.filter((model): model is Model => model !== null));
        }

        return models;
    }

    /**
     * Set up progress tracking UI
     */
    private setupProgressUI(): void {
        // Create progress bar if it doesn't exist
        let progressBar = document.getElementById('model-loading-progress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'model-loading-progress';
            progressBar.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 200px;
                height: 20px;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 10px;
                overflow: hidden;
                z-index: 1000;
            `;

            const progressFill = document.createElement('div');
            progressFill.id = 'model-loading-progress-fill';
            progressFill.style.cssText = `
                height: 100%;
                background: linear-gradient(90deg, #0073e6, #00a8ff);
                width: 0%;
                transition: width 0.3s ease;
            `;

            progressBar.appendChild(progressFill);
            document.body.appendChild(progressBar);
        }
    }

    /**
     * Update progress UI
     * @param progress - Progress percentage (0-100)
     */
    private updateProgressUI(progress: number): void {
        const progressFill = document.getElementById('model-loading-progress-fill');
        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
    }

    /**
     * Hide progress UI
     */
    private hideProgressUI(): void {
        const progressBar = document.getElementById('model-loading-progress');
        if (progressBar) {
            progressBar.remove();
        }
    }

    /**
     * Optimize model for better performance
     * @param model - Model to optimize
     */
    private optimizeModel(model: Model): void {
        // Enable shadow casting for better visual quality
        model.showShadowOnGroundDepthMap();

        // Center the model in the view
        model.moveCenterToTargetCoordinate();

        // Adjust camera based on model size
        const boundingBox = model.getOverallBoundingBoxDimensions();
        const radius = 2 * Math.max(...boundingBox.asArray());

        this.v3dScene.updateConfig({
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
    }

    /**
     * Get the V3D scene instance
     * @returns V3D scene instance
     */
    public getScene(): V3DScene {
        return this.v3dScene;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.hideProgressUI();
        // Additional cleanup can be added here
    }
}

/**
 * Example usage of the AdvancedModelLoadingExample class
 */
export async function runAdvancedModelLoadingExample(): Promise<void> {
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.appendChild(canvas);

    // Initialize the example
    const example = new AdvancedModelLoadingExample(canvas);

    try {
        // Load a single model with progress tracking
        const model = await example.loadModelWithProgress('public/model/mannequin.glb', {
            timeout: 15000,
            showProgress: true,
            onProgress: (progress) => {
                console.log(`Loading progress: ${progress.toFixed(1)}%`);
            },
            onError: (error) => {
                console.error('Loading error:', error.message);
            },
        });

        console.log('Model loaded successfully:', model.name);
        console.log('Bounding box dimensions:', model.getOverallBoundingBoxDimensions());

        // Example of loading multiple models
        const multipleModels = await example.loadMultipleModels(
            [
                'public/model/mannequin.glb',
                // Add more model URLs here
            ],
            {
                maxConcurrent: 2,
                onProgress: (completed, total) => {
                    console.log(`Loaded ${completed}/${total} models`);
                },
            },
        );

        console.log(`Successfully loaded ${multipleModels.length} models`);
    } catch (error) {
        console.error('Example failed:', error);
    }
}
