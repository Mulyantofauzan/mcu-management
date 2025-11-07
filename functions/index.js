/**
 * Firebase Cloud Functions Entry Point
 * Exports all Cloud Functions for deployment
 */

const { uploadToGoogleDrive } = require('./uploadToGoogleDrive');

module.exports = {
  uploadToGoogleDrive,
};
