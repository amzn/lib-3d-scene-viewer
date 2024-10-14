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
import { Material } from '@babylonjs/core/Materials/material';
import { MaterialDefines } from '@babylonjs/core/Materials/materialDefines';
import { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import { Logger } from '@babylonjs/core/Misc/logger';
import { Scene } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';
import { jest } from '@jest/globals';

import { DepthPluginMaterial } from '../../src/material/depthMaterial';

class MockMaterialDefines extends MaterialDefines {
    DEPTH_MAT: boolean = false;
}

Logger.LogLevels = Logger.ErrorLogLevel;

describe('DepthPluginMaterial', () => {
    let engine: Nullable<NullEngine> = null;
    let scene: Nullable<Scene> = null;
    let material: Material;
    let depthPlugin: DepthPluginMaterial;
    let uniformBuffer: UniformBuffer;

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine!);
        material = new Material('testMaterial', scene);
        depthPlugin = new DepthPluginMaterial(material);
        uniformBuffer = new UniformBuffer(engine!);
    });

    afterEach(() => {
        uniformBuffer?.dispose();
        depthPlugin?.dispose();
        material?.dispose();
        scene?.dispose();
        engine?.dispose();
    });

    test('should initialize with default values', () => {
        expect(depthPlugin.darkness).toBe(1.0);
        expect(depthPlugin.gamma).toBe(1.0);
        expect(depthPlugin.enabled).toBe(false);
    });

    test('should enable and disable the plugin', () => {
        depthPlugin.enabled = true;
        expect(depthPlugin.enabled).toBe(true);

        depthPlugin.enabled = false;
        expect(depthPlugin.enabled).toBe(false);
    });

    test('should prepare defines based on the enabled state', () => {
        const defines = new MockMaterialDefines();

        depthPlugin.prepareDefines(defines);
        expect(defines.DEPTH_MAT).toBe(false);

        depthPlugin.enabled = true;
        depthPlugin.prepareDefines(defines);
        expect(defines.DEPTH_MAT).toBe(true);
    });

    test('should return correct uniforms', () => {
        const uniforms = depthPlugin.getUniforms();
        expect(uniforms.ubo).toEqual([
            { name: 'vdDarkness', size: 1, type: 'float' },
            { name: 'vdGamma', size: 1, type: 'float' },
        ]);
        expect(uniforms.fragment).toContain('uniform float vdDarkness;');
        expect(uniforms.fragment).toContain('uniform float vdGamma;');
    });

    test('should update uniform buffer when enabled', () => {
        depthPlugin.enabled = true;
        uniformBuffer.updateFloat = jest.fn();
        depthPlugin.bindForSubMesh(uniformBuffer);
        expect(uniformBuffer.updateFloat).toHaveBeenCalledWith('vdDarkness', 1.0);
        expect(uniformBuffer.updateFloat).toHaveBeenCalledWith('vdGamma', 1.0);
    });

    test('should not update uniform buffer when disabled', () => {
        depthPlugin.enabled = false;
        uniformBuffer.updateFloat = jest.fn();
        depthPlugin.bindForSubMesh(uniformBuffer);
        expect(uniformBuffer.updateFloat).not.toHaveBeenCalled();
    });

    test('should return a non-empty string for vertex shader', () => {
        const customCode = depthPlugin.getCustomCode('vertex');
        expect(typeof customCode.CUSTOM_VERTEX_DEFINITIONS).toBe('string');
        expect(customCode.CUSTOM_VERTEX_DEFINITIONS).not.toBe('');
        expect(typeof customCode.CUSTOM_VERTEX_MAIN_END).toBe('string');
        expect(customCode.CUSTOM_VERTEX_MAIN_END).not.toBe('');
    });

    test('should return a non-empty string for fragment shader', () => {
        const customCode = depthPlugin.getCustomCode('fragment');
        expect(typeof customCode.CUSTOM_FRAGMENT_DEFINITIONS).toBe('string');
        expect(customCode.CUSTOM_FRAGMENT_DEFINITIONS).not.toBe('');
        expect(typeof customCode.CUSTOM_FRAGMENT_MAIN_BEGIN).toBe('string');
        expect(customCode.CUSTOM_FRAGMENT_MAIN_BEGIN).not.toBe('');
    });
});
