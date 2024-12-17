/**
 * Declaration file for [convex-hull](https://github.com/mikolalysenko/convex-hull)
 */
declare module 'convex-hull' {
    /**
     * Computes the convex hull of points
     * @param points - an array of points encoded as `d` length arrays
     * @returns a polytope encoding the convex hull of the point set
     */
    export default function convexHull(points: Array<Array<number>>): Array<Array<number>>;
}
