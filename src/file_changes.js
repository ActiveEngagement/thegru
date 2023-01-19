import exec from '@actions/exec';
import github from '@actions/github';

export async function getChangedFiles() {
    let output = '';

    await exec.exec(`git diff --name-only ${github.event.before} ${github.event.after}`, {
        listeners: {
            stdout: (data) => {
                output += data.toString();
            }
        }
    });

    return output.split('\n');
}

let changedFiles = getChangedFiles();

export async function didFileChange(filePath) {
    return changedFiles.includes(filePath);
}