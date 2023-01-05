import yaml from 'js-yaml';
import { readFile, writeFile } from './fs_util';

export default async function(id, options = {}) {
    const { workflowFile, jobName } = options;

    const workflow = yaml.load(await readFile(workflowFile));
    const steps = workflow.jobs[jobName].steps;
    const step = steps.find(step => step.uses.startsWith('ActiveEngagement/theguru'));
    step.with ||= {};
    step.with.card_id = id;
    await writeFile(workflowFile, yaml.dump(workflow));
}