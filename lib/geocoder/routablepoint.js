'use strict';
const nearestPointOnLine = require('@turf/nearest-point-on-line').default;

module.exports = routablePoints;


/**
 * Takes a point of origin and a feature, and returns the nearest point
 * on the associated LineString
 *
 * @param {!Object|!Array} point Point geojson geometry object or coordinate array
 * @param {!Object} feature Address feature with GeometryCollection of MultiPoint and LineStrings
 * @return {Array|null} Lon,lat coordinate array of the routable point
 */
function routablePoints(point, feature, routable_override) {
    const defaultResult = {
        points: null
    };

    if (!point || !Object.keys(point).length || !feature || !Object.keys(feature).length) {
        return null;
    }

    // Skip if routable_points is not already set
    // Override all if there is a default routable point in provided routable_override
    // Otherwise calculate default routable point first, then concat all alternative routable points
    if (routable_override) {
        const default_routable_override = routable_override.find((o) => o.name === 'default_routable_point' | !o.name);
        if (default_routable_override) {
            default_routable_override.name = 'default_routable_point';
            return {
                points: [default_routable_override, ...routable_override.filter((o) => o.name !== 'default_routable_point')]
            };
        }
    }

    // If the point is interpolated, return the existing point coordinates
    if (point.interpolated) {
        return {
            points: [{ name: 'default_routable_point', coordinates: point.coordinates }]
        };
    }

    // If no routable_override, or no default_routable_point in routable_override
    // Get LineString from feature geometry
    const featureLineString = _findLineString(feature);


    const nearestPoint = featureLineString ? nearestPointOnLine(featureLineString, point) : null;

    if (!nearestPoint) {
        return defaultResult;
    }

    // Round coordinates to 6 decimal places
    const e6 = Math.pow(10, 6);
    const nearestPointCoords = nearestPoint.geometry.coordinates.map(
        (coord) => Math.round(coord * e6) / e6
    );

    return {
        points: [{ name: 'default_routable_point', coordinates: nearestPointCoords }].concat(routable_override || [])
    };
}


/**
 * Finds the LineString geometry in a GeoJSON feature, if it exists
 *
 * @param {Object} feature GeoJSON feature
 * @return {Object} geometry GeoJSON geometry object
 */
function _findLineString(feature) {
    const { geometry } = feature;

    if (!geometry) {
        return null;
    }

    if (geometry.geometries) {
        const results = geometry.geometries.find(
            (geom) => geom.type === 'MultiLineString' || geom.type === 'LineString'
        );
        return results;
    }

    if (geometry.type === 'MultiLineString' || geometry.type === 'LineString') {
        return geometry;
    }
}

