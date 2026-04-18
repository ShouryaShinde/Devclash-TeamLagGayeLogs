import { exec } from "child_process";

export function convertToAudio(input, output) {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -i ${input} -vn ${output}`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}