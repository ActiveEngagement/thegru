import simpleGit from 'simple-git';

/**
 * Uses simple-git to commit the given cards file with the given email, name, and message.
 */

export default async function(options) {
    const { path, email, name, message } = options;

    await simpleGit()
        .addConfig('user.email', email)
        .addConfig('user.name', name)
        .addConfig('author.email', email)
        .addConfig('author.name', name)
        .addConfig('committer.email', email)
        .addConfig('committer.name', name)
        .add(path)
        .commit(message)
        .push();
}