if(!Object.prototype.tap) {
    Object.prototype.tap = function(callback) {
        callback(this);
        return this;
    };
}