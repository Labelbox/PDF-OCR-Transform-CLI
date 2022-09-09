export type Job = {
  Blocks: Block[]
}

export type Relationship = {
  Ids: string[];
}

export type Block = {
  Id: string;
  BlockType: BlockType;
  Page: number;
  Geometry: Geometry;
  Relationships?: Relationship[];
  Text?: string;
}

export type Geometry = {
  Polygon: Polygon
}

export type XY = { X: number, Y: number };

export type Polygon = XY[];

export type BlockType = 'PAGE' | 'LINE' | 'WORD';