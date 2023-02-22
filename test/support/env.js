import fs from 'fs';

export default async function() {
    if(fs.existsSync('test/env')) {
        await fs.promises.rm('test/env', { recursive: true });
    }
    await fs.promises.mkdir('test/env');
}