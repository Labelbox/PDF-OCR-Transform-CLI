export enum Unit {
  PERCENT = 'PERCENT',
  POINTS = 'POINTS'
}
export type TextLayerGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type TextLayerToken = {
  id: string;
  content: string;
  geometry: TextLayerGeometry;
};

export type TextLayerGroup = {
  content: string;
  geometry: TextLayerGeometry;
  id: string;
  tokens: TextLayerToken[];
  typography?: { fontSize: number; fontFamily: string };
};

export type TextLayerPage = {
  groups: TextLayerGroup[];
  number: number;
  units: Unit;
  width?: number;
  height?: number;
};

export type TextLayer = TextLayerPage[];