import { exec } from "child_process";
import fs from "fs";
import { concatMap, EMPTY, mergeMap, of, Subject } from "rxjs";
import { match } from "ts-pattern";
import { Config } from "./text-layer-converter-cli";
import {
  TextLayerGeometry,
  TextLayerGroup,
  TextLayerPage,
  TextLayerToken,
  Unit,
} from "./types/text-layer-types";
import { Block, Job, Polygon } from "./types/textract-types";

export const generateTextractTextLayer = (
  inputFolder: string,
  outputFolder: string,
  concurrency: number,
  config: Config
) => {
  const startTime = Date.now();

  fs.readdir(inputFolder, (error, filenames) => {
    if (error) {
      throw error;
    }

    // Gather all pdf filenames in the input folder
    const pdfFilenames = filenames.filter((filename) => {
      const filenameTokens = filename.split(".");
      return filenameTokens[filenameTokens.length - 1] === "pdf";
    });

    // Partition the filenames into separate arrays
    // This allows for concurrency when processing the pdfs
    const partitions: Array<Array<string>> = [];
    for (let c = 0; c < concurrency; c++) {
      partitions[c] = [];
    }

    pdfFilenames.forEach((filename, index) => {
      partitions[index % partitions.length].push(filename);
    });

    const failedPdfs: Map<string, any> = new Map();

    const outputFiles = fs.readdirSync(outputFolder);

    let i = 0;
    of(...partitions)
      .pipe(
        // Concurrently process each partition of filenames
        mergeMap((filenamesPartition) => {
          return of(...filenamesPartition).pipe(
            // Sequentially process each pdf in each partition to avoid request rate limits
            concatMap((pdfFilename) => {
              i++;

              // Text layer output for the pdf already exists in the output folder, skip.
              const textLayerFilename = generateTextLayerFilename(pdfFilename);
              if (outputFiles.includes(textLayerFilename)) {
                console.log(
                  `*** Output for ${pdfFilename} already exists. Skipping. ***`
                );
                return EMPTY;
              }

              const finished$ = new Subject<void>();
              const { bucketName } = config;

              console.log(
                `=-=-=-=-=-=-=-=-= ${i}/${pdfFilenames.length} =-=-=-=-=-=-=-=-=`
              );
              console.log(`Uploading ${pdfFilename} to s3://${bucketName}`);

              try {
                // Upload the pdf to S3 so that it can be processed by Textract
                exec(
                  `aws s3 cp ${inputFolder}/${pdfFilename} s3://${bucketName}`,
                  (error) => {
                    if (error) {
                      throw error;
                    }

                    // The PDF was successfully uploaded to S3
                    // Run Textract OCR on the pdf
                    console.log(`Starting Textract OCR for ${pdfFilename}`);
                    exec(
                      `aws textract start-document-text-detection \
  --document-location '{"S3Object":{"Bucket":"${bucketName}","Name":"${pdfFilename}"}}'`,
                      async (error, stdout) => {
                        if (error) {
                          throw error;
                        }

                        const jobId = JSON.parse(stdout).JobId;

                        // Build the textract output
                        const textractResult = await buildTextractOutput(jobId);

                        // Build the text layer from the textract output and save the result to a file
                        console.log(
                          `Converting Textract output into text layer for ${pdfFilename}`
                        );
                        const textLayer = convertTextract(textractResult);
                        console.log(
                          `Text layer successfully generated for ${pdfFilename}`
                        );
                        fs.writeFileSync(
                          `${outputFolder}/${textLayerFilename}`,
                          JSON.stringify(textLayer)
                        );
                        finished$.complete();
                      }
                    );
                  }
                );
              } catch (exception) {
                console.log(
                  `An error was encountered while processing ${exception}`
                );
                console.error(exception);
                failedPdfs.set(pdfFilename, exception);

                return EMPTY;
              }

              return finished$;
            })
          );
        })
      )
      .subscribe({
        complete: () =>
          console.log(
            `=-=-=-= Job completed in ${
              (Date.now() - startTime) / 1000
            } seconds =-=-=-=`
          ),
      });

    if (failedPdfs.size) {
      console.log(`*** ${failedPdfs.size} failed pdfs ***`);
      console.log(JSON.stringify(Array.from(failedPdfs.entries())));
    }
  });
};

export const buildTextractOutput = async (jobId: string) => {
  const fullTextractOutput: Job[] = [];
  // Get the Textract output by jobId
  let jobResult = await tryFetchJobResult(jobId);

  fullTextractOutput.push(jobResult);

  // If the "NextToken" property is present in the data, this means there are more pages of results
  while (jobResult.NextToken) {
    jobResult = await tryFetchJobResult(jobId, jobResult.NextToken);
    fullTextractOutput.push(jobResult);
  }

  return fullTextractOutput;
};

/**
 * Attempts to fetch the result of the Textract ocr job by id.
 * Depending on the sie of the pdf being analyzed the job sometimes take a while to finish.
 * Exponentially backs of the delay between retires
 *
 * @param jobId The job id
 * @param nextToken The Textract OCR job results are paginated. The Id of the next page of results.
 * @param maxAttempts Number of times to retry fetching the results.
 * @returns The job results
 */
export const tryFetchJobResult = async (
  jobId: string,
  nextToken?: string,
  maxAttempts: number = 15
) =>
  // Depending on the size of the pdf being analyzed the job sometimes takes a while to finish.
  // Exponentially back off the delay between retries to fetch the results.
  await exponentialBackoff(
    () => {
      return new Promise<Job>((resolve, reject) => {
        exec(
          `aws textract get-document-text-detection --job-id ${jobId} ${
            nextToken ? `--next-token ${nextToken}` : ""
          }`,
          { maxBuffer: 1024 * 20000 },
          (error, data) => {
            if (error) {
              reject(error);
            }
            resolve(JSON.parse(data) as Job);
          }
        );
      });
    },
    (result) => result.JobStatus === "SUCCEEDED",
    maxAttempts
  );

/**
 * Retries the provided handler function. Exponentially increases the delay between retries.
 * @param func Handler func
 * @param didSucceed Predicate function that takes in the result of the handler and returns a boolean indicating if
 * the handler function succeeded.
 * @param maxAttempts Throws an error if the handler function doesn't succeed before the max number of attmepts
 * @returns
 */
export const exponentialBackoff = async <T>(
  func: () => Promise<T>,
  didSucceed: (result: T) => boolean,
  maxAttempts = 15
) => {
  let tries = 0;
  let delayMs = 100;

  while (true) {
    tries++;
    delayMs = delayMs * 2;

    if (tries > maxAttempts) {
      throw new Error("Max retries exceeded");
    }

    // Wait for the delay before checking the status of the job.
    await new Promise((resolve) => {
      setTimeout(() => resolve(undefined), delayMs);
    });

    // Execute the handler
    const result = await func();

    // If the handler succeeds, return the result.
    if (didSucceed(result)) {
      return result;
    }
  }
};

/**
 * Converts Textract OCR output to Labelbox's text layer JSON format
 */
const convertTextract = (jobs: Job[]) => {
  // Textract performs ocr on a document within tasks called "jobs"
  // There may be multiple jobs in the Textract OCR output.
  // Each job in the array contains the geometry of text found in the pdf during the execution of the job

  // Blocks represent an abstract grouping of text in the document.
  // Blocks can have type "PAGE", "LINE", or "WORD"
  const blocks = jobs.reduce((blocks, job) => {
    return [...blocks, ...job.Blocks];
  }, [] as Block[]);

  const pageMap = new Map<string, Block>();
  const lineMap = new Map<string, Block>();
  const wordMap = new Map<string, Block>();

  // Blocks with type "PAGE" and "LINE" are special. They contain a property called "Relationships".
  // Relationships contain the ids of the node's child blocks in the document.
  // Pages contain Lines. Lines contain Words. Words are the base token unit.
  // Words contain no relationships (child blocks). They can be thought of as a leaf node in the document tree.
  // Iterate over all the blocks and sort them into normalized collections for easy lookup.
  blocks.forEach((block) => {
    match(block.BlockType)
      .with("PAGE", () => {
        pageMap.set(block.Id, block);
      })
      .with("LINE", () => {
        lineMap.set(block.Id, block);
      })
      .with("WORD", () => {
        wordMap.set(block.Id, block);
      })
      .otherwise(() => {});
  });

  // Iterate over the page map to construct the text layer json output
  return Array.from(pageMap.values()).map((page) => {
    // Ids of all lines (groups) on the page
    const lineIds =
      page?.Relationships?.reduce((lineIds, relationship) => {
        return [...lineIds, ...relationship.Ids];
      }, [] as string[]) || [];

    return {
      number: page.Page,
      units: Unit.PERCENT,
      // Transform line blocks to groups
      groups: lineIds.map((lineId) => {
        const lineBlock = lineMap.get(lineId)!;
        if (!lineBlock) {
          throw Error(`Failed to find line block with id ${lineId}`);
        }

        // Ids of all word blocks contained in the line (group).
        const wordIds =
          lineBlock.Relationships?.reduce((wordIds, relationship) => {
            return [...wordIds, ...relationship.Ids];
          }, [] as string[]) || [];

        return {
          id: lineBlock.Id,
          geometry: convertPolygonToGeometry(lineBlock.Geometry.Polygon),
          content: lineBlock.Text,
          // Transform word blocks to tokens
          tokens: wordIds.map((wordId) => {
            const wordBlock = wordMap.get(wordId);
            if (!wordBlock) {
              throw Error(`Failed to find word block with id ${wordId}`);
            }

            return {
              id: wordBlock.Id,
              content: wordBlock.Text,
              geometry: convertPolygonToGeometry(wordBlock.Geometry.Polygon),
            } as TextLayerToken;
          }),
        } as TextLayerGroup;
      }),
    } as TextLayerPage;
  });
};

const convertPolygonToGeometry = (polygon: Polygon) =>
  ({
    top: polygon[0].Y,
    left: polygon[0].X,
    width: polygon[2].X - polygon[0].X,
    height: polygon[2].Y - polygon[0].Y,
  } as TextLayerGeometry);

/**
 * Takes a pdf filename as input and returns the filename wihtout the file extension
 * Example: "my-document.pdf" => "my-document"
 * @param pdfFilename The pdf filename
 * @returns
 */
const getPdfFilenameWithoutExtension = (pdfFilename: string) => {
  return /.*(?=\.pdf)/g.exec(pdfFilename)?.[0]!;
};

const generateTextLayerFilename = (pdfFilename: string) => {
  return `${getPdfFilenameWithoutExtension(pdfFilename)}-lb-textlayer.json`;
};
