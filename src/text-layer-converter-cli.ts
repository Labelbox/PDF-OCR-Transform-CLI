#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import { convertTextract } from './convert-textract';
import { match, P } from 'ts-pattern';

yargs(hideBin(process.argv))
  .command(
    'convert',
    'Convert an OCR JSON file into the Labelbox text layer format',
    (yargs) => (
      yargs
        .option('filepath', {
          type: 'string',
          describe: 'The filepath to the JSON file containing the OCR input',
          demandOption: true
        })
        .option('format', {
          type: 'string',
          choices: ['textract'],
          default: 'textract'
        })
        .option('output-filepath', {
          type: 'string',
          description: 'The output filepath. Defaults to "<filepath>-text-layer.json"'
        })
    ),
    ({ filepath, format, outputFilepath }) => {
      const outPath = outputFilepath || `${filepath.split('.')[0]}-text-layer.json`

      fs.readFile(filepath, (err, data) => {
        const textLayer = match({ err, data, format })
          .with({ err: P.not(P.nullish) }, ({ err }) => console.error(err))
          .with({ data: P.not(P.nullish), format: 'textract' }, () => convertTextract(data.toString()))
          .otherwise(() => console.error('Could not parse input file'));

        if (textLayer) {
          fs.writeFileSync(outPath, JSON.stringify(textLayer));
        }
        else {
          console.error('Unable to generate text layer output json');
        }
      });
    }
  )
  .strictCommands()
  .parse();