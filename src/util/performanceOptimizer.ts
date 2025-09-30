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

import { Engine } from '@babylonjs/core/Engines/engine';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Scene } from '@babylonjs/core/scene';

import { Model } from '../model/model';

/**
 * Performance optimization levels for different use cases
 */
export enum PerformanceLevel {
    /** Maximum quality, suitable for high-end devices */
    HIGH_QUALITY = 'high_quality',
    /** Balanced performance and quality, suitable for most devices */
    BALANCED = 'balanced',
    /** Optimized for performance, suitable for low-end devices */
    PERFORMANCE = 'performance',
    /** Maximum performance, suitable for mobile devices */
    MOBILE = 'mobile',
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
    /** Current FPS */
    fps: number;
    /** Average FPS over the last second */
    averageFps: number;
    /** Number of draw calls */
    drawCalls: number;
    /** Number of triangles rendered */
    triangles: number;
    /** Memory usage in MB */
    memoryUsage: number;
    /** GPU memory usage in MB */
    gpuMemoryUsage: number;
}

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
    /** Target performance level */
    level: PerformanceLevel;
    /** Target FPS (default: 60) */
    targetFps?: number;
    /** Enable automatic quality adjustment based on performance */
    adaptiveQuality?: boolean;
    /** Performance monitoring interval in ms (default: 1000) */
    monitoringInterval?: number;
    /** Callback for performance metrics updates */
    onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

/**
 * Performance optimizer for 3D scene viewer
 * Provides utilities for optimizing rendering performance and monitoring metrics
 */
export class PerformanceOptimizer {
    private scene: Scene;
    private engine: Engine;
    private config: PerformanceConfig;
    private metricsInterval?: NodeJS.Timeout;
    private lastFrameTime: number = 0;
    private frameCount: number = 0;
    private fpsHistory: number[] = [];

    /**
     * Create a new performance optimizer
     * @param scene - Babylon.js scene instance
     * @param config - Performance configuration
     */
    constructor(scene: Scene, config: PerformanceConfig) {
        this.scene = scene;
        this.engine = scene.getEngine();
        this.config = {
            targetFps: 60,
            adaptiveQuality: true,
            monitoringInterval: 1000,
            ...config,
        };

        this.initializeOptimizations();
        this.startPerformanceMonitoring();
    }

    /**
     * Optimize a model for better performance
     * @param model - Model to optimize
     * @param level - Performance level to apply
     */
    public optimizeModel(model: Model, level?: PerformanceLevel): void {
        const targetLevel = level || this.config.level;

        // Get all meshes from the model
        const meshes = model.getMeshes();

        meshes.forEach((mesh) => {
            this.optimizeMesh(mesh, targetLevel);
        });
    }

    /**
     * Get current performance metrics
     * @returns Current performance metrics
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        if (deltaTime > 0) {
            const currentFps = 1000 / deltaTime;
            this.fpsHistory.push(currentFps);

            // Keep only last 60 frames for average calculation
            if (this.fpsHistory.length > 60) {
                this.fpsHistory.shift();
            }
        }

        this.lastFrameTime = currentTime;
        this.frameCount++;

        const averageFps =
            this.fpsHistory.length > 0
                ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
                : 0;

        return {
            fps: this.fpsHistory[this.fpsHistory.length - 1] || 0,
            averageFps: Math.round(averageFps * 10) / 10,
            drawCalls: this.engine.drawCalls,
            triangles: this.engine.triangles,
            memoryUsage: this.getMemoryUsage(),
            gpuMemoryUsage: this.getGPUMemoryUsage(),
        };
    }

    /**
     * Update performance configuration
     * @param newConfig - New performance configuration
     */
    public updateConfig(newConfig: Partial<PerformanceConfig>): void {
        this.config = { ...this.config, ...newConfig };

        if (newConfig.level) {
            this.initializeOptimizations();
        }

        if (newConfig.monitoringInterval) {
            this.startPerformanceMonitoring();
        }
    }

    /**
     * Get current performance configuration
     * @returns Current performance configuration
     */
    public getConfig(): PerformanceConfig {
        return { ...this.config };
    }

    /**
     * Dispose of the performance optimizer
     */
    public dispose(): void {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = undefined;
        }
    }

    /**
     * Initialize performance optimizations based on the configured level
     */
    private initializeOptimizations(): void {
        switch (this.config.level) {
            case PerformanceLevel.HIGH_QUALITY:
                this.applyHighQualitySettings();
                break;
            case PerformanceLevel.BALANCED:
                this.applyBalancedSettings();
                break;
            case PerformanceLevel.PERFORMANCE:
                this.applyPerformanceSettings();
                break;
            case PerformanceLevel.MOBILE:
                this.applyMobileSettings();
                break;
        }
    }

    /**
     * Apply high quality settings
     */
    private applyHighQualitySettings(): void {
        // Enable all quality features
        this.engine.setHardwareScalingLevel(1);
        this.scene.fogMode = 0; // Disable fog for clarity
        this.scene.autoClear = true;
        this.scene.autoClearDepthAndStencil = true;
    }

    /**
     * Apply balanced settings
     */
    private applyBalancedSettings(): void {
        // Balanced quality and performance
        this.engine.setHardwareScalingLevel(1);
        this.scene.fogMode = 0;
        this.scene.autoClear = true;
        this.scene.autoClearDepthAndStencil = true;

        // Reduce shadow quality slightly
        this.scene.shadowsEnabled = true;
    }

    /**
     * Apply performance settings
     */
    private applyPerformanceSettings(): void {
        // Optimize for performance
        this.engine.setHardwareScalingLevel(1.2);
        this.scene.fogMode = 0;
        this.scene.autoClear = true;
        this.scene.autoClearDepthAndStencil = true;

        // Reduce shadow quality
        this.scene.shadowsEnabled = true;

        // Enable frustum culling
        this.scene.frustumCullingEnabled = true;
    }

    /**
     * Apply mobile settings
     */
    private applyMobileSettings(): void {
        // Maximum performance optimizations
        this.engine.setHardwareScalingLevel(1.5);
        this.scene.fogMode = 0;
        this.scene.autoClear = true;
        this.scene.autoClearDepthAndStencil = true;

        // Disable shadows for better performance
        this.scene.shadowsEnabled = false;

        // Enable all culling optimizations
        this.scene.frustumCullingEnabled = true;
        this.scene.occlusionCullingEnabled = true;
    }

    /**
     * Optimize a model for better performance
     * @param model - Model to optimize
     * @param level - Performance level to apply
     */
    public optimizeModel(model: Model, level?: PerformanceLevel): void {
        const targetLevel = level || this.config.level;

        // Get all meshes from the model
        const meshes = model.getMeshes();

        meshes.forEach((mesh) => {
            this.optimizeMesh(mesh, targetLevel);
        });
    }

    /**
     * Optimize a single mesh for performance
     * @param mesh - Mesh to optimize
     * @param level - Performance level to apply
     */
    private optimizeMesh(mesh: AbstractMesh, level: PerformanceLevel): void {
        switch (level) {
            case PerformanceLevel.HIGH_QUALITY:
                // Keep high quality settings
                mesh.freezeWorldMatrix();
                break;

            case PerformanceLevel.BALANCED:
                // Moderate optimizations
                mesh.freezeWorldMatrix();
                mesh.doNotSyncBoundingInfo = true;
                break;

            case PerformanceLevel.PERFORMANCE:
                // Performance optimizations
                mesh.freezeWorldMatrix();
                mesh.doNotSyncBoundingInfo = true;
                mesh.isPickable = false;
                break;

            case PerformanceLevel.MOBILE:
                // Maximum optimizations
                mesh.freezeWorldMatrix();
                mesh.doNotSyncBoundingInfo = true;
                mesh.isPickable = false;
                mesh.alwaysSelectAsActiveMesh = false;
                break;
        }
    }

    /**
     * Start performance monitoring
     */
    private startPerformanceMonitoring(): void {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }

        this.metricsInterval = setInterval(() => {
            const metrics = this.getPerformanceMetrics();
            this.config.onMetricsUpdate?.(metrics);

            // Adaptive quality adjustment
            if (this.config.adaptiveQuality && metrics.averageFps < this.config.targetFps! * 0.8) {
                this.adjustQualityForPerformance(metrics);
            }
        }, this.config.monitoringInterval);
    }

    /**
     * Get current performance metrics
     * @returns Current performance metrics
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        if (deltaTime > 0) {
            const currentFps = 1000 / deltaTime;
            this.fpsHistory.push(currentFps);

            // Keep only last 60 frames for average calculation
            if (this.fpsHistory.length > 60) {
                this.fpsHistory.shift();
            }
        }

        this.lastFrameTime = currentTime;
        this.frameCount++;

        const averageFps =
            this.fpsHistory.length > 0
                ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
                : 0;

        return {
            fps: this.fpsHistory[this.fpsHistory.length - 1] || 0,
            averageFps: Math.round(averageFps * 10) / 10,
            drawCalls: this.engine.drawCalls,
            triangles: this.engine.triangles,
            memoryUsage: this.getMemoryUsage(),
            gpuMemoryUsage: this.getGPUMemoryUsage(),
        };
    }

    /**
     * Get memory usage in MB
     * @returns Memory usage in MB
     */
    private getMemoryUsage(): number {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            return Math.round((memory.usedJSHeapSize / 1024 / 1024) * 10) / 10;
        }
        return 0;
    }

    /**
     * Get GPU memory usage in MB (approximation)
     * @returns GPU memory usage in MB
     */
    private getGPUMemoryUsage(): number {
        // This is an approximation based on texture and geometry data
        const textureMemory = this.scene.textures.length * 2; // Approximate 2MB per texture
        const geometryMemory = this.scene.meshes.length * 0.5; // Approximate 0.5MB per mesh
        return Math.round((textureMemory + geometryMemory) * 10) / 10;
    }

    /**
     * Adjust quality settings based on performance metrics
     * @param metrics - Current performance metrics
     */
    private adjustQualityForPerformance(metrics: PerformanceMetrics): void {
        if (metrics.averageFps < 30) {
            // Switch to mobile settings for very low FPS
            this.config.level = PerformanceLevel.MOBILE;
            this.initializeOptimizations();
        } else if (metrics.averageFps < 45) {
            // Switch to performance settings for low FPS
            this.config.level = PerformanceLevel.PERFORMANCE;
            this.initializeOptimizations();
        } else if (metrics.averageFps < 55) {
            // Switch to balanced settings for moderate FPS
            this.config.level = PerformanceLevel.BALANCED;
            this.initializeOptimizations();
        }
    }

    /**
     * Update performance configuration
     * @param newConfig - New performance configuration
     */
    public updateConfig(newConfig: Partial<PerformanceConfig>): void {
        this.config = { ...this.config, ...newConfig };

        if (newConfig.level) {
            this.initializeOptimizations();
        }

        if (newConfig.monitoringInterval) {
            this.startPerformanceMonitoring();
        }
    }

    /**
     * Get current performance configuration
     * @returns Current performance configuration
     */
    public getConfig(): PerformanceConfig {
        return { ...this.config };
    }

    /**
     * Dispose of the performance optimizer
     */
    public dispose(): void {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = undefined;
        }
    }
}

/**
 * Utility function to create a performance optimizer with default settings
 * @param scene - Babylon.js scene instance
 * @param level - Performance level
 * @returns Performance optimizer instance
 */
export function createPerformanceOptimizer(
    scene: Scene,
    level: PerformanceLevel = PerformanceLevel.BALANCED,
): PerformanceOptimizer {
    return new PerformanceOptimizer(scene, { level });
}

/**
 * Utility function to detect device capabilities and suggest optimal performance level
 * @returns Suggested performance level based on device capabilities
 */
export function detectOptimalPerformanceLevel(): PerformanceLevel {
    // Check for mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        return PerformanceLevel.MOBILE;
    }

    // Check for low-end device indicators
    const hardwareConcurrency = navigator.hardwareConcurrency || 1;
    const deviceMemory = (navigator as any).deviceMemory || 4;

    if (hardwareConcurrency <= 2 || deviceMemory <= 2) {
        return PerformanceLevel.PERFORMANCE;
    }

    if (hardwareConcurrency <= 4 || deviceMemory <= 4) {
        return PerformanceLevel.BALANCED;
    }

    return PerformanceLevel.HIGH_QUALITY;
}
