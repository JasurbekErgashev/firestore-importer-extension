import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as csv from 'csv-parser';
import * as streamToString from 'stream-to-string';
import {parser as streamJsonParser} from 'stream-json';
import {streamArray} from 'stream-json/streamers/StreamArray';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get Firestore instance
const firestore = admin.firestore();

// Get configuration parameters
const IMPORT_FOLDER = process.env.IMPORT_FOLDER || 'imports';
const TARGET_COLLECTION = process.env.TARGET_COLLECTION || '';

/**
 * Cloud Function triggered when a file is uploaded to Cloud Storage
 */
export const importToFirestore = functions.storage
    .onObjectFinalized(async (event) => {
      const filePath = event.data.name;

      // Log the file that triggered the function
      functions.logger.info('Processing file:', filePath);

      // Skip if the file is not in the specified import folder
      if (!filePath || !filePath.startsWith(`${IMPORT_FOLDER}/`)) {
        functions.logger.info(
            `File ${filePath} is not in the specified import folder ` +
        `${IMPORT_FOLDER}. Skipping.`
        );
        return null;
      }

      // Skip if the file was deleted
      if (!event.data.size) {
        functions.logger.info(`File ${filePath} was deleted. Skipping.`);
        return null;
      }

      // Get file extension to determine processing method
      const fileExtension = path.extname(filePath).toLowerCase();

      try {
      // Get file from Cloud Storage
        const bucket = admin.storage().bucket(event.data.bucket);
        const file = bucket.file(filePath);

        // Process the file based on its extension
        if (fileExtension === '.json') {
          await processJsonFile(file);
        } else if (fileExtension === '.csv') {
          await processCsvFile(file);
        } else {
          functions.logger.warn(
              `File ${filePath} has unsupported extension ${fileExtension}. ` +
          'Only .json and .csv files are supported.'
          );
          return null;
        }

        functions.logger.info(
            `Successfully imported ${filePath} to Firestore collection ` +
        `${TARGET_COLLECTION}`
        );
        return null;
      } catch (error) {
        functions.logger.error(`Error processing file ${filePath}:`, error);
        throw error; // Re-throw to ensure the function fails and can be retried
      }
    });

/**
 * Process a JSON file and import its contents to Firestore
 * @param {any} file The Cloud Storage file object
 * @return {Promise<void>} A promise that resolves when processing is complete
 */
async function processJsonFile(file: any): Promise<void> {
  functions.logger.info(`Processing JSON file: ${file.name}`);

  // Create a read stream for the file
  const readStream = file.createReadStream();

  // For small JSON files, we can read the entire content as a string
  // and parse it directly
  try {
    // First, try to parse as a JSON array or object
    const fileContent = await streamToString(readStream);
    const data = JSON.parse(fileContent);

    // Start a Firestore batch
    let batch = firestore.batch();
    let operationCount = 0;
    const MAX_BATCH_SIZE = 500; // Firestore batch limit

    // Process data based on its type
    if (Array.isArray(data)) {
      // Handle JSON array - each item becomes a document
      functions.logger.info(
          `JSON file contains an array with ${data.length} items`
      );

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const docRef = firestore.collection(TARGET_COLLECTION).doc();
        batch.set(docRef, item);

        operationCount++;

        // If we've reached the batch limit, commit and start a new batch
        if (operationCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          functions.logger.info(
              `Committed batch of ${operationCount} documents`
          );
          batch = firestore.batch();
          operationCount = 0;
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      // Handle JSON object - create a single document or multiple documents
      // based on the structure
      functions.logger.info('JSON file contains an object');

      // If the object has multiple top-level keys, each becomes a document
      const keys = Object.keys(data);

      if (keys.length > 0) {
        for (const key of keys) {
          const value = data[key];

          // If the value is an object, use it as a document with the key as ID
          if (typeof value === 'object' && value !== null) {
            const docRef = firestore.collection(TARGET_COLLECTION).doc(key);
            batch.set(docRef, value);
          } else {
            // If the value is a primitive, create a document with a field
            // named after the key
            const docRef = firestore.collection(TARGET_COLLECTION).doc();
            batch.set(docRef, {[key]: value});
          }

          operationCount++;

          // If we've reached the batch limit, commit and start a new batch
          if (operationCount >= MAX_BATCH_SIZE) {
            await batch.commit();
            functions.logger.info(
                `Committed batch of ${operationCount} documents`
            );
            batch = firestore.batch();
            operationCount = 0;
          }
        }
      } else {
        // Empty object, create an empty document
        const docRef = firestore.collection(TARGET_COLLECTION).doc();
        batch.set(docRef, {});
        operationCount++;
      }
    } else {
      throw new Error(`Invalid JSON data: ${typeof data}`);
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      await batch.commit();
      functions.logger.info(
          `Committed final batch of ${operationCount} documents`
      );
    }
  } catch (error) {
    // If parsing as a single JSON object/array fails, try streaming for large
    // files
    functions.logger.info(
        'Could not parse as a single JSON object/array, trying streaming parser'
    );

    // Create a new read stream since the previous one was consumed
    const streamingReadStream = file.createReadStream();

    // Use streaming JSON parser for large files
    return new Promise((resolve, reject) => {
      const pipeline = streamingReadStream
          .pipe(streamJsonParser())
          .pipe(streamArray());

      let batch = firestore.batch();
      let operationCount = 0;
      const MAX_BATCH_SIZE = 500;

      // Process each item in the stream
      pipeline.on('data', async ({value}: {value: Record<string, unknown>}) => {
        try {
          const docRef = firestore.collection(TARGET_COLLECTION).doc();
          batch.set(docRef, value);

          operationCount++;

          // If we've reached the batch limit, commit and start a new batch
          if (operationCount >= MAX_BATCH_SIZE) {
            try {
              await batch.commit();
              functions.logger.info(
                  `Committed batch of ${operationCount} documents`
              );
              batch = firestore.batch();
              operationCount = 0;
            } catch (batchError: unknown) {
              pipeline.destroy(batchError as Error);
            }
          }
        } catch (itemError: unknown) {
          pipeline.destroy(itemError as Error);
        }
      });

      pipeline.on('end', async () => {
        try {
          // Commit any remaining operations
          if (operationCount > 0) {
            await batch.commit();
            functions.logger.info(
                `Committed final batch of ${operationCount} documents`
            );
          }
          resolve();
        } catch (finalError: unknown) {
          reject(finalError);
        }
      });

      pipeline.on('error', (error: Error) => {
        reject(error);
      });
    });
  }
}

/**
 * Process a CSV file and import its contents to Firestore
 * @param {any} file The Cloud Storage file object
 * @return {Promise<void>} A promise that resolves when processing is complete
 */
async function processCsvFile(file: any): Promise<void> {
  functions.logger.info(`Processing CSV file: ${file.name}`);

  return new Promise((resolve, reject) => {
    // Create a read stream for the file
    const readStream = file.createReadStream();

    // Parse CSV data
    const results: Record<string, unknown>[] = [];

    readStream
        .pipe(csv())
        .on('data', (data: Record<string, string>) => {
        // Convert empty strings to null for Firestore compatibility
          const processedData: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(data)) {
          // Skip empty keys
            if (key.trim() === '') continue;

            // Process the value
            if (typeof value === 'string') {
              const trimmedValue = value.trim();

              // Try to convert string values to appropriate types
              if (trimmedValue === '') {
                processedData[key] = null;
              } else if (trimmedValue.toLowerCase() === 'true') {
                processedData[key] = true;
              } else if (trimmedValue.toLowerCase() === 'false') {
                processedData[key] = false;
              } else if (!isNaN(Number(trimmedValue)) && trimmedValue !== '') {
              // Check if it's an integer or float
                if (Number.isInteger(Number(trimmedValue))) {
                  processedData[key] = parseInt(trimmedValue, 10);
                } else {
                  processedData[key] = parseFloat(trimmedValue);
                }
              } else {
                processedData[key] = trimmedValue;
              }
            } else {
              processedData[key] = value;
            }
          }

          results.push(processedData);
        })
        .on('end', async () => {
          try {
            functions.logger.info(
                `CSV parsing complete. Found ${results.length} rows.`
            );

            // Start a Firestore batch
            let batch = firestore.batch();
            let operationCount = 0;
            const MAX_BATCH_SIZE = 500;

            // Process each row
            for (const row of results) {
              const docRef = firestore.collection(TARGET_COLLECTION).doc();
              batch.set(docRef, row);

              operationCount++;

              // If we've reached the batch limit, commit and start a new batch
              if (operationCount >= MAX_BATCH_SIZE) {
                await batch.commit();
                functions.logger.info(
                    `Committed batch of ${operationCount} documents`
                );
                batch = firestore.batch();
                operationCount = 0;
              }
            }

            // Commit any remaining operations
            if (operationCount > 0) {
              await batch.commit();
              functions.logger.info(
                  `Committed final batch of ${operationCount} documents`
              );
            }

            resolve();
          } catch (error: unknown) {
            reject(error);
          }
        })
        .on('error', (error: Error) => {
          reject(error);
        });
  });
}
