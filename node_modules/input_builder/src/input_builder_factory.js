import { InputBuilderError } from './error.js';
import fallback from './builders/fallback.js';
import createInputBuilder from './input_builder.js';
import required from './builders/required.js';
import boolean from './builders/boolean.js';
import json from './builders/json.js';
import options from './builders/options.js';
import ifPresent from './builders/ifPresent.js';
import attempt from './builders/try.js';

export default function() {
    const registry = [];
    let inputCallback = null;

    function register(name, callback) {
        registry.push({ name, callback });
        
        return this;
    }

    function defaults() {
        return this
            .register('fallback', fallback)
            .register('required', required)
            .register('boolean', boolean)
            .register('json', json)
            .register('options', options)
            .register('ifPresent', ifPresent)
            .register('try', attempt);
    }

    function getInputWith(callback) {
        inputCallback = callback;

        return this;
    }

    function makeFromCallback(name, callback) {
        const instance = createInputBuilder(name, callback);

        for(const registration of registry) {
            instance[registration.name] = (...args) => registration.callback(instance, this, ...args);
        }

        return instance;
    }

    function make(name) {
        if(!inputCallback) {
            throw new InputBuilderError('A getInputWith callback is required in order to instantiate an input builder!');
        }

        return this.makeFromCallback(name, inputCallback);
    }

    return { register, defaults, getInputWith, makeFromCallback, make };
}