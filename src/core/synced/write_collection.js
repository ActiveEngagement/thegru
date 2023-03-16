import tmp from 'tmp';
import fs from 'fs';
import path from 'path';
import { writeFile } from '../fs_util';
import yaml from 'js-yaml';
import archiver from 'archiver';

function createDir(dirPath) {
    fs.mkdirSync(dirPath);

    return dirPath;
}

function capitalizeKeys(object) {
    if(typeof object === 'array') {
        return object.map(o => capitalizeKeys(o));
    }

    if(typeof object !== 'object') {
        return object;
    }

    let capitalizedEntries = Object.entries(object)
        .map(([key, value]) => {
            if(key ===  'id') {
                return [key, 'ID'];
            }
            else {
                return [key[0].toUpperCase() + key.slice(1), capitalizeKeys(value)];
            }
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

    const dir = tmp.dirSync();
    const cardsDir = createDir(path.join(dir, 'cards'));
    const boardsDir = createDir(path.join(dir, 'boards'));
    const boardGroupsDir = createDir(path.join(dir, 'board-groups'));
    const resourcesDir = createDir(path.join(dir, 'resourcesDir'));

    const collectionYaml = yaml.dump({ Tags: collection.tags });
    await writeFile(path.join(dir, 'collection.yaml'), collectionYaml);

    for(const card of collection.cards) {
        await writeFile(path.join(cardsDir, card.name + '.md'), card.content);
        await writeFile(path.join(cardsDir, card.name + '.yaml'), {
            ...capitalizeKeys(card.info),
            ExternalId: card.name
        });
    }

    for(const board of collection.boards) {
        await writeFile(path.join(boardsDir, board.name + '.yaml'), {
            ...capitalizeKeys(board.info),
            Items: capitalizeKeys(board.items),
            ExternalId: board.name
        });
    }

    for(const group of collection.boardGroups) {
        await writeFile(path.join(boardGroupsDir, group.name + '.yaml'), {
            ...capitalizeKeys(group.info),
            Boards: capitalizeKeys(group.boards),
            ExternalId: group.name
        });
    }
    
    for(const file of collection.resources) {
        await fs.promises.copyFile(file, path.join(resourcesDir, file));
    }

    const zipFile = tmp.tmpNameSync({ postfix: '.zip' });
    await zipDirectory(dir, zipFile);

    return zipFile;
}