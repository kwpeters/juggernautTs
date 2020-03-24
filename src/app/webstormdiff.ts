//
// This script launches "webstorm64.exe diff" with the appropriate arguments.
// For some reason, on Windows, executing the "diff" command requires the user
// to be in WebStorm's bin folder.
//

import {Directory} from "../depot/directory";
import {File} from "../depot/file";
import {spawn} from "../depot/spawn";

const webstormBin = new Directory("C:\\", "Program Files", "JetBrains", "WebStorm 2019.3.4", "bin");
const webstormExec = new File(webstormBin, "webstorm64.exe");

if (!webstormBin.existsSync()) {
    console.error(`WebStorm bin directory does not exist: ${webstormBin.toString()}`);
    process.exit(-1);
}

if (!webstormExec.existsSync()) {
    console.error(`WebStorm executable does not exist: ${webstormExec.toString()}`);
    process.exit(-1);
}

if (!process.argv[2] || !process.argv[3]) {
    console.error("Two arguments are required.");
    process.exit(-1);
}

//
// Setup the left side.
//
const leftPath = process.argv[2];
let left: File | Directory;

const leftDir = new Directory(leftPath);
const leftFile = new File(leftPath);

if (leftDir.existsSync()) {
    left = leftDir;
}
else if (leftFile.existsSync()) {
    left = leftFile;
}
else {
    console.error(`${leftPath} does not exist.`);
    process.exit(-1);
}

//
// Setup the right side.
//
const rightPath = process.argv[3];
let right: File | Directory;

const rightDir = new Directory(rightPath);
const rightFile = new File(rightPath);

if (rightDir.existsSync()) {
    right = rightDir;
}
else if (rightFile.existsSync()) {
    right = rightFile;
}
else {
    console.error(`${rightPath} does not exist.`);
    process.exit(-1);
}

left = left.absolute();
right = right.absolute();

spawn(
    webstormExec.fileName,
    [
        "diff",
        left.toString(),
        right.toString()
    ],
    {
        cwd: webstormBin.toString()
    }
);
