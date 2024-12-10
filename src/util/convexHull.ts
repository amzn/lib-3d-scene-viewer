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

import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FloatArray } from '@babylonjs/core/types';
// @ts-ignore
import getConvexHull from 'convex-hull';

export class ConvexHull {
    public static getFaces(allVertices: Array<Vector3>): Array<Array<number>> {
        return getConvexHull(
            allVertices.map((vertex) => {
                const array: FloatArray = [];
                vertex.toArray(array);
                return array;
            }),
        );
    }

    public static getVertexIndices(allVertices: Array<Vector3>): Array<number> {
        const faces = ConvexHull.getFaces(allVertices);
        const indices = faces.reduce((acc, val) => {
            acc.push(...val);
            return acc;
        }, []);
        const uniqueIndexSet = new Set(indices);
        return Array.from(uniqueIndexSet.values());
    }

    public static getVertices(allVertices: Array<Vector3>): Array<Vector3> {
        return ConvexHull.getVertexIndices(allVertices).map((index) => allVertices[index]);
    }
}