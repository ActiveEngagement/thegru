export default function(builder, factory, callback) {
    return builder.use((value, name) => {
        if(value !== null) {
            const builder = factory.makeFromCallback(name, () => value);
            callback(builder);

            const result = builder.run();
            if(result.valid) {
                return result;
            }
        }
    });
}