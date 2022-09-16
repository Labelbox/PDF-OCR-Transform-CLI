#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateTextractTextLayer } from './convert-textract';
import fs from 'fs';

export type Config = {
  s3Bucket: string;
};

const configBuffer = fs.readFileSync('config.json');
const config = JSON.parse(configBuffer.toString()) as Config;
console.log('Config: ', JSON.stringify(config))
export const getConfig = () => ({ ...config });

yargs(hideBin(process.argv))
  .command(
    'convert',
    'Convert an OCR JSON file into the Labelbox text layer format',
    (yargs) => (
      yargs
        .option('inputFolder', {
          type: 'string',
          describe: 'The filepath to the folder containing the pdfs you want to generate text layers for.',
          demandOption: true
        })
        .option('format', {
          type: 'string',
          choices: ['textract'],
          default: 'textract'
        })
        .option('outputFolder', {
          type: 'string',
          description: 'The output folder filepath. Defaults to "output/"',
          default: 'output'
        })
        .option('concurrency', {
          type: 'number',
          description: 'Number of pdfs to process at the same time. CAUTION: Setting this number too high can cause request limits to be reached',
          default: 10
        })
    ),
    ({ inputFolder, format, outputFolder, concurrency }) => {
      if (format === 'textract') {
        generateTextractTextLayer(inputFolder, outputFolder, concurrency);
      }
    }
  )
  .strictCommands()
  .parse();