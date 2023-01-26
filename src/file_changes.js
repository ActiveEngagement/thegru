import exec from '@actions/exec';

export default async function getChangedFiles(github) {
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