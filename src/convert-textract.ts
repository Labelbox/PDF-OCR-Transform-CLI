import { match } from 'ts-pattern';
import { TextLayerGeometry, TextLayerGroup, TextLayerPage, TextLayerToken, Unit } from './types/text-layer-types';
import { Block, Job, Polygon } from './types/textract-types';

/**
 * Converts Textract OCR output to Labelbox's text layer JSON format
 */
export const convertTextract = (rawTextractOutput: string) => {
  // Textract performs ocr on a document within tasks called "jobs"
  // There may be multiple jobs in the Textract OCR output.
  // Each job in the array contains the geometry of text found in the pdf during the execution of the job
  const jobs = JSON.parse(rawTextractOutput) as Job[];

  // Blocks represent an abstract grouping of text in the document.
  // Blocks can have type "PAGE", "LINE", or "WORD"
  const blocks = jobs.reduce((blocks, job) => {
    return [...blocks, ...job.Blocks]
  }, [] as Block[])

  const pageMap = new Map<string, Block>();
  const lineMap = new Map<string, Block>();
  const wordMap = new Map<string, Block>();

  // Blocks with type "PAGE" and "LINE" are special. They contain a property called "Relationships".
  // Relationships contain the ids of the node's child blocks in the document. 
  // Pages contain Lines. Lines contain Words. Words are the base token unit.
  // Words contain no relationships (child blocks). They can be thought of as a leaf node in the document tree.
  // Iterate over all the blocks and sort them into normalized collections for easy lookup.
  blocks.forEach(block => {
    match(block.BlockType)
      .with('PAGE', () => {
        pageMap.set(block.Id, block);
      })
      .with('LINE', () => {
        lineMap.set(block.Id, block);
      })
      .with('WORD', () => {
        wordMap.set(block.Id, block)
      })
      .otherwise(() => { })
  });

  // Iterate over the page map to construct the text layer json output
  return Array.from(pageMap.values()).map(page => {
    // Ids of all lines (groups) on the page
    const lineIds = page?.Relationships?.reduce((lineIds, relationship) => {
      return [...lineIds, ...relationship.Ids]
    }, [] as string[]) || [];

    return {
      number: page.Page,
      units: Unit.PERCENT,
      // Transform line blocks to groups
      groups: lineIds.map(lineId => {
        const lineBlock = lineMap.get(lineId)!
        if (!lineBlock) {
          throw Error(`Failed to find line block with id ${lineId}`)
        }

        // Ids of all word blocks contained in the line (group).
        const wordIds = lineBlock.Relationships?.reduce((wordIds, relationship) => {
          return [...wordIds, ...relationship.Ids]
        }, [] as string[]) || []

        return {
          id: lineBlock.Id,
          geometry: convertPolygonToGeometry(lineBlock.Geometry.Polygon),
          content: lineBlock.Text,
          // Transform word blocks to tokens
          tokens: wordIds.map(wordId => {
            const wordBlock = wordMap.get(wordId);
            if (!wordBlock) {
              throw Error(`Failed to find word block with id ${wordId}`)
            }

            return {
              id: wordBlock.Id,
              content: wordBlock.Text,
              geometry: convertPolygonToGeometry(wordBlock.Geometry.Polygon),
            } as TextLayerToken;
          })
        } as TextLayerGroup;
      })
    } as TextLayerPage;
  });
}

const convertPolygonToGeometry = (polygon: Polygon) => (
  {
    top: polygon[0].Y,
    left: polygon[0].X,
    width: polygon[2].X - polygon[0].X,
    height: polygon[2].Y - polygon[0].Y
  } as TextLayerGeometry
)