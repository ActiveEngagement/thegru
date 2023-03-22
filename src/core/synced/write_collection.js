import tmp from 'tmp';
import fs from 'fs';
import path from 'path';
import { readFile, writeFile } from '../fs_util';
import yaml from 'js-yaml';
import archiver from 'archiver';

function createDir(dirPath) {
    fs.mkdirSync(dirPath);

    return dirPath;
}

function capitalizeKeys(object) {
    if(Array.isArray(object)) {
        return object.map(capitalizeKeys);
    }

    if(typeof object !== 'object' || !object) {
        return object;
    }

    let capitalizedEntries = Object.entries(object)
        .map(([key, value]) => {
            if(key ===  'id') {
                key = 'ID';
            }
            else {
                key = key[0].toUpperCase() + key.slice(1);
            }

            return [key, capitalizeKeys(value)];
        });
    return Object.fromEntries(capitalizedEntries);
}

async function zipDirectory(sourceDir, outPath) {
    const archive = archiver('zip', { zlib: { level: 9 }});
    const stream = fs.createWriteStream(outPath);

    return new Promise((resolve, reject) => {
        archive
            .directory(sourceDir, false)
            .on('error', err => reject(err))
            .pipe(stream);

        stream.on('close', () => resolve());
        archive.finalize();
    });
}


export default async function(collection, options) {
    const { logger } = options;

    const { name: dir } = tmp.dirSync();
    const cardsDir = createDir(path.join(dir, 'cards'));
    const boardsDir = createDir(path.join(dir, 'boards'));
    const boardGroupsDir = createDir(path.join(dir, 'board-groups'));
    const resourcesDir = createDir(path.join(dir, 'resources'));

    const collectionYaml = yaml.dump({ Tags: collection.tags });
    await writeFile(path.join(dir, 'collection.yaml'), collectionYaml);

    for(const card of collection.cards) {
        await writeFile(path.join(cardsDir, card.name + '.md'), card.content);
        await writeFile(path.join(cardsDir, card.name + '.yaml'), yaml.dump({
            ...capitalizeKeys(card.info),
            Tags: [],
            ExternalId: card.name
        }));
    }

    for(const board of collection.boards) {
        await writeFile(path.join(boardsDir, board.name + '.yaml'), yaml.dump({
            ...capitalizeKeys(board.info),
            Items: capitalizeKeys(board.items),
            ExternalId: board.name
        }));
    }

    for(const group of collection.boardGroups) {
        await writeFile(path.join(boardGroupsDir, group.name + '.yaml'), yaml.dump({
            ...capitalizeKeys(group.info),
            Boards: capitalizeKeys(group.boards),
            ExternalId: group.name
        }));
    }

    for(const file of collection.resources) {
        const dir = path.dirname(file);
        await fs.promises.mkdir(path.join(resourcesDir, dir), { recursive: true});
        await fs.promises.copyFile(file, path.join(resourcesDir, file));
    }

    const zipFile = tmp.tmpNameSync({ postfix: '.zip' });
    await zipDirectory(dir, zipFile);

    return zipFile;
}