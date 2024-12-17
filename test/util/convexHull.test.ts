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

import { ConvexHull } from '../../src/util/convexHull';

describe('ConvexHull', () => {
    const allVertices = [
        new Vector3(0, 0, 0),
        new Vector3(1, 0, 0),
        new Vector3(1, 1, 0),
        new Vector3(0, 0, 1),
        new Vector3(0.15, 0.15, 0.1),
        new Vector3(0.5, 0.5, 0.5),
    ];

    test('getFaces', async () => {
        const faces = ConvexHull.getFaces(allVertices);

        expect(faces.length).toEqual(4);
    });

    test('getVertexIndices', async () => {
        const vertexIndices = ConvexHull.getVertexIndices(allVertices);

        expect(vertexIndices.length).toEqual(4);
        for (let i = 0; i < 4; i++) {
            expect(vertexIndices.includes(i)).toBeTruthy();
        }
    });

    test('getVertices', async () => {
        const vertices = ConvexHull.getVertices(allVertices);

        expect(vertices.length).toEqual(4);
        for (let i = 0; i < 4; i++) {
            expect(allVertices.includes(vertices[i])).toBeTruthy();
        }
    });
});
