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

  declare export type JsonObj = {[string]: *};
  declare export type FeatureId = string | number;
  // single position
  declare export type GeoCoord = [number, number] | [number, number, number];

  declare export type LineString = Array<GeoCoord>;
  declare export type Polygon = Array<LineString>;

  declare export type GeoGeometry = {|
    type: GeoGeometryType,
    coordinates: GeoCoord | LineString | Polygon,
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
    [number, number, ?number],
    ?JsonObj,
    ?{bbox?: ?Array<GeoCoord>, id?: string | number},
  ): GeoFeature;
  declare export function transformRotate(
    GeoJson,
    number,
    ?{mutate?: boolean, pivot?: 'centroid' | GeoCoord},
  ): GeoJson;
  declare export function transformTranslate(
    GeoJson,
    number,
    number,
    ?{mutate?: boolean, units?: 'kilometers', zTranslation?: number},
  ): GeoJson;
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

  declare export function getType(GeoJson | GeoFeature | GeoGeometry): string;
}
