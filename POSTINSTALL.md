# Using the Firestore Importer Extension

You've successfully installed the Firestore Importer extension! Now you can easily import data from JSON and CSV files into your Firestore database.

## Getting Started

To use this extension, follow these simple steps:

1. **Upload your data files** to the `${param:IMPORT_FOLDER}` folder in your default Cloud Storage bucket.

   - You can do this through the Firebase Console, Firebase Storage SDK, or the Google Cloud Console.
   - Make sure your files have either a `.json` or `.csv` extension.

2. **Wait for processing** - The extension will automatically detect the new file and begin processing it.

   - The processing time depends on the size of your file and the complexity of the data.
   - You can monitor the progress in the Firebase Functions logs.

3. **Check your Firestore collection** - Once processing is complete, your data will be available in the `${param:TARGET_COLLECTION}` collection in Firestore.

## File Format Requirements

### JSON Files

The extension supports two JSON formats:

1. **JSON Array**: An array of objects, where each object becomes a document in Firestore.

   ```json
   [
     { "name": "John", "age": 30 },
     { "name": "Jane", "age": 25 }
   ]
   ```

2. **JSON Object**: An object with keys, where each key-value pair is processed based on its structure:
   - If the value is an object, it becomes a document with the key as its ID.
   - If the value is a primitive, it becomes a document with a field named after the key.
   ```json
   {
     "user1": { "name": "John", "age": 30 },
     "user2": { "name": "Jane", "age": 25 }
   }
   ```

### CSV Files

CSV files should have:

- The first row containing column headers (these will be used as field names in Firestore)
- Properly formatted CSV data in subsequent rows
- Each row will become a document in Firestore

Example:

```
name,age,email
John,30,john@example.com
Jane,25,jane@example.com
```

## Data Type Handling

The extension automatically converts values to appropriate Firestore data types:

- **CSV Files**:

  - Numbers are converted to integers or floats
  - "true" and "false" strings are converted to booleans
  - Empty strings are converted to null

- **JSON Files**:
  - Data types are preserved as specified in the JSON

## Monitoring & Troubleshooting

You can monitor the extension's activity in the Firebase Console:

1. Go to the Firebase Console and select your project
2. Navigate to **Functions** in the left sidebar
3. Find your function named `ext-${param:EXT_INSTANCE_ID}-importToFirestore` in the list
4. Click on "View logs" from the menu to see the function logs

Common issues:

- **File not processed**: Make sure the file is in the correct folder and has a supported extension (.json or .csv)
- **Import errors**: Check the function logs for specific error messages
- **Partial imports**: If an error occurs during processing, the extension will roll back the entire operation

## Need Help?

If you have any questions or encounter issues, please:

1. Check the [Firebase Extensions documentation](https://firebase.google.com/docs/extensions)
2. Visit the [Firebase Community](https://firebase.google.com/community) for support
3. File an issue on our [GitHub repository](https://github.com/JasurbekErgashev/firestore-importer-extension)

Happy importing!
