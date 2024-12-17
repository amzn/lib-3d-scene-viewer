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

import { Material } from '@babylonjs/core/Materials/material';
import { MaterialDefines } from '@babylonjs/core/Materials/materialDefines';
import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';

export interface Uniforms {
    ubo: { name: string; size: number; type: string }[];
    fragment: string;
}

const DEPTH_MAT_NAME = 'Depth';
const VD_DARKNESS = 'vdDarkness';
const VD_GAMMA = 'vdGamma';

/**
 * Material with depth plugin
 */
export class DepthPluginMaterial extends MaterialPluginBase {
    private _enabled: boolean;

    private _darkness: number;

    private _gamma: number;

    /**
     * Instantiate a new {@link DepthPluginMaterial}
     * @param material - base Material to wrap
     */
    public constructor(material: Material) {
        super(material, DEPTH_MAT_NAME, 200, { DEPTH_MAT: false });
        this._enabled = false;
        this._darkness = 1.0;
        this._gamma = 1.0;
    }

    /**
     * Gets whether the plugin is enabled
     */
    public get enabled(): boolean {
        return this._enabled;
    }

    /**
     * Gets the darkness value
     */
    public get darkness(): number {
        return this._darkness;
    }

    /**
     * Gets the gamma value
     */
    public get gamma(): number {
        return this._gamma;
    }

    /**
     * Sets whether the plugin is enabled
     */
    public set enabled(enabled: boolean) {
        if (this._enabled === enabled) {
            return;
        }
        this._enabled = enabled;
        // Mark all shader defines as dirty, triggering a recompile of the shaders
        this.markAllDefinesAsDirty();
        // Enable or disable the plugin based on the new state
        this._enable(this._enabled);
    }

    /**
     * Sets the darkness value
     */
    public set darkness(targetDarkness: number) {
        this._darkness = targetDarkness;
    }

    /**
     * Sets the gamma value
     */
    public set gamma(targetGamma: number) {
        this._gamma = targetGamma;
    }

    /**
     * Sets the defines for the next rendering
     * @param defines - the list of "defines" to update.
     */
    public override prepareDefines(defines: MaterialDefines): void {
        defines.DEPTH_MAT = this._enabled;
    }

    /**
     * Gets the uniforms for the shader
     * @returns the description of the uniforms
     */
    public override getUniforms(): Uniforms {
        return {
            ubo: [
                { name: VD_DARKNESS, size: 1, type: 'float' },
                { name: VD_GAMMA, size: 1, type: 'float' },
            ],
            fragment: `
                #ifdef DEPTH_MAT
                    uniform float ${VD_DARKNESS};
                    uniform float ${VD_GAMMA};
                #endif`,
        };
    }

    /**
     * Binds the material data.
     * @param uniformBuffer - defines the Uniform buffer to fill in.
     */
    public override bindForSubMesh(uniformBuffer: UniformBuffer): void {
        if (this._enabled) {
            uniformBuffer.updateFloat(VD_DARKNESS, this.darkness);
            uniformBuffer.updateFloat(VD_GAMMA, this.gamma);
        }
    }

    /**
     * Returns a list of custom shader code fragments to customize the shader.
     * @param shaderType - "vertex" or "fragment"
     * @returns a list of pointName =\> code.
     * Note that `pointName` can also be a regular expression if it starts with a `!`.
     * In that case, the string found by the regular expression (if any) will be
     * replaced by the code provided.
     */
    public override getCustomCode(shaderType: 'vertex' | 'fragment'): { [pointName: string]: string } {
        return shaderType === 'vertex'
            ? {
                  CUSTOM_VERTEX_DEFINITIONS: `
                varying vec2 vdZW;
            `,
                  CUSTOM_VERTEX_MAIN_END: `
                vdZW = gl_Position.zw;
            `,
              }
            : {
                  CUSTOM_FRAGMENT_DEFINITIONS: `
                varying vec2 vdZW;
            `,
                  CUSTOM_FRAGMENT_MAIN_BEGIN: `
                #ifdef DEPTH_MAT
                    float vdDepth = 0.5 * vdZW.x / vdZW.y + 0.5;
                    vdDepth = pow(vdDepth, ${VD_GAMMA});
                    gl_FragColor = vec4(vec3(0.), clamp((1.0 - vdDepth) * vdDarkness, 0., 1.));
                    return;
                #endif
            `,
              };
    }
}
