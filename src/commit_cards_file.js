import simpleGit from 'simple-git';

export default async function(options) {
    const { path, email, name, message } = options;
    const git = simpleGit();

    await git
        .addConfig('user.email', email)
        .addConfig('user.name', name)
        .addConfig('author.email', email)
        .addConfig('author.name', name)
        .addConfig('committer.email', email)
        .addConfig('committer.name', name);

    await git.add(path);
    await git.commit(message);
    await git.push();
}