# Firestore Import Extension

A Firebase Extension that automatically imports data from CSV and JSON files uploaded to Cloud Storage into Firestore collections.

## Overview

This extension watches for files uploaded to a specified Cloud Storage folder and automatically imports their contents into a Firestore collection. It supports both CSV and JSON file formats, making it easy to bulk import data into your Firestore database.

## Features

- **Automatic Import**: Files uploaded to a designated folder in Cloud Storage are automatically processed and imported
- **Multiple Format Support**: Handles both CSV and JSON file formats
- **Smart Type Conversion**: Automatically converts string values to appropriate types (numbers, booleans, etc.)
- **Batched Writes**: Uses Firestore batch operations for efficient and reliable imports
- **Streaming Support**: Efficiently processes large files using streaming parsers
