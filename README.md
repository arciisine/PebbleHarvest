# PebbleHarvest

This is a Pebble/Pebble Time watch app that allows for the creation of timers and toggling of timers.

The javascript portion of the application is written in TypeScript, and the compilation process requires node.js(>=5.0.0) and npm to be installed on your computer.

To setup (on OSX):
  - brew install node
  - brew install pebble-sdk

Common setup:
  - npm install

To build the app you can run the following:
  - npm run-script build-all

Then install the app in your emulator or phone following the standard Pebble SDK instructions

The app's main entry points are 'src/app.c' and 'src/ts/app.ts'
