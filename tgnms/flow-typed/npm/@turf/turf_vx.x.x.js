// flow-declare typed signature: a37ab6db80ca6018833817a672baa71b
// flow-declare typed version: <<STUB>>/@turf/turf_v5.x.x

/**
 * @format
 */

declare module '@turf/turf' {
  declare export type GeoGeometryType =
    | 'Point'
    | 'MultiPoint'
    | 'LineString'
    | 'MultiLineString'
    | 'Polygon'
    | 'MultiPolygon'
    | 'GeometryCollection';
  declare export type DistanceUnit =
    | 'miles'
    | 'nauticalmiles'
    | 'inches'
    | 'yards'
    | 'meters'
    | 'metres'
    | 'kilometers'
    | 'centimeters'
    | 'feet';

  declare export type JsonObj = {[string]: *};
  declare export type FeatureId = string | number;
  // single position
  declare export type GeoCoord = [number, number] | [number, number, number];
  // extent in minX, minY, maxX, maxY order
  declare export type BBox = [number, number, number, number];
  declare export type LineStringCoords = Array<GeoCoord>;
  declare export type PolygonCoords = Array<LineStringCoords>;

  declare export type GeoGeometry = {|
    type: GeoGeometryType,
    coordinates: GeoCoord | LineStringCoords | PolygonCoords,
  |};

  declare export type GeoFeature = {|
    type: 'Feature',
    geometry: GeoGeometry,
    properties: JsonObj,
    id?: FeatureId,
  |};

  declare export type GeoFeatureCollection = {|
    type: 'FeatureCollection',
    features: Array<GeoFeature>,
    properties: JsonObj,
  |};

  declare export type GeoJson = GeoFeature | GeoFeatureCollection | GeoGeometry;

  declare export function buffer(
    GeoFeatureCollection | GeoFeature | GeoGeometry,
    number,
    ?{units?: string},
  ): GeoFeature;
  declare export function convex(GeoFeatureCollection): GeoGeometry;
  declare export function featureCollection(
    Array<GeoFeature>,
  ): GeoFeatureCollection;
  declare export function feature(
    GeoGeometry,
    properties?: JsonObj,
    opt?: {id?: string},
  ): GeoFeature;
  declare export function point(
    GeoCoord,
    properties?: JsonObj,
    ?{bbox?: ?Array<GeoCoord>, id?: string | number},
  ): GeoFeature;
  declare export function lineString(
    Array<GeoCoord>,
    properties?: JsonObj,
    ?{bbox?: ?Array<GeoCoord>, id?: string | number},
  ): GeoFeature;
  declare export function polygon(
    coords: PolygonCoords,
    properties?: Object,
    options?: {bbox?: Array<number>, id: FeatureId},
  ): GeoFeature;
  declare export function circle(
    coords: GeoCoord,
    radius: number, //kilometers by default
    options?: {units?: DistanceUnit, id?: FeatureId},
  ): GeoFeature;
  declare export function transformRotate(
    GeoFeature,
    number,
    ?{mutate?: boolean, pivot?: 'centroid' | GeoCoord},
  ): GeoFeature;
  declare export function transformTranslate(
    GeoFeature,
    number,
    number,
    ?{mutate?: boolean, units?: DistanceUnit, zTranslation?: number},
  ): GeoFeature;
  declare export function bbox(GeoJson): BBox;
  // create a rectangle polygon from a bbox
  declare export function bboxPolygon(BBox): GeoFeature;
  /**
   * number - bearing in decimal degrees, between -180 and 180 degrees
   * (positive clockwise)
   */
  declare export function bearing(GeoCoord, GeoCoord): number;
  declare export function length(GeoFeature): number; // kilometers
  declare export function area(GeoFeature): number; // meters
  declare export function convertArea(
    area: number,
    originalUnit: string,
    finalUnit: string,
  ): number;
  declare export function convertLength(
    length: number,
    originalUnit: string,
    finalUnit: string,
  ): number;

  declare export function getType(
    GeoJson | GeoFeature | GeoGeometry,
  ): GeoGeometryType;
  declare export function getGeom(GeoFeature | GeoGeometry): ?GeoGeometry;
  // get the coord of a single point
  declare export function getCoord(GeoFeature | GeoGeometry): GeoCoord;
  // this can also return a LineString. i couldn't figure out how to flowtype
  declare export function getCoords(
    GeoFeature | GeoGeometry | Array<GeoFeature | GeoGeometry>,
  ): PolygonCoords;

  declare export function intersect(GeoFeature, GeoFeature): ?Feature;
  declare export function midpoint(GeoFeature, GeoFeature): Feature;
  declare export function distance(GeoCoord, GeoCoord): number;
}
