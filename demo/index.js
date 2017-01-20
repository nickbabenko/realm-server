let Server = require('../index'),
    Realm = require('realm');

// Define your models and their properties
let Car = {
    name: 'Car',
    primaryKey: 'id',
    properties: {
        id: 'int',
        make:  'string',
        model: 'string',
        miles: 'int',
    }
};
let Person = {
    name: 'Person',
    primaryKey: 'id',
    properties: {
        id: 'int',
        name:    {type: 'string'},
        cars:    {type: 'list', objectType: 'Car'},
        picture: {type: 'data', optional: true}, // optional property
    }
};

let realm = new Realm({
    schema: [Car, Person]
});

let server = new Server(realm);