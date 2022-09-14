#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateTextractTextLayer } from './convert-textract';

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
    ),
    ({ inputFolder, format, outputFolder }) => {
      if (format === 'textract') {
        generateTextractTextLayer(inputFolder, outputFolder)
      }


      // fs.readdir(inputFolder, (error, filenames) => {
      //   if (error) {
      //     throw error;
      //   }

      //   // Gather all pdfs in the input folder
      //   const pdfFilenames = filenames.filter(filename => {
      //     const filenameTokens = filename.split('.');
      //     return filenameTokens[filenameTokens.length - 1] === 'pdf';
      //   });

      //   pdfFilenames.forEach(pdfFilename => {
      //     // Upload all the pdfs in the input folder to s3
      //     exec(`aws s3 cp ${inputFolder}/${pdfFilename}`, (err, stdout) => {

      //     });
      //   })



      //   pdfFilenames.forEach(pdfFilename => {
      //     fs.readFile(`${inputFolder}/${pdfFilename}`, (err, data) => {
      //       const textLayer = match({ err, data, format })
      //         .with({ err: P.not(P.nullish) }, ({ err }) => { throw err })
      //         .with({ data: P.not(P.nullish), format: 'textract' }, () => convertTextract(data.toString()))
      //         .otherwise(() => console.error('Could not parse input file'));
      //     })
      //   });
      // })
      // outputFolder = outputFolder || `${"pdf-fo".split('.')[0]}-lb-text-layer.json`

      // fs.readFile(filepath, (err, data) => {
      //   const textLayer = match({ err, data, format })
      //     .with({ err: P.not(P.nullish) }, ({ err }) => console.error(err))
      //     .with({ data: P.not(P.nullish), format: 'textract' }, () => convertTextract(data.toString()))
      //     .otherwise(() => console.error('Could not parse input file'));

      //   if (textLayer) {
      //     fs.writeFileSync(outPath, JSON.stringify(textLayer));
      //   }
      //   else {
      //     console.error('Unable to generate text layer output json');
      //   }
      // });
    }
  )
  .strictCommands()
  .parse();