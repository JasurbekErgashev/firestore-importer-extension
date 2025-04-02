# Firestore Importer

**Automatically import JSON and CSV files from Cloud Storage into Firestore collections.**

This extension allows you to easily import data from JSON and CSV files into Firestore. Simply upload your files to a designated folder in your Cloud Storage bucket, and the extension will automatically process them and import the data into your specified Firestore collection.

## How it works

1. You upload JSON or CSV files to a specified folder in your default Cloud Storage bucket.
2. The extension detects the new file and processes it based on its format:
   - **JSON files**: The extension parses the JSON and imports it into Firestore.
   - **CSV files**: The extension converts the CSV to JSON (using the first row as field names) and imports it into Firestore.
3. The data is written to your specified Firestore collection using efficient batch operations.

## Use cases

- Migrate data from legacy systems to Firestore
- Bulk import user data
- Import product catalogs
- Load test data for development and testing
- Periodically update Firestore collections from external data sources

## Additional setup

Before installing this extension, make sure you have:

1. [Set up a Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) in your Firebase project.
2. [Set up Cloud Storage](https://firebase.google.com/docs/storage) in your Firebase project.

## Billing

This extension uses the following Firebase services which may have associated charges:

- Cloud Firestore
- Cloud Storage
- Cloud Functions

This extension also uses the following Firebase resources:

- Cloud Storage Triggers

## Best practices

- For large datasets, consider splitting your data into multiple smaller files to improve processing efficiency.
- Make sure your JSON or CSV files are well-formed and contain valid data.
- For CSV files, ensure the first row contains the field names you want to use in Firestore.
- For JSON files, structure your data in a way that matches how you want it stored in Firestore.
