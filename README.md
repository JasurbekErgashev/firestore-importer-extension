# Firestore Importer Extension

<p align="center">
  <img src="icon.png" alt="Firestore Importer Extension Icon" width="150">
</p>

A Firebase Extension that automatically imports data from CSV and JSON files uploaded to Cloud Storage into Firestore collections.

[![Published on Firebase Extensions Marketplace](https://img.shields.io/badge/Published-Firebase%20Extensions%20Marketplace-blue)](https://extensions.dev/extensions/jasurbekergashev/firestore-importer)

## Overview

This extension watches for files uploaded to a specified Cloud Storage folder and automatically imports their contents into a Firestore collection. It supports both CSV and JSON file formats, making it easy to bulk import data into your Firestore database.

### Installation

You can install this extension directly from the Firebase Extensions Marketplace:

[https://extensions.dev/extensions/jasurbekergashev/firestore-importer](https://extensions.dev/extensions/jasurbekergashev/firestore-importer)

## Features

- **Automatic Import**: Files uploaded to a designated folder in Cloud Storage are automatically processed and imported
- **Multiple Format Support**: Handles both CSV and JSON file formats
- **Smart Type Conversion**: Automatically converts string values to appropriate types (numbers, booleans, etc.)
- **Batched Writes**: Uses Firestore batch operations for efficient and reliable imports
- **Streaming Support**: Efficiently processes large files using streaming parsers
